import { $Enums, type Prisma } from '../generated/prisma/client.js';
import {
  FILAMENT_SUMMARY_SELECT,
  filamentLabel,
  PRODUCTIVE_MACHINE_STATUSES,
  STATUSES_IN_QUEUE,
} from '../constants/filament.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { calculatePrintJob } from '../lib/print-math.js';
import { nextTrackingCode } from '../lib/tracking-code.js';
import type { StoredFile } from '../lib/uploads.js';
import { FilamentService } from './filament-service.js';
import { normalizePartNumber } from './part-service.js';

type Tx = Prisma.TransactionClient;
type Status = $Enums.RequestStatus;

const filamentService = new FilamentService();

const requestInclude = {
  item: { select: { id: true, code: true, name: true, gramsPerUnit: true, printMinutesPerUnit: true, unitsPerPrint: true } },
  machine: { select: { id: true, name: true, status: true } },
  filament: { select: FILAMENT_SUMMARY_SELECT },
  createdItem: { select: { id: true, code: true, name: true } },
  attachments: { orderBy: { createdAt: 'asc' } },
  failures: {
    orderBy: { createdAt: 'desc' },
    include: {
      machine: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  },
  history: {
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  },
} satisfies Prisma.PrintRequestInclude;

/** Nomes dos status para mensagens de erro. */
const STATUS_LABELS: Record<Status, string> = {
  AGUARDANDO_IMPRESSAO: 'Aguardando',
  EM_PROTOTIPAGEM: 'Prototipando',
  EM_IMPRESSAO: 'Imprimindo',
  FALHA_IMPRESSAO: 'Falha na impressão',
  PAUSADO: 'Pausado',
  FINALIZADO: 'Finalizado',
  AGUARDANDO_FILAMENTO: 'Aguardando filamento',
  CANCELADO: 'Cancelado',
};

/**
 * Transições permitidas na fila, por tipo.
 * Produção: aguardando → imprimindo → finalizado.
 * Prototipagem: aguardando → prototipando (equipe desenvolvendo o protótipo) → imprimindo → finalizado.
 * "Aguardando filamento" não aparece aqui: só é marcado no momento de imprimir, ou seja,
 * a partir de qualquer status que permita ir para EM_IMPRESSAO (ver canTransition).
 * Mantenha igual a front-end/src/types/domain.ts (allowedTransitions).
 */
const TRANSITIONS: Record<$Enums.RequestType, Record<Status, Status[]>> = {
  PRODUCAO: {
    AGUARDANDO_IMPRESSAO: ['EM_IMPRESSAO', 'PAUSADO', 'CANCELADO'],
    AGUARDANDO_FILAMENTO: ['AGUARDANDO_IMPRESSAO', 'EM_IMPRESSAO', 'CANCELADO'],
    EM_PROTOTIPAGEM: [],
    EM_IMPRESSAO: ['PAUSADO', 'FALHA_IMPRESSAO', 'FINALIZADO', 'CANCELADO'],
    PAUSADO: ['EM_IMPRESSAO', 'AGUARDANDO_IMPRESSAO', 'CANCELADO'],
    FALHA_IMPRESSAO: ['EM_IMPRESSAO', 'AGUARDANDO_IMPRESSAO', 'PAUSADO', 'CANCELADO'],
    FINALIZADO: [],
    CANCELADO: [],
  },
  PROTOTIPAGEM: {
    AGUARDANDO_IMPRESSAO: ['EM_PROTOTIPAGEM', 'PAUSADO', 'CANCELADO'],
    AGUARDANDO_FILAMENTO: ['AGUARDANDO_IMPRESSAO', 'EM_PROTOTIPAGEM', 'EM_IMPRESSAO', 'CANCELADO'],
    EM_PROTOTIPAGEM: ['EM_IMPRESSAO', 'PAUSADO', 'CANCELADO'],
    EM_IMPRESSAO: ['PAUSADO', 'FALHA_IMPRESSAO', 'FINALIZADO', 'CANCELADO'],
    PAUSADO: ['EM_PROTOTIPAGEM', 'EM_IMPRESSAO', 'AGUARDANDO_IMPRESSAO', 'CANCELADO'],
    FALHA_IMPRESSAO: ['EM_IMPRESSAO', 'EM_PROTOTIPAGEM', 'AGUARDANDO_IMPRESSAO', 'PAUSADO', 'CANCELADO'],
    FINALIZADO: [],
    CANCELADO: [],
  },
};

/** Solicitante já identificado na API corporativa (ver EmployeeService). */
export interface RequesterData {
  requesterName: string;
  requesterEmail: string | null;
  requesterSector: string | null;
  requesterCostCenter: string | null;
  requesterCardNumber: string;
  requesterUnit: $Enums.Unit;
}

function requesterColumns(input: RequesterData) {
  return {
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    requesterSector: input.requesterSector,
    requesterCostCenter: input.requesterCostCenter,
    requesterCardNumber: input.requesterCardNumber,
    requesterUnit: input.requesterUnit,
  };
}

export interface QueueEstimate {
  /** Minutos de impressão desta solicitação (sem fila) */
  requestMinutes: number;
  /** Minutos restantes de tudo que está na fila antes */
  queueMinutes: number;
  productiveMachines: number;
  /** (fila + esta) / máquinas — horas corridas */
  totalMinutes: number | null;
  estimatedCompletionAt: string | null;
}

export class RequestService {
  // ───────────────────────────── Prazo / fila ─────────────────────────────

  /**
   * Prazo em horas corridas: soma o tempo restante da fila única e divide
   * pelo número de máquinas produtivas (disponíveis + imprimindo).
   */
  async estimateQueue(requestMinutes: number, options: { excludeRequestId?: string; before?: Date } = {}, tx: Tx | typeof prisma = prisma): Promise<QueueEstimate> {
    const [queued, productiveMachines] = await Promise.all([
      tx.printRequest.findMany({
        where: {
          status: { in: STATUSES_IN_QUEUE },
          ...(options.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
          ...(options.before ? { createdAt: { lt: options.before } } : {}),
        },
        select: { status: true, estimatedMinutes: true, startedAt: true },
      }),
      tx.machine.count({ where: { status: { in: PRODUCTIVE_MACHINE_STATUSES } } }),
    ]);

    const now = Date.now();
    const queueMinutes = queued.reduce((total, item) => {
      const estimated = item.estimatedMinutes ?? 0;
      if (item.status === 'EM_IMPRESSAO' && item.startedAt) {
        const elapsed = (now - item.startedAt.getTime()) / 60_000;
        return total + Math.max(0, estimated - elapsed);
      }
      return total + estimated;
    }, 0);

    if (productiveMachines === 0) {
      return { requestMinutes, queueMinutes: Math.round(queueMinutes), productiveMachines, totalMinutes: null, estimatedCompletionAt: null };
    }

    const totalMinutes = Math.ceil((queueMinutes + requestMinutes) / productiveMachines);
    return {
      requestMinutes,
      queueMinutes: Math.round(queueMinutes),
      productiveMachines,
      totalMinutes,
      estimatedCompletionAt: new Date(now + totalMinutes * 60_000).toISOString(),
    };
  }

  // ───────────────────────────── Produção ─────────────────────────────

  private async loadItemForPartNumber(tx: Tx | typeof prisma, partNumberRaw: string, itemId: string) {
    const partNumber = normalizePartNumber(partNumberRaw);
    const item = await tx.item.findUnique({
      where: { id: itemId },
      include: { partNumbers: { where: { partNumber } } },
    });
    if (!item || !item.active) throw new HttpError('Item não encontrado ou inativo', 404);
    const link = item.partNumbers[0];
    if (!link) throw new HttpError(`O item ${item.code} não está vinculado ao partnumber ${partNumber}`, 400);
    return { item, partNumber, partDescription: link.partDescription, itemsPerPart: link.quantityPerPart };
  }

  /** Visualização prévia: balanço de itens, filamento e prazo. */
  async previewProduction(input: { partNumber: string; itemId: string; partQuantity: number }) {
    const { item, partNumber, itemsPerPart } = await this.loadItemForPartNumber(prisma, input.partNumber, input.itemId);
    const quantity = input.partQuantity * itemsPerPart;
    const job = calculatePrintJob(item, quantity);
    const filament = await filamentService.getAvailability(item.filamentId);
    const missingGrams = Math.max(0, job.grams - filament.availableGrams);
    const queue = await this.estimateQueue(job.minutes);

    return {
      partNumber,
      item: { id: item.id, code: item.code, name: item.name },
      partQuantity: input.partQuantity,
      itemsPerPart,
      quantity,
      prints: job.prints,
      gramsNeeded: job.grams,
      filament: {
        id: filament.id,
        label: filament.label,
        rigidityLabel: filament.rigidityLabel,
        colorHex: filament.colorHex,
        stockGrams: filament.stockGrams,
        committedGrams: filament.committedGrams,
        availableGrams: filament.availableGrams,
        almxCode: filament.almxCode,
        sufficient: missingGrams === 0,
        missingGrams,
      },
      estimate: queue,
    };
  }

  async createProduction(input: {
    partNumber: string;
    itemId: string;
    /** Peças (partnumber) pedidas; os itens a imprimir = peças × itens por peça. */
    partQuantity: number;
  } & RequesterData) {
    return prisma.$transaction(async (tx) => {
      const { item, partNumber, partDescription, itemsPerPart } = await this.loadItemForPartNumber(tx, input.partNumber, input.itemId);
      const quantity = input.partQuantity * itemsPerPart;
      const job = calculatePrintJob(item, quantity);
      const filament = await filamentService.getAvailability(item.filamentId, tx);
      const sufficient = filament.availableGrams >= job.grams;
      const status: Status = sufficient ? 'AGUARDANDO_IMPRESSAO' : 'AGUARDANDO_FILAMENTO';

      const request = await tx.printRequest.create({
        data: {
          trackingCode: await nextTrackingCode(tx),
          type: 'PRODUCAO',
          status,
          ...requesterColumns(input),
          partNumber,
          partDescription,
          itemId: item.id,
          filamentId: item.filamentId,
          quantity,
          partQuantity: input.partQuantity,
          itemsPerPart,
          estimatedGrams: job.grams,
          estimatedMinutes: job.minutes,
          history: {
            create: {
              toStatus: status,
              note: sufficient ? 'Solicitação criada' : 'Solicitação criada sem filamento suficiente em estoque',
            },
          },
        },
      });

      return {
        request,
        filament: {
          sufficient,
          almxCode: filament.almxCode,
          missingGrams: Math.max(0, job.grams - filament.availableGrams),
        },
      };
    });
  }

  // ───────────────────────────── Prototipagem ─────────────────────────────

  async createPrototype(input: RequesterData & {
    itemName: string;
    quantity: number;
    filamentId: string;
    description: string;
    /** Preenchido quando o protótipo vai virar item de produção (partnumber já validado na API). */
    partNumber: string | null;
    partDescription: string | null;
    files: StoredFile[];
  }) {
    return prisma.$transaction(async (tx) => {
      await filamentService.requireActive(input.filamentId, tx);
      return tx.printRequest.create({
        data: {
          trackingCode: await nextTrackingCode(tx),
          type: 'PROTOTIPAGEM',
          status: 'AGUARDANDO_IMPRESSAO',
          ...requesterColumns(input),
          itemName: input.itemName.trim(),
          description: input.description.trim(),
          filamentId: input.filamentId,
          partNumber: input.partNumber,
          partDescription: input.partDescription,
          quantity: input.quantity,
          attachments: { create: input.files },
          history: { create: { toStatus: 'AGUARDANDO_IMPRESSAO', note: 'Solicitação de prototipagem criada' } },
        },
      });
    });
  }

  // ───────────────────────────── Consulta ─────────────────────────────

  async getPublic(trackingCode: string) {
    const request = await prisma.printRequest.findUnique({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
      include: {
        item: { select: { code: true, name: true } },
        filament: { select: FILAMENT_SUMMARY_SELECT },
        history: { orderBy: { createdAt: 'asc' }, select: { toStatus: true, createdAt: true, note: true } },
      },
    });
    if (!request) throw new HttpError('Solicitação não encontrada', 404);

    const estimate =
      STATUSES_IN_QUEUE.includes(request.status) && request.estimatedMinutes != null
        ? await this.estimateQueue(request.estimatedMinutes, { excludeRequestId: request.id, before: request.createdAt })
        : null;

    let almxCode: string | null = null;
    if (request.status === 'AGUARDANDO_FILAMENTO') {
      almxCode = (await prisma.filament.findUnique({ where: { id: request.filamentId } }))?.almxCode ?? null;
    }

    return {
      trackingCode: request.trackingCode,
      type: request.type,
      status: request.status,
      requesterName: request.requesterName,
      itemName: request.itemName,
      partNumber: request.partNumber,
      item: request.item,
      filament: request.filament,
      quantity: request.quantity,
      partQuantity: request.partQuantity,
      itemsPerPart: request.itemsPerPart,
      createdAt: request.createdAt,
      startedAt: request.startedAt,
      finishedAt: request.finishedAt,
      history: request.history,
      estimate,
      almxCode,
    };
  }

  async list(filters: { status?: Status[] | undefined; type?: $Enums.RequestType | undefined; search?: string | undefined }) {
    const term = filters.search?.trim();
    const where: Prisma.PrintRequestWhereInput = {
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(term
        ? {
            OR: [
              { trackingCode: { contains: term, mode: 'insensitive' } },
              { requesterName: { contains: term, mode: 'insensitive' } },
              { partNumber: { contains: term, mode: 'insensitive' } },
              { itemName: { contains: term, mode: 'insensitive' } },
              { filament: { type: { contains: term, mode: 'insensitive' } } },
              { filament: { colorName: { contains: term, mode: 'insensitive' } } },
              { item: { code: { contains: term, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [requests, counts] = await Promise.all([
      prisma.printRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          item: { select: { id: true, code: true, name: true } },
          machine: { select: { id: true, name: true } },
          filament: { select: FILAMENT_SUMMARY_SELECT },
          _count: { select: { failures: true } },
        },
        take: 500,
      }),
      prisma.printRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      requests,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<Status, number>>,
    };
  }

  async getById(id: string) {
    const request = await prisma.printRequest.findUnique({ where: { id }, include: requestInclude });
    if (!request) throw new HttpError('Solicitação não encontrada', 404);
    const filament = await filamentService.getAvailability(request.filamentId);
    return { request, filament };
  }

  async getAttachment(requestId: string, attachmentId: string) {
    const attachment = await prisma.requestAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.requestId !== requestId) throw new HttpError('Arquivo não encontrado', 404);
    return attachment;
  }

  // ───────────────────────────── Operação ─────────────────────────────

  /**
   * Prototipagem: a equipe informa gramas e minutos de UMA peça; os totais da solicitação
   * (usados no prazo da fila, no estoque comprometido e no débito ao imprimir) = por peça × quantidade.
   */
  async updateEstimate(id: string, input: { gramsPerUnit?: number | undefined; minutesPerUnit?: number | undefined }) {
    const request = await prisma.printRequest.findUnique({ where: { id } });
    if (!request) throw new HttpError('Solicitação não encontrada', 404);
    if (request.status === 'FINALIZADO' || request.status === 'CANCELADO') {
      throw new HttpError('Solicitação encerrada não pode ser alterada', 409);
    }
    return prisma.printRequest.update({
      where: { id },
      data: {
        ...(input.gramsPerUnit !== undefined
          ? { estimatedGramsPerUnit: input.gramsPerUnit, estimatedGrams: input.gramsPerUnit * request.quantity }
          : {}),
        ...(input.minutesPerUnit !== undefined
          ? { estimatedMinutesPerUnit: input.minutesPerUnit, estimatedMinutes: input.minutesPerUnit * request.quantity }
          : {}),
      },
    });
  }

  /**
   * Muda o status respeitando as regras:
   *  - EM_PROTOTIPAGEM (só prototipagem): equipe desenvolvendo o protótipo; ainda sem máquina e sem débito.
   *  - EM_IMPRESSAO exige máquina; na 1ª vez debita o filamento do estoque.
   *  - Ao sair de EM_IMPRESSAO a máquina volta para DISPONÍVEL.
   */
  async changeStatus(
    id: string,
    input: { status: Status; machineId?: string | null | undefined; grams?: number | undefined; note?: string | null | undefined },
    userId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.printRequest.findUnique({ where: { id } });
      if (!request) throw new HttpError('Solicitação não encontrada', 404);

      const from = request.status;
      const to = input.status;
      if (from === to) throw new HttpError('A solicitação já está neste status', 400);
      const allowed = TRANSITIONS[request.type][from];
      const canTransition =
        to === 'AGUARDANDO_FILAMENTO' ? from !== 'AGUARDANDO_FILAMENTO' && allowed.includes('EM_IMPRESSAO') : allowed.includes(to);
      if (!canTransition) {
        throw new HttpError(`Não é possível ir de "${STATUS_LABELS[from]}" para "${STATUS_LABELS[to]}"`, 409);
      }

      const data: Prisma.PrintRequestUpdateInput = { status: to };
      let note = input.note?.trim() || null;

      // Sai da máquina
      if (from === 'EM_IMPRESSAO') {
        await this.closeRun(tx, request.id, to);
        if (request.machineId) await this.releaseMachine(tx, request.machineId, request.id);
      }

      if (to === 'EM_IMPRESSAO') {
        const machineId = input.machineId ?? request.machineId;
        if (!machineId) throw new HttpError('Selecione a máquina para iniciar a impressão', 400);
        const machine = await tx.machine.findUnique({ where: { id: machineId } });
        if (!machine) throw new HttpError('Máquina não encontrada', 404);
        if (machine.status !== 'DISPONIVEL') {
          throw new HttpError(`A máquina ${machine.name} não está disponível (${machine.status})`, 409);
        }

        // Debita o filamento apenas na primeira entrada em impressão
        if (request.consumedGrams === 0) {
          const grams = input.grams ?? request.estimatedGrams ?? 0;
          if (grams <= 0) {
            throw new HttpError('Informe quantos gramas de filamento serão usados nesta impressão', 400);
          }
          const filament = await filamentService.requireFilament(tx, request.filamentId);
          if (filament.stockGrams < grams) {
            throw new HttpError(
              `Estoque insuficiente de ${filamentLabel(filament)}: necessário ${grams} g, em estoque ${filament.stockGrams} g. Abra ordem no almoxarifado (código ${filament.almxCode}).`,
              409,
            );
          }
          await filamentService.applyMovement(tx, {
            filamentId: filament.id,
            type: 'CONSUMO_IMPRESSAO',
            grams: -grams,
            note: `Impressão ${request.trackingCode}`,
            requestId: request.id,
            userId,
          });
          data.consumedGrams = grams;
          if (request.estimatedGrams == null) data.estimatedGrams = grams;
        }

        data.machine = { connect: { id: machineId } };
        if (!request.startedAt) data.startedAt = new Date();
        await tx.machine.update({ where: { id: machineId }, data: { status: 'IMPRIMINDO' } });
        await tx.machineRun.create({ data: { machineId, requestId: request.id, userId } });
        note = note ?? `Máquina ${machine.name}`;
      }

      if (to === 'FINALIZADO') data.finishedAt = new Date();

      const updated = await tx.printRequest.update({ where: { id }, data });
      await tx.requestStatusHistory.create({
        data: { requestId: id, fromStatus: from, toStatus: to, note, userId },
      });
      return updated;
    });
  }

  /** Registra uma falha de impressão e debita o material perdido. */
  async addFailure(
    id: string,
    input: {
      lostGrams: number;
      reason: string;
      processMinutes?: number | null | undefined;
      machineId?: string | null | undefined;
      markAsFailed?: boolean | undefined;
    },
    userId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.printRequest.findUnique({ where: { id } });
      if (!request) throw new HttpError('Solicitação não encontrada', 404);
      if (request.status !== 'EM_IMPRESSAO') {
        throw new HttpError('Falhas só podem ser registradas enquanto a solicitação está em impressão', 409);
      }

      const machineId = input.machineId ?? request.machineId ?? null;
      const failure = await tx.printFailure.create({
        data: {
          requestId: id,
          machineId,
          userId,
          lostGrams: input.lostGrams,
          processMinutes: input.processMinutes ?? null,
          reason: input.reason.trim(),
        },
      });

      if (input.lostGrams > 0) {
        const filament = await filamentService.requireFilament(tx, request.filamentId);
        await filamentService.applyMovement(tx, {
          filamentId: filament.id,
          type: 'PERDA_FALHA',
          grams: -input.lostGrams,
          note: `Falha em ${request.trackingCode}: ${input.reason.trim()}`.slice(0, 500),
          requestId: id,
          userId,
        });
      }

      if ((input.markAsFailed ?? true) && request.status === 'EM_IMPRESSAO') {
        await this.closeRun(tx, request.id, 'FALHA_IMPRESSAO');
        if (request.machineId) await this.releaseMachine(tx, request.machineId, request.id);
        await tx.printRequest.update({ where: { id }, data: { status: 'FALHA_IMPRESSAO' } });
        await tx.requestStatusHistory.create({
          data: {
            requestId: id,
            fromStatus: request.status,
            toStatus: 'FALHA_IMPRESSAO',
            note:
              `Falha registrada (${input.lostGrams} g perdidos` +
              (input.processMinutes != null ? `, ${input.processMinutes} min de processo)` : ')'),
            userId,
          },
        });
      }

      return failure;
    });
  }

  /** Encerra o período em aberto da solicitação na máquina, guardando com que status ela saiu. */
  private async closeRun(tx: Tx, requestId: string, outcome: Status) {
    await tx.machineRun.updateMany({ where: { requestId, endedAt: null }, data: { endedAt: new Date(), outcome } });
  }

  private async releaseMachine(tx: Tx, machineId: string, requestId: string) {
    const others = await tx.printRequest.count({
      where: { machineId, status: 'EM_IMPRESSAO', id: { not: requestId } },
    });
    if (others === 0) {
      await tx.machine.updateMany({
        where: { id: machineId, status: 'IMPRIMINDO' },
        data: { status: 'DISPONIVEL' },
      });
    }
  }
}
