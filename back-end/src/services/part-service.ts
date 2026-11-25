import { FILAMENT_SUMMARY_SELECT } from '../constants/filament.js';
import { HttpError } from '../https/errors/index.js';
import { ApiPedertractorPart } from '../integrations/api-pedertractor-part.js';
import { prisma } from '../lib/prisma.js';
import { calculatePrintJob } from '../lib/print-math.js';

export function normalizePartNumber(value: string) {
  return value.trim().toUpperCase();
}

export class PartService {
  /** Valida na API corporativa e lista os itens ativos vinculados ao partnumber. */
  async lookup(partNumberRaw: string) {
    const { images, ...part } = await new ApiPedertractorPart().getByPartNumber(partNumberRaw);
    const partNumber = normalizePartNumber(part.partNumber);

    const links = await prisma.itemPartNumber.findMany({
      where: { partNumber, item: { active: true } },
      include: { item: { include: { filament: { select: FILAMENT_SUMMARY_SELECT } } } },
      orderBy: { item: { code: 'asc' } },
    });

    return {
      // Só índice e nome dos desenhos: o caminho interno da API não sai do servidor.
      part: { ...part, partNumber, drawings: images.map((image, index) => ({ index, name: image.name })) },
      items: links.map(({ item, quantityPerPart }) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        filament: item.filament,
        gramsPerUnit: item.gramsPerUnit,
        printMinutesPerUnit: item.printMinutesPerUnit,
        unitsPerPrint: item.unitsPerPrint,
        /** Quantos deste item vão em uma peça deste partnumber. */
        itemsPerPart: quantityPerPart,
        perUnit: calculatePrintJob(item, 1),
      })),
    };
  }

  /** Desenho de índice informado, buscado de novo na API (o cliente nunca informa o caminho). */
  async drawing(partNumberRaw: string, index: number) {
    const api = new ApiPedertractorPart();
    const part = await api.getByPartNumber(partNumberRaw);
    const image = part.images[index];
    if (!image) throw new HttpError('Desenho não encontrado para esta peça', 404);
    return api.fetchDrawing(image);
  }
}
