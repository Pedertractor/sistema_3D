import { FILAMENT_SUMMARY_SELECT } from '../constants/filament.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';

const MAX_RANGE_DAYS = 366;

/**
 * Produção no período: processos (MachineRun) que se sobrepõem a [from, to).
 * Cada processo vem recortado ao período (clippedStart/clippedEnd) para que o
 * front-end some as horas e monte o gráfico no fuso horário do usuário.
 */
export class DashboardService {
  async production(from: Date, to: Date) {
    if (to <= from) throw new HttpError('Período inválido', 400);
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) {
      throw new HttpError('Período máximo de 1 ano', 400);
    }

    const [machines, runs, failures] = await Promise.all([
      prisma.machine.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, model: true, status: true },
      }),
      prisma.machineRun.findMany({
        where: {
          startedAt: { lt: to },
          OR: [{ endedAt: null }, { endedAt: { gt: from } }],
        },
        orderBy: { startedAt: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
          request: {
            select: {
              id: true,
              trackingCode: true,
              type: true,
              quantity: true,
              itemName: true,
              item: { select: { code: true, name: true } },
              filament: { select: FILAMENT_SUMMARY_SELECT },
            },
          },
        },
      }),
      prisma.printFailure.findMany({
        where: { createdAt: { gte: from, lt: to } },
        select: { id: true, lostGrams: true, machineId: true },
      }),
    ]);

    const now = new Date();
    const clipped = runs.map((run) => {
      const end = run.endedAt ?? now;
      const clippedStart = run.startedAt > from ? run.startedAt : from;
      const clippedEnd = end < to ? end : to;
      const minutes = Math.max(0, (clippedEnd.getTime() - clippedStart.getTime()) / 60_000);
      return { ...run, clippedStart, clippedEnd: clippedEnd < clippedStart ? clippedStart : clippedEnd, minutes };
    });

    return { from, to, generatedAt: now, machines, runs: clipped, failures };
  }
}
