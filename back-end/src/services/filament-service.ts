import { $Enums, type Filament, type Prisma } from '../generated/prisma/client.js';
import {
  FILAMENT_RIGIDITY_LABELS,
  STATUSES_PENDING_CONSUMPTION,
  filamentLabel,
} from '../constants/filament.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { removeUpload, type StoredFile } from '../lib/uploads.js';

type Tx = Prisma.TransactionClient;

export interface FilamentAvailability {
  id: string;
  type: string;
  colorName: string;
  colorHex: string;
  rigidity: $Enums.FilamentRigidity;
  /** Ex.: "PLA Preto" */
  label: string;
  rigidityLabel: string;
  almxCode: string;
  active: boolean;
  imageStoredName: string | null;
  updatedAt: Date;
  stockGrams: number;
  /** Gramas já comprometidas por solicitações na fila que ainda não debitaram */
  committedGrams: number;
  /** stock - committed */
  availableGrams: number;
  minStockGrams: number;
}

export interface FilamentInput {
  type: string;
  colorName: string;
  colorHex: string;
  rigidity: $Enums.FilamentRigidity;
  almxCode: string;
  minStockGrams?: number | undefined;
}

function toAvailability(filament: Filament, committedGrams: number): FilamentAvailability {
  return {
    id: filament.id,
    type: filament.type,
    colorName: filament.colorName,
    colorHex: filament.colorHex,
    rigidity: filament.rigidity,
    label: filamentLabel(filament),
    rigidityLabel: FILAMENT_RIGIDITY_LABELS[filament.rigidity],
    almxCode: filament.almxCode,
    active: filament.active,
    imageStoredName: filament.imageStoredName,
    updatedAt: filament.updatedAt,
    stockGrams: filament.stockGrams,
    committedGrams,
    availableGrams: filament.stockGrams - committedGrams,
    minStockGrams: filament.minStockGrams,
  };
}

/** Campos de texto normalizados (sem espaços sobrando, hex em maiúsculas). */
function normalize(input: FilamentInput) {
  return {
    type: input.type.trim(),
    colorName: input.colorName.trim(),
    colorHex: input.colorHex.trim().toUpperCase(),
    rigidity: input.rigidity,
    almxCode: input.almxCode.trim(),
  };
}

export class FilamentService {
  /** Saldo, comprometido e disponível de cada filamento. */
  async listAvailability(
    options: { activeOnly?: boolean } = {},
    tx: Tx | typeof prisma = prisma,
  ): Promise<FilamentAvailability[]> {
    const [filaments, committed] = await Promise.all([
      tx.filament.findMany({
        where: options.activeOnly ? { active: true } : {},
        orderBy: [{ active: 'desc' }, { type: 'asc' }, { colorName: 'asc' }],
      }),
      tx.printRequest.groupBy({
        by: ['filamentId'],
        where: { status: { in: STATUSES_PENDING_CONSUMPTION } },
        _sum: { estimatedGrams: true },
      }),
    ]);

    return filaments.map((filament) =>
      toAvailability(filament, committed.find((c) => c.filamentId === filament.id)?._sum.estimatedGrams ?? 0),
    );
  }

  async getAvailability(filamentId: string, tx: Tx | typeof prisma = prisma) {
    const filament = await tx.filament.findUnique({ where: { id: filamentId } });
    if (!filament) throw new HttpError('Filamento não encontrado', 404);
    const committed = await tx.printRequest.aggregate({
      where: { filamentId, status: { in: STATUSES_PENDING_CONSUMPTION } },
      _sum: { estimatedGrams: true },
    });
    return toAvailability(filament, committed._sum.estimatedGrams ?? 0);
  }

  /** Garante que o filamento existe e está ativo (para itens e novas solicitações). */
  async requireActive(filamentId: string, tx: Tx | typeof prisma = prisma) {
    const filament = await tx.filament.findUnique({ where: { id: filamentId } });
    if (!filament) throw new HttpError('Filamento não encontrado', 404);
    if (!filament.active) throw new HttpError(`O filamento ${filamentLabel(filament)} está inativo`, 409);
    return filament;
  }

  /**
   * Prototipagem: o solicitante escolhe só rigidez + cor. Entre os filamentos ativos
   * que combinam (ex.: PLA Preto e PETG Preto), usa o que tem mais estoque.
   */
  async resolveForPrototype(rigidity: $Enums.FilamentRigidity, colorName: string) {
    const filament = await prisma.filament.findFirst({
      where: { active: true, rigidity, colorName: { equals: colorName.trim(), mode: 'insensitive' } },
      orderBy: [{ stockGrams: 'desc' }, { createdAt: 'asc' }],
    });
    if (!filament) {
      throw new HttpError(
        `Não há filamento ${FILAMENT_RIGIDITY_LABELS[rigidity].toLowerCase()} na cor ${colorName.trim()} disponível`,
        409,
      );
    }
    return filament;
  }

  private async assertUnique(type: string, colorName: string, ignoreId?: string) {
    const existing = await prisma.filament.findFirst({
      where: {
        type: { equals: type, mode: 'insensitive' },
        colorName: { equals: colorName, mode: 'insensitive' },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
    });
    if (existing) throw new HttpError(`Já existe o filamento ${filamentLabel(existing)}`, 409);
  }

  async create(input: FilamentInput & { initialStockGrams?: number | undefined; userId: string }) {
    const data = normalize(input);
    await this.assertUnique(data.type, data.colorName);
    return prisma.$transaction(async (tx) => {
      const filament = await tx.filament.create({
        data: { ...data, minStockGrams: input.minStockGrams ?? 0 },
      });
      if (input.initialStockGrams && input.initialStockGrams > 0) {
        return this.applyMovement(tx, {
          filamentId: filament.id,
          type: 'ESTOQUE_INICIAL',
          grams: input.initialStockGrams,
          note: 'Estoque inicial',
          userId: input.userId,
        });
      }
      return filament;
    });
  }

  async update(
    id: string,
    input: { [K in keyof FilamentInput]?: FilamentInput[K] | undefined } & { active?: boolean | undefined },
  ) {
    const current = await prisma.filament.findUnique({ where: { id } });
    if (!current) throw new HttpError('Filamento não encontrado', 404);

    const merged = normalize({
      type: input.type ?? current.type,
      colorName: input.colorName ?? current.colorName,
      colorHex: input.colorHex ?? current.colorHex,
      rigidity: input.rigidity ?? current.rigidity,
      almxCode: input.almxCode ?? current.almxCode,
    });
    if (merged.type !== current.type || merged.colorName !== current.colorName) {
      await this.assertUnique(merged.type, merged.colorName, id);
    }

    return prisma.filament.update({
      where: { id },
      data: {
        ...merged,
        ...(input.minStockGrams !== undefined ? { minStockGrams: input.minStockGrams } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
  }

  /** Arquivo da foto, para servir na rota de imagem. */
  async getImage(id: string) {
    const filament = await prisma.filament.findUnique({ where: { id } });
    if (!filament) throw new HttpError('Filamento não encontrado', 404);
    if (!filament.imageStoredName) throw new HttpError('Filamento sem foto', 404);
    return { storedName: filament.imageStoredName, mimeType: filament.imageMimeType ?? 'application/octet-stream' };
  }

  /** Grava a nova foto e apaga a anterior do disco. */
  async setImage(id: string, file: StoredFile) {
    const filament = await prisma.filament.findUnique({ where: { id } });
    if (!filament) {
      await removeUpload(file.storedName);
      throw new HttpError('Filamento não encontrado', 404);
    }
    const updated = await prisma.filament.update({
      where: { id },
      data: { imageStoredName: file.storedName, imageMimeType: file.mimeType },
    });
    if (filament.imageStoredName) await removeUpload(filament.imageStoredName);
    return updated;
  }

  async removeImage(id: string) {
    const filament = await prisma.filament.findUnique({ where: { id } });
    if (!filament) throw new HttpError('Filamento não encontrado', 404);
    const updated = await prisma.filament.update({
      where: { id },
      data: { imageStoredName: null, imageMimeType: null },
    });
    if (filament.imageStoredName) await removeUpload(filament.imageStoredName);
    return updated;
  }

  /** Entrada / estoque inicial / ajuste manual feitos pelo operador. */
  async registerManualMovement(input: {
    filamentId: string;
    type: 'ESTOQUE_INICIAL' | 'ENTRADA' | 'AJUSTE';
    grams: number;
    note?: string | null | undefined;
    userId: string;
  }) {
    if (input.type !== 'AJUSTE' && input.grams <= 0) {
      throw new HttpError('Informe uma quantidade positiva em gramas', 400);
    }
    if (input.grams === 0) throw new HttpError('Quantidade não pode ser zero', 400);

    const result = await prisma.$transaction(async (tx) => {
      const filament = await this.applyMovement(tx, {
        filamentId: input.filamentId,
        type: input.type,
        grams: input.grams,
        note: input.note ?? null,
        userId: input.userId,
      });
      const released = input.grams > 0 ? await this.releaseWaitingRequests(tx, filament.id, input.userId) : [];
      return { filament, released };
    });
    return result;
  }

  listMovements(filamentId: string) {
    return prisma.filamentMovement.findMany({
      where: { filamentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true } },
        request: { select: { id: true, trackingCode: true } },
      },
    });
  }

  /**
   * Aplica um movimento e atualiza o saldo. `grams` positivo = entrada, negativo = saída.
   * Deve ser chamado dentro de uma transação.
   */
  async applyMovement(
    tx: Tx,
    input: {
      filamentId: string;
      type: $Enums.FilamentMovementType;
      grams: number;
      note?: string | null;
      requestId?: string | null;
      userId?: string | null;
    },
  ) {
    const filament = await tx.filament.update({
      where: { id: input.filamentId },
      data: { stockGrams: { increment: input.grams } },
    });
    await tx.filamentMovement.create({
      data: {
        filamentId: input.filamentId,
        type: input.type,
        grams: input.grams,
        balanceAfter: filament.stockGrams,
        note: input.note ?? null,
        requestId: input.requestId ?? null,
        userId: input.userId ?? null,
      },
    });
    return filament;
  }

  async requireFilament(tx: Tx, filamentId: string) {
    const filament = await tx.filament.findUnique({ where: { id: filamentId } });
    if (!filament) throw new HttpError('Filamento da solicitação não encontrado no estoque', 409);
    return filament;
  }

  /**
   * Após entrada de material: libera (FIFO) solicitações "aguardando filamento"
   * deste filamento que agora cabem no saldo disponível.
   */
  async releaseWaitingRequests(tx: Tx, filamentId: string, userId: string | null) {
    const filament = await tx.filament.findUnique({ where: { id: filamentId } });
    if (!filament) return [];

    const queued = await tx.printRequest.aggregate({
      where: { filamentId, status: 'AGUARDANDO_IMPRESSAO' },
      _sum: { estimatedGrams: true },
    });
    let available = filament.stockGrams - (queued._sum.estimatedGrams ?? 0);

    const waiting = await tx.printRequest.findMany({
      where: { filamentId, status: 'AGUARDANDO_FILAMENTO' },
      orderBy: { createdAt: 'asc' },
    });

    const released: string[] = [];
    for (const request of waiting) {
      const needed = request.estimatedGrams ?? 0;
      if (needed > available) break; // respeita a ordem da fila
      available -= needed;
      await tx.printRequest.update({
        where: { id: request.id },
        data: { status: 'AGUARDANDO_IMPRESSAO' },
      });
      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          fromStatus: 'AGUARDANDO_FILAMENTO',
          toStatus: 'AGUARDANDO_IMPRESSAO',
          note: 'Liberada automaticamente após entrada de filamento',
          userId,
        },
      });
      released.push(request.trackingCode);
    }
    return released;
  }
}
