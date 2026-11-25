import { FILAMENT_SUMMARY_SELECT } from '../../constants/filament.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export const itemInclude = {
  partNumbers: { orderBy: { partNumber: 'asc' } },
  originRequest: { select: { id: true, trackingCode: true } },
  filament: { select: FILAMENT_SUMMARY_SELECT },
} satisfies Prisma.ItemInclude;

export class ItemPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  list(search?: string) {
    const term = search?.trim();
    return this.prisma.item.findMany({
      where: term
        ? {
            OR: [
              { code: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
              { partNumbers: { some: { partNumber: { contains: term, mode: 'insensitive' } } } },
            ],
          }
        : {},
      include: itemInclude,
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.item.findUnique({ where: { id }, include: itemInclude });
  }

  findByCode(code: string) {
    return this.prisma.item.findUnique({ where: { code } });
  }
}
