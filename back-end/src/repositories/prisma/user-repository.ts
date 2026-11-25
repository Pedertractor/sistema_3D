import type { Prisma, PrismaClient, User } from '../../generated/prisma/client.js';

export const publicUserSelect = {
  id: true,
  name: true,
  cardNumber: true,
  unit: true,
  role: true,
  active: true,
  mustChangePassword: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export class UserPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByCard(cardNumber: string, unit: User['unit']): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { cardNumber_unit: { cardNumber, unit } },
    });
  }

  list(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  create(data: Prisma.UserCreateInput): Promise<PublicUser> {
    return this.prisma.user.create({ data, select: publicUserSelect });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<PublicUser> {
    return this.prisma.user.update({ where: { id }, data, select: publicUserSelect });
  }
}
