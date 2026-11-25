import bcrypt from 'bcrypt';
import type { $Enums } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import {
  publicUserSelect,
  UserPrismaRepository,
  type PublicUser,
} from '../repositories/prisma/user-repository.js';

const repo = () => new UserPrismaRepository(prisma);

export class UserService {
  async authenticate(input: {
    cardNumber: string;
    unit: $Enums.Unit;
    password: string;
  }): Promise<PublicUser> {
    const user = await repo().findByCard(input.cardNumber.trim(), input.unit);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError('Credenciais inválidas', 401);
    }
    if (!user.active) {
      throw new HttpError('Usuário inativo', 401);
    }
    return this.getById(user.id);
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new HttpError('Usuário não encontrado', 404);
    return user;
  }

  async resolveSessionPrincipal(id: string) {
    const user = await repo().findById(id);
    if (!user) throw new HttpError('Não autorizado', 401);
    return user;
  }

  list() {
    return repo().list();
  }

  async create(input: {
    name: string;
    cardNumber: string;
    unit: $Enums.Unit;
    role: $Enums.UserRole;
  }): Promise<PublicUser> {
    const cardNumber = input.cardNumber.trim();
    const existing = await repo().findByCard(cardNumber, input.unit);
    if (existing) {
      throw new HttpError('Já existe um usuário com este cartão nesta unidade', 409);
    }
    // Senha inicial = número do cartão; troca obrigatória no primeiro acesso
    const passwordHash = await bcrypt.hash(cardNumber, 10);
    return repo().create({
      name: input.name.trim(),
      cardNumber,
      unit: input.unit,
      role: input.role,
      passwordHash,
      mustChangePassword: true,
    });
  }

  async update(
    id: string,
    input: { name?: string | undefined; role?: $Enums.UserRole | undefined; active?: boolean | undefined },
    actorId: string,
  ): Promise<PublicUser> {
    await this.getById(id);
    if (id === actorId && (input.active === false || (input.role && input.role !== 'ADMIN'))) {
      throw new HttpError('Você não pode desativar ou rebaixar o próprio usuário', 400);
    }
    return repo().update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
  }

  async resetPassword(id: string): Promise<PublicUser> {
    const user = await this.getById(id);
    const passwordHash = await bcrypt.hash(user.cardNumber, 10);
    return repo().update(id, { passwordHash, mustChangePassword: true });
  }

  async changePassword(
    id: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<PublicUser> {
    const user = await repo().findById(id);
    if (!user) throw new HttpError('Usuário não encontrado', 404);
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new HttpError('Senha atual incorreta', 400);
    }
    if (input.currentPassword === input.newPassword) {
      throw new HttpError('A nova senha deve ser diferente da atual', 400);
    }
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    return repo().update(id, { passwordHash, mustChangePassword: false });
  }
}
