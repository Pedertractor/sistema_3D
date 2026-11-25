import { FILAMENT_SUMMARY_SELECT } from '../constants/filament.js';
import type { $Enums } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { removeUpload, type StoredFile } from '../lib/uploads.js';
import { MachinePrismaRepository } from '../repositories/prisma/machine-repository.js';

const repo = () => new MachinePrismaRepository(prisma);

export class MachineService {
  list() {
    return repo().list();
  }

  async create(input: { name: string; model?: string | null | undefined; notes?: string | null | undefined }) {
    const name = input.name.trim();
    if (await repo().findByName(name)) {
      throw new HttpError('Já existe uma máquina com este nome', 409);
    }
    return repo().create({ name, model: input.model ?? null, notes: input.notes ?? null });
  }

  /**
   * Histórico da máquina: períodos de uso (cada vez que uma solicitação imprimiu nela), falhas
   * e os totais — tempo de operação, peças concluídas, material perdido.
   */
  async history(id: string) {
    const machine = await this.getOrFail(id);
    const [runs, failures] = await Promise.all([
      prisma.machineRun.findMany({
        where: { machineId: id },
        orderBy: { startedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          request: {
            select: {
              id: true,
              trackingCode: true,
              type: true,
              status: true,
              quantity: true,
              itemName: true,
              estimatedMinutes: true,
              requesterName: true,
              item: { select: { code: true, name: true } },
              filament: { select: FILAMENT_SUMMARY_SELECT },
            },
          },
        },
      }),
      prisma.printFailure.findMany({
        where: { machineId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          request: { select: { id: true, trackingCode: true } },
        },
      }),
    ]);

    const now = Date.now();
    const withDuration = runs.map((run) => {
      const end = run.endedAt?.getTime() ?? now;
      return { ...run, minutes: Math.max(0, Math.round((end - run.startedAt.getTime()) / 60_000)) };
    });

    const operatingMinutes = withDuration.reduce((sum, r) => sum + r.minutes, 0);
    const finished = withDuration.filter((r) => r.outcome === 'FINALIZADO');
    const stats = {
      operatingMinutes,
      runs: withDuration.length,
      requests: new Set(withDuration.map((r) => r.requestId)).size,
      finishedRuns: finished.length,
      finishedPieces: finished.reduce((sum, r) => sum + r.request.quantity, 0),
      failures: failures.length,
      lostGrams: failures.reduce((sum, f) => sum + f.lostGrams, 0),
      averageRunMinutes: withDuration.length ? Math.round(operatingMinutes / withDuration.length) : 0,
      firstRunAt: withDuration.at(-1)?.startedAt ?? null,
      lastRunAt: withDuration[0]?.startedAt ?? null,
    };

    return { machine, stats, runs: withDuration, failures };
  }

  private async getOrFail(id: string) {
    const machine = await repo().findById(id);
    if (!machine) throw new HttpError('Máquina não encontrada', 404);
    return machine;
  }

  /** Arquivo da foto, para servir na rota de imagem. */
  async getImage(id: string) {
    const machine = await this.getOrFail(id);
    if (!machine.imageStoredName) throw new HttpError('Máquina sem foto', 404);
    return { storedName: machine.imageStoredName, mimeType: machine.imageMimeType ?? 'application/octet-stream' };
  }

  /** Grava a nova foto e apaga a anterior do disco. */
  async setImage(id: string, file: StoredFile) {
    const machine = await this.getOrFail(id).catch(async (e) => {
      await removeUpload(file.storedName);
      throw e;
    });
    const updated = await repo().update(id, { imageStoredName: file.storedName, imageMimeType: file.mimeType });
    if (machine.imageStoredName) await removeUpload(machine.imageStoredName);
    return updated;
  }

  async removeImage(id: string) {
    const machine = await this.getOrFail(id);
    const updated = await repo().update(id, { imageStoredName: null, imageMimeType: null });
    if (machine.imageStoredName) await removeUpload(machine.imageStoredName);
    return updated;
  }

  async update(
    id: string,
    input: {
      name?: string | undefined;
      model?: string | null | undefined;
      notes?: string | null | undefined;
      status?: $Enums.MachineStatus | undefined;
    },
  ) {
    const machine = await repo().findById(id);
    if (!machine) throw new HttpError('Máquina não encontrada', 404);

    if (input.name && input.name.trim() !== machine.name) {
      const other = await repo().findByName(input.name.trim());
      if (other) throw new HttpError('Já existe uma máquina com este nome', 409);
    }

    if (input.status && input.status !== 'IMPRIMINDO' && machine.status === 'IMPRIMINDO') {
      const printing = await prisma.printRequest.count({
        where: { machineId: id, status: 'EM_IMPRESSAO' },
      });
      if (printing > 0) {
        throw new HttpError(
          'A máquina tem uma solicitação em impressão. Pause ou finalize a solicitação antes de mudar o status.',
          409,
        );
      }
    }

    return repo().update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.model !== undefined ? { model: input.model } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
  }
}
