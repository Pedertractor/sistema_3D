import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { nextItemCode } from '../lib/item-code.js';
import { ApiPedertractorPart } from '../integrations/api-pedertractor-part.js';
import { prisma } from '../lib/prisma.js';
import { ItemPrismaRepository, itemInclude } from '../repositories/prisma/item-repository.js';
import { FilamentService } from './filament-service.js';
import { normalizePartNumber } from './part-service.js';

const repo = () => new ItemPrismaRepository(prisma);

export interface ItemInput {
  name: string;
  description?: string | null | undefined;
  filamentId: string;
  gramsPerUnit: number;
  printMinutesPerUnit: number;
  unitsPerPrint: number;
  active?: boolean | undefined;
}

/** Partnumber vinculado ao item e quantos itens vão em uma peça dele. */
export interface PartNumberLinkInput {
  partNumber: string;
  quantityPerPart: number;
}

export class ItemService {
  list(search?: string) {
    return repo().list(search);
  }

  async getById(id: string) {
    const item = await repo().findById(id);
    if (!item) throw new HttpError('Item não encontrado', 404);
    return item;
  }

  /**
   * Cria um item (manual ou a partir de uma prototipagem finalizada) com seus partnumbers.
   * O código é gerado aqui (ITM-00001...), nunca informado pelo usuário.
   */
  async create(input: ItemInput & { partNumbers: PartNumberLinkInput[]; originRequestId?: string | null | undefined }) {
    if (input.originRequestId) {
      const origin = await prisma.printRequest.findUnique({
        where: { id: input.originRequestId },
        include: { createdItem: true },
      });
      if (!origin || origin.type !== 'PROTOTIPAGEM') {
        throw new HttpError('Solicitação de prototipagem de origem não encontrada', 404);
      }
      if (origin.status !== 'FINALIZADO') {
        throw new HttpError('A prototipagem precisa estar finalizada para registrar o item', 409);
      }
      if (origin.createdItem) {
        throw new HttpError(`Esta prototipagem já gerou o item ${origin.createdItem.code}`, 409);
      }
    }

    await new FilamentService().requireActive(input.filamentId);
    const validated = await this.validatePartNumbers(input.partNumbers);

    // Dois cadastros ao mesmo tempo podem calcular o mesmo número: o índice único do código
    // recusa o segundo, que tenta de novo com o número seguinte.
    for (let attempt = 0; ; attempt++) {
      const code = await nextItemCode(prisma);
      try {
        return await prisma.item.create({
          data: {
            code,
            name: input.name.trim(),
            description: input.description ?? null,
            filamentId: input.filamentId,
            gramsPerUnit: input.gramsPerUnit,
            printMinutesPerUnit: input.printMinutesPerUnit,
            unitsPerPrint: input.unitsPerPrint,
            active: input.active ?? true,
            originRequestId: input.originRequestId ?? null,
            partNumbers: { create: validated },
          },
          include: itemInclude,
        });
      } catch (error) {
        const codeTaken =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          JSON.stringify(error.meta ?? {}).includes('code');
        if (!codeTaken || attempt >= 4) throw error;
      }
    }
  }

  async update(id: string, input: { [K in keyof ItemInput]?: ItemInput[K] | undefined }) {
    const item = await this.getById(id);
    if (input.filamentId !== undefined && input.filamentId !== item.filamentId) {
      await new FilamentService().requireActive(input.filamentId);
    }
    return prisma.item.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.filamentId !== undefined ? { filamentId: input.filamentId } : {}),
        ...(input.gramsPerUnit !== undefined ? { gramsPerUnit: input.gramsPerUnit } : {}),
        ...(input.printMinutesPerUnit !== undefined ? { printMinutesPerUnit: input.printMinutesPerUnit } : {}),
        ...(input.unitsPerPrint !== undefined ? { unitsPerPrint: input.unitsPerPrint } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: itemInclude,
    });
  }

  async addPartNumber(itemId: string, link: PartNumberLinkInput) {
    await this.getById(itemId);
    const [validated] = await this.validatePartNumbers([link]);
    const existing = await prisma.itemPartNumber.findUnique({
      where: { itemId_partNumber: { itemId, partNumber: validated!.partNumber } },
    });
    if (existing) throw new HttpError('Partnumber já vinculado a este item', 409);
    await prisma.itemPartNumber.create({ data: { itemId, ...validated! } });
    return this.getById(itemId);
  }

  /** Altera quantos itens vão em uma peça do partnumber vinculado. */
  async updatePartNumber(itemId: string, linkId: string, quantityPerPart: number) {
    const link = await prisma.itemPartNumber.findUnique({ where: { id: linkId } });
    if (!link || link.itemId !== itemId) throw new HttpError('Vínculo não encontrado', 404);
    await prisma.itemPartNumber.update({ where: { id: linkId }, data: { quantityPerPart } });
    return this.getById(itemId);
  }

  async removePartNumber(itemId: string, linkId: string) {
    const link = await prisma.itemPartNumber.findUnique({ where: { id: linkId } });
    if (!link || link.itemId !== itemId) throw new HttpError('Vínculo não encontrado', 404);
    await prisma.itemPartNumber.delete({ where: { id: linkId } });
    return this.getById(itemId);
  }

  /** Valida cada partnumber na API corporativa e remove duplicados (fica a última quantidade informada). */
  private async validatePartNumbers(raw: PartNumberLinkInput[]) {
    const unique = new Map<string, number>();
    for (const link of raw) {
      const partNumber = normalizePartNumber(link.partNumber);
      if (partNumber) unique.set(partNumber, link.quantityPerPart);
    }
    const api = new ApiPedertractorPart();
    const result: { partNumber: string; partDescription: string | null; quantityPerPart: number }[] = [];
    for (const [partNumber, quantityPerPart] of unique) {
      try {
        const part = await api.getByPartNumber(partNumber);
        result.push({ partNumber: normalizePartNumber(part.partNumber), partDescription: part.description, quantityPerPart });
      } catch (error) {
        if (error instanceof HttpError) {
          throw new HttpError(`Partnumber ${partNumber}: ${error.message}`, error.statusCode);
        }
        throw error;
      }
    }
    return result;
  }
}
