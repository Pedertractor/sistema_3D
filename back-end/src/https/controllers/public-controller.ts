import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../errors/index.js';
import { removeUpload, storeUpload, type StoredFile } from '../../lib/uploads.js';
import { EmployeeService, type RequesterIdentity } from '../../services/employee-service.js';
import { FilamentService } from '../../services/filament-service.js';
import { ApiPedertractorPart } from '../../integrations/api-pedertractor-part.js';
import { normalizePartNumber, PartService } from '../../services/part-service.js';
import { RequestService } from '../../services/request-service.js';

const unitSchema = z.enum(['PEDERTRACTOR', 'TRACTOR'], { error: 'Escolha a unidade' });

const requesterFields = {
  requesterCardNumber: z
    .string({ error: 'Identifique-se com o número do cartão' })
    .trim()
    .regex(/^\d{1,10}$/, 'Informe o número do cartão'),
  requesterUnit: unitSchema,
  requesterEmail: z.email('E-mail inválido').nullable().optional().or(z.literal('').transform(() => null)),
};

/** Confere o cartão na API corporativa e monta os dados do solicitante gravados na solicitação. */
async function resolveRequester(input: { requesterCardNumber: string; requesterUnit: RequesterIdentity['unit']; requesterEmail?: string | null | undefined }) {
  const identity = await new EmployeeService().identify(input.requesterCardNumber, input.requesterUnit);
  return {
    requesterName: identity.name,
    requesterSector: identity.sectorName,
    requesterCostCenter: identity.costCenter,
    requesterCardNumber: identity.cardNumber,
    requesterUnit: identity.unit,
    requesterEmail: input.requesterEmail ?? null,
  };
}

/** Identificação do solicitante (cartão + unidade): devolve nome, setor e centro de custo. */
export async function identifyRequester(request: FastifyRequest, reply: FastifyReply) {
  const { unit, cardNumber } = z.object({ unit: unitSchema, cardNumber: z.string().trim().min(1) }).parse(request.params);
  return reply.send({ employee: await new EmployeeService().identify(cardNumber, unit) });
}

const productionFields = {
  partNumber: z.string().trim().min(1, 'Informe o partnumber'),
  itemId: z.uuid('Selecione um item'),
  /** Peças (partnumber) a produzir; os itens são calculados com os itens por peça do vínculo. */
  partQuantity: z.number().int().positive('Quantidade deve ser maior que zero').max(100_000),
};

/** Desenho da peça (imagem), servido pelo back-end a partir da API corporativa. */
export async function partDrawing(request: FastifyRequest, reply: FastifyReply) {
  const { partNumber, index } = z
    .object({ partNumber: z.string().trim().min(1), index: z.coerce.number().int().min(0).max(50) })
    .parse(request.params);
  const drawing = await new PartService().drawing(partNumber, index);
  reply.header('Content-Type', drawing.contentType);
  reply.header('Cache-Control', 'public, max-age=3600');
  return reply.send(drawing.body);
}

export async function lookupPart(request: FastifyRequest, reply: FastifyReply) {
  const { partNumber } = z.object({ partNumber: z.string().trim().min(1) }).parse(request.params);
  return reply.send(await new PartService().lookup(partNumber));
}

/** Filamentos ativos para o solicitante escolher na prototipagem (sem dados de estoque). */
export async function publicFilaments(_request: FastifyRequest, reply: FastifyReply) {
  const filaments = await new FilamentService().listAvailability({ activeOnly: true });
  return reply.send({
    filaments: filaments.map((f) => ({
      id: f.id,
      type: f.type,
      colorName: f.colorName,
      colorHex: f.colorHex,
      rigidity: f.rigidity,
      label: f.label,
      rigidityLabel: f.rigidityLabel,
      imageStoredName: f.imageStoredName,
      updatedAt: f.updatedAt,
    })),
  });
}

export async function previewProduction(request: FastifyRequest, reply: FastifyReply) {
  const body = z.object(productionFields).parse(request.body);
  return reply.send(await new RequestService().previewProduction(body));
}

export async function createProduction(request: FastifyRequest, reply: FastifyReply) {
  const { requesterCardNumber, requesterUnit, requesterEmail, ...production } = z
    .object({ ...productionFields, ...requesterFields })
    .parse(request.body);
  const requester = await resolveRequester({ requesterCardNumber, requesterUnit, requesterEmail });
  const result = await new RequestService().createProduction({ ...production, ...requester });
  return reply.status(201).send({
    trackingCode: result.request.trackingCode,
    status: result.request.status,
    filament: result.filament,
  });
}

/** multipart/form-data: campos + arquivos auxiliares (foto ou sólido). */
export async function createPrototype(request: FastifyRequest, reply: FastifyReply) {
  if (!request.isMultipart()) {
    throw new HttpError('Envie o formulário como multipart/form-data', 400);
  }

  const fields: Record<string, string> = {};
  const files: StoredFile[] = [];
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (!part.filename) {
        part.file.resume();
        continue;
      }
      files.push(await storeUpload(part));
      if (part.file.truncated) {
        throw new HttpError(`O arquivo ${part.filename} excede o tamanho máximo permitido`, 413);
      }
    } else {
      fields[part.fieldname] = String(part.value ?? '');
    }
  }

  try {
    const { requesterCardNumber, requesterUnit, requesterEmail, ...prototype } = z
      .object({
        ...requesterFields,
        itemName: z.string().trim().min(1, 'Informe o nome do item'),
        quantity: z.coerce.number().int().positive('Quantidade deve ser maior que zero'),
        rigidity: z.enum(['RIGIDO', 'MALEAVEL'], { error: 'Escolha se o material é rígido ou maleável' }),
        colorName: z.string({ error: 'Escolha a cor' }).trim().min(1, 'Escolha a cor'),
        // Vazio = não vai virar item de produção.
        partNumber: z.string().trim().max(60).optional().transform((value) => value || null),
        description: z.string().trim().min(1, 'Descreva o item'),
      })
      .parse({ ...fields, requesterEmail: fields.requesterEmail || null });

    const requester = await resolveRequester({ requesterCardNumber, requesterUnit, requesterEmail });
    // O solicitante escolhe só rigidez + cor; o filamento exato é resolvido aqui.
    const { rigidity, colorName, partNumber, ...rest } = prototype;
    const filament = await new FilamentService().resolveForPrototype(rigidity, colorName);
    // Vai virar item de produção: o partnumber precisa existir na base da Pedertractor.
    const part = partNumber ? await new ApiPedertractorPart().getByPartNumber(partNumber) : null;
    const created = await new RequestService().createPrototype({
      ...rest,
      filamentId: filament.id,
      partNumber: part ? normalizePartNumber(part.partNumber) : null,
      partDescription: part?.description ?? null,
      ...requester,
      files,
    });
    return reply.status(201).send({ trackingCode: created.trackingCode, status: created.status });
  } catch (error) {
    // Solicitação não foi criada: os anexos já gravados não pertencem a nada.
    await Promise.all(files.map((file) => removeUpload(file.storedName)));
    throw error;
  }
}

export async function trackRequest(request: FastifyRequest, reply: FastifyReply) {
  const { trackingCode } = z.object({ trackingCode: z.string().trim().min(1) }).parse(request.params);
  return reply.send(await new RequestService().getPublic(trackingCode));
}
