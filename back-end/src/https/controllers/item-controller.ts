import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { nextItemCode } from '../../lib/item-code.js';
import { prisma } from '../../lib/prisma.js';
import { ItemService } from '../../services/item-service.js';

const idParams = z.object({ id: z.uuid() });

// Sem "code": o código do item é gerado pelo servidor no cadastro e não muda depois.
const itemFields = {
  name: z.string().trim().min(1, 'Informe o nome'),
  description: z.string().trim().max(1000).nullable().optional(),
  filamentId: z.uuid('Escolha o filamento'),
  gramsPerUnit: z.number().int().positive('Gramas por unidade deve ser maior que zero'),
  printMinutesPerUnit: z.number().int().positive('Tempo por unidade deve ser maior que zero'),
  unitsPerPrint: z.number().int().positive('Unidades por impressão deve ser maior que zero'),
  active: z.boolean().optional(),
};

const quantityPerPart = z
  .number()
  .int()
  .positive('Itens por peça deve ser maior que zero')
  .max(10_000);

/** Aceita só o partnumber (1 item por peça) ou { partNumber, quantityPerPart }. */
const partNumberLink = z.union([
  z.string().transform((partNumber) => ({ partNumber, quantityPerPart: 1 })),
  z.object({ partNumber: z.string().trim().min(1, 'Informe o partnumber'), quantityPerPart: quantityPerPart.default(1) }),
]);

export async function listItems(request: FastifyRequest, reply: FastifyReply) {
  const { search } = z.object({ search: z.string().optional() }).parse(request.query);
  return reply.send({ items: await new ItemService().list(search) });
}

/** Código que o próximo item vai receber (só prévia: o definitivo é gerado ao salvar). */
export async function getNextItemCode(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ code: await nextItemCode(prisma) });
}

export async function getItem(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  return reply.send({ item: await new ItemService().getById(id) });
}

export async function createItem(request: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({
      ...itemFields,
      partNumbers: z.array(partNumberLink).default([]),
      originRequestId: z.uuid().nullable().optional(),
    })
    .parse(request.body);
  const item = await new ItemService().create(body);
  return reply.status(201).send({ item });
}

export async function updateItem(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z.object(itemFields).partial().parse(request.body);
  return reply.send({ item: await new ItemService().update(id, body) });
}

export async function addItemPartNumber(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const link = z
    .object({ partNumber: z.string().trim().min(1, 'Informe o partnumber'), quantityPerPart: quantityPerPart.default(1) })
    .parse(request.body);
  return reply.status(201).send({ item: await new ItemService().addPartNumber(id, link) });
}

export async function updateItemPartNumber(request: FastifyRequest, reply: FastifyReply) {
  const { id, linkId } = z.object({ id: z.uuid(), linkId: z.uuid() }).parse(request.params);
  const body = z.object({ quantityPerPart }).parse(request.body);
  return reply.send({ item: await new ItemService().updatePartNumber(id, linkId, body.quantityPerPart) });
}

export async function removeItemPartNumber(request: FastifyRequest, reply: FastifyReply) {
  const { id, linkId } = z.object({ id: z.uuid(), linkId: z.uuid() }).parse(request.params);
  return reply.send({ item: await new ItemService().removePartNumber(id, linkId) });
}
