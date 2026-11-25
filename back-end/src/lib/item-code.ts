import type { Prisma, PrismaClient } from '../generated/prisma/client.js';

export const ITEM_CODE_PREFIX = 'ITM-';

/** Próximo código sequencial de item: ITM-00001, ITM-00002... (maior número existente + 1). */
export async function nextItemCode(db: PrismaClient | Prisma.TransactionClient): Promise<string> {
  const existing = await db.item.findMany({
    where: { code: { startsWith: ITEM_CODE_PREFIX } },
    select: { code: true },
  });
  const last = existing.reduce((max, { code }) => {
    const seq = Number(code.slice(ITEM_CODE_PREFIX.length));
    return Number.isInteger(seq) && seq > max ? seq : max;
  }, 0);
  return `${ITEM_CODE_PREFIX}${String(last + 1).padStart(5, '0')}`;
}
