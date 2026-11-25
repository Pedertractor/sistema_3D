import { createReadStream } from 'node:fs';
import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { receiveImageUpload } from '../../lib/image-upload.js';
import { resolveUploadPath } from '../../lib/uploads.js';
import { MachineService } from '../../services/machine-service.js';

const idParams = z.object({ id: z.uuid() });

const statusSchema = z.enum(['DISPONIVEL', 'IMPRIMINDO', 'MANUTENCAO', 'INATIVA']);
const optionalText = z.string().trim().max(500).nullable().optional();

export async function listMachines(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ machines: await new MachineService().list() });
}

export async function getMachineHistory(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  return reply.send(await new MachineService().history(id));
}

export async function createMachine(request: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({ name: z.string().trim().min(1, 'Informe o nome'), model: optionalText, notes: optionalText })
    .parse(request.body);
  const machine = await new MachineService().create(body);
  return reply.status(201).send({ machine });
}

export async function updateMachine(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.uuid() }).parse(request.params);
  const body = z
    .object({
      name: z.string().trim().min(1).optional(),
      model: optionalText,
      notes: optionalText,
      status: statusSchema.optional(),
    })
    .parse(request.body);
  const machine = await new MachineService().update(id, body);
  return reply.send({ machine });
}

/** multipart/form-data com um único arquivo de imagem (campo "image"). Substitui a foto anterior. */
export async function uploadMachineImage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const stored = await receiveImageUpload(request);
  const machine = await new MachineService().setImage(id, stored);
  return reply.send({ machine });
}

export async function getMachineImage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const image = await new MachineService().getImage(id);
  reply.header('Content-Type', image.mimeType);
  reply.header('Cache-Control', 'private, max-age=86400');
  return reply.send(createReadStream(resolveUploadPath(image.storedName)));
}

export async function deleteMachineImage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const machine = await new MachineService().removeImage(id);
  return reply.send({ machine });
}
