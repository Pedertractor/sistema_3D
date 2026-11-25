import { createReadStream } from 'node:fs';
import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { receiveImageUpload } from '../../lib/image-upload.js';
import { resolveUploadPath } from '../../lib/uploads.js';
import { FilamentService } from '../../services/filament-service.js';

const idParams = z.object({ id: z.uuid() });
const rigiditySchema = z.enum(['RIGIDO', 'MALEAVEL'], { error: 'Escolha rígido ou maleável' });

const filamentFields = {
  type: z.string().trim().min(1, 'Informe o tipo (ex.: PLA, PETG, TPU)').max(40),
  colorName: z.string().trim().min(1, 'Informe o nome da cor').max(40),
  colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use #RRGGBB)'),
  rigidity: rigiditySchema,
  almxCode: z.string().trim().min(1, 'Informe o código do almoxarifado').max(60),
  minStockGrams: z.number().int().min(0).optional(),
};

export async function listFilaments(request: FastifyRequest, reply: FastifyReply) {
  const { active } = z.object({ active: z.enum(['true', 'false']).optional() }).parse(request.query);
  const filaments = await new FilamentService().listAvailability({ activeOnly: active === 'true' });
  return reply.send({ filaments });
}

export async function createFilament(request: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({ ...filamentFields, initialStockGrams: z.number().int().min(0).optional() })
    .parse(request.body);
  const filament = await new FilamentService().create({ ...body, userId: request.user.sub });
  return reply.status(201).send({ filament });
}

export async function updateFilament(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z
    .object({
      type: filamentFields.type.optional(),
      colorName: filamentFields.colorName.optional(),
      colorHex: filamentFields.colorHex.optional(),
      rigidity: rigiditySchema.optional(),
      almxCode: filamentFields.almxCode.optional(),
      minStockGrams: filamentFields.minStockGrams,
      active: z.boolean().optional(),
    })
    .parse(request.body);
  const filament = await new FilamentService().update(id, body);
  return reply.send({ filament });
}

export async function createMovement(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z
    .object({
      type: z.enum(['ESTOQUE_INICIAL', 'ENTRADA', 'AJUSTE']),
      grams: z.number().int(),
      note: z.string().trim().max(500).nullable().optional(),
    })
    .parse(request.body);
  const result = await new FilamentService().registerManualMovement({
    filamentId: id,
    ...body,
    userId: request.user.sub,
  });
  return reply.status(201).send(result);
}

export async function listMovements(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  return reply.send({ movements: await new FilamentService().listMovements(id) });
}

/** multipart/form-data com um único arquivo de imagem (campo "image"). Substitui a foto anterior. */
export async function uploadFilamentImage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const stored = await receiveImageUpload(request);
  const filament = await new FilamentService().setImage(id, stored);
  return reply.send({ filament });
}

/** Também usada na rota pública: o solicitante vê a foto ao escolher o filamento. */
export async function getFilamentImage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const image = await new FilamentService().getImage(id);
  reply.header('Content-Type', image.mimeType);
  reply.header('Cache-Control', 'public, max-age=86400');
  return reply.send(createReadStream(resolveUploadPath(image.storedName)));
}

export async function deleteFilamentImage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const filament = await new FilamentService().removeImage(id);
  return reply.send({ filament });
}
