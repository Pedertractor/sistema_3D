import type { Machine, Prisma, PrismaClient } from '../../generated/prisma/client.js';

export class MachinePrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  list() {
    return this.prisma.machine.findMany({
      orderBy: { name: 'asc' },
      include: {
        requests: {
          where: { status: 'EM_IMPRESSAO' },
          select: { id: true, trackingCode: true, type: true, startedAt: true, estimatedMinutes: true },
        },
        // Processo em andamento: o início dele (não o 1º início da solicitação) alimenta o cronômetro.
        runs: { where: { endedAt: null }, select: { requestId: true, startedAt: true } },
      },
    });
  }

  findById(id: string): Promise<Machine | null> {
    return this.prisma.machine.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Machine | null> {
    return this.prisma.machine.findUnique({ where: { name } });
  }

  create(data: Prisma.MachineCreateInput): Promise<Machine> {
    return this.prisma.machine.create({ data });
  }

  update(id: string, data: Prisma.MachineUpdateInput): Promise<Machine> {
    return this.prisma.machine.update({ where: { id }, data });
  }
}
