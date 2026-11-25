import { createReadStream } from 'node:fs';
import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { resolveUploadPath } from '../../lib/uploads.js';
import { RequestService } from '../../services/request-service.js';

const statusSchema = z.enum([
  'AGUARDANDO_IMPRESSAO',
  'EM_PROTOTIPAGEM',
  'EM_IMPRESSAO',
  'FALHA_IMPRESSAO',
  'PAUSADO',
  'FINALIZADO',
  'AGUARDANDO_FILAMENTO',
  'CANCELADO',
]);
const idParams = z.object({ id: z.uuid() });

export async function listRequests(request: FastifyRequest, reply: FastifyReply) {
  const query = z
    .object({
      status: z
        .string()
        .optional()
        .transform((v) => (v ? v.split(',').filter(Boolean) : undefined))
        .pipe(z.array(statusSchema).optional()),
      type: z.enum(['PROTOTIPAGEM', 'PRODUCAO']).optional(),
      search: z.string().optional(),
    })
    .parse(request.query);
  return reply.send(await new RequestService().list(query));
}

export async function getRequest(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  return reply.send(await new RequestService().getById(id));
}

export async function queueEstimate(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ estimate: await new RequestService().estimateQueue(0) });
}

export async function changeStatus(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z
    .object({
      status: statusSchema,
      machineId: z.uuid().nullable().optional(),
      grams: z.number().int().positive().optional(),
      note: z.string().trim().max(500).nullable().optional(),
    })
    .parse(request.body);
  const updated = await new RequestService().changeStatus(id, body, request.user.sub);
  return reply.send({ request: updated });
}

export async function updateEstimate(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z
    .object({
      /** Gramas de UMA peça (o total é calculado pela quantidade). */
      gramsPerUnit: z.number().int().positive('Gramas por peça deve ser maior que zero').optional(),
      /** Minutos de impressão de UMA peça. */
      minutesPerUnit: z.number().int().positive('Minutos por peça deve ser maior que zero').optional(),
    })
    .parse(request.body);
  return reply.send({ request: await new RequestService().updateEstimate(id, body) });
}

export async function addFailure(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z
    .object({
      lostGrams: z.number().int().min(0, 'Gramas perdidos não pode ser negativo'),
      reason: z.string().trim().min(3, 'Descreva a falha'),
      processMinutes: z.number().int().min(0, 'Tempo de processo não pode ser negativo').nullable().optional(),
      machineId: z.uuid().nullable().optional(),
      markAsFailed: z.boolean().optional(),
    })
    .parse(request.body);
  const failure = await new RequestService().addFailure(id, body, request.user.sub);
  return reply.status(201).send({ failure });
}

export async function downloadAttachment(request: FastifyRequest, reply: FastifyReply) {
  const { id, attachmentId } = z.object({ id: z.uuid(), attachmentId: z.uuid() }).parse(request.params);
  const attachment = await new RequestService().getAttachment(id, attachmentId);
  reply.header('Content-Type', attachment.mimeType);
  reply.header(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
  );
  return reply.send(createReadStream(resolveUploadPath(attachment.storedName)));
}
