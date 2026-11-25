import type { Prisma } from '../generated/prisma/client.js';

/** Gera códigos sequenciais por ano: 3D-2026-00001 */
export async function nextTrackingCode(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const year = now.getFullYear();
  const prefix = `3D-${year}-`;
  const last = await tx.printRequest.findFirst({
    where: { trackingCode: { startsWith: prefix } },
    orderBy: { trackingCode: 'desc' },
    select: { trackingCode: true },
  });
  const lastSeq = last ? Number(last.trackingCode.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
