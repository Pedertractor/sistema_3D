import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserService } from '../../services/user-service.js';

const unitSchema = z.enum(['PEDERTRACTOR', 'TRACTOR']);
const roleSchema = z.enum(['ADMIN', 'OPERATOR']);
const idParams = z.object({ id: z.uuid() });

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({
      cardNumber: z.string().trim().min(1, 'Informe o cartão'),
      unit: unitSchema,
      password: z.string().min(1, 'Informe a senha'),
    })
    .parse(request.body);
  const user = await new UserService().authenticate(body);
  const token = await reply.jwtSign({ sub: user.id });
  return reply.status(200).send({ user, token });
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = await new UserService().getById(request.user.sub);
  return reply.send({ user });
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({
      currentPassword: z.string().min(1).optional(),
      newPassword: z.string().min(6, 'A nova senha deve ter ao menos 6 caracteres'),
    })
    .parse(request.body);
  const user = await new UserService().changePassword(request.user.sub, body);
  return reply.send({ user });
}

export async function listUsers(_request: FastifyRequest, reply: FastifyReply) {
  const users = await new UserService().list();
  return reply.send({ users });
}

export async function createUser(request: FastifyRequest, reply: FastifyReply) {
  const body = z
    .object({
      name: z.string().trim().min(2, 'Informe o nome'),
      cardNumber: z.string().trim().min(1, 'Informe o cartão'),
      unit: unitSchema,
      role: roleSchema,
    })
    .parse(request.body);
  const user = await new UserService().create(body);
  return reply.status(201).send({ user });
}

export async function updateUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const body = z
    .object({
      name: z.string().trim().min(2).optional(),
      role: roleSchema.optional(),
      active: z.boolean().optional(),
    })
    .parse(request.body);
  const user = await new UserService().update(id, body, request.user.sub);
  return reply.send({ user });
}

export async function resetUserPassword(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParams.parse(request.params);
  const user = await new UserService().resetPassword(id);
  return reply.send({ user });
}
