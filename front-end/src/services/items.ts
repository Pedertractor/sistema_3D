import type { FilamentSummary } from '@/types/domain';
import api from '@/utils/axiosConfig';

export interface ItemPartNumber {
  id: string;
  partNumber: string;
  partDescription: string | null;
  /** Quantos deste item vão em uma peça do partnumber. */
  quantityPerPart: number;
}

export interface PartNumberLinkInput {
  partNumber: string;
  quantityPerPart: number;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  filamentId: string;
  filament: FilamentSummary;
  gramsPerUnit: number;
  printMinutesPerUnit: number;
  unitsPerPrint: number;
  active: boolean;
  createdAt: string;
  partNumbers: ItemPartNumber[];
  originRequest: { id: string; trackingCode: string } | null;
}

/** O código não vai no cadastro: o servidor gera (ITM-00001...) e ele não muda depois. */
export interface ItemInput {
  name: string;
  description?: string | null;
  filamentId: string;
  gramsPerUnit: number;
  printMinutesPerUnit: number;
  unitsPerPrint: number;
  active?: boolean;
}

export const itemsApi = {
  async list(search?: string) {
    const { data } = await api.get<{ items: Item[] }>('/items', { params: { search: search || undefined } });
    return data.items;
  },
  /** Prévia do código que o próximo item vai receber. */
  async nextCode() {
    const { data } = await api.get<{ code: string }>('/items/next-code');
    return data.code;
  },
  async create(input: ItemInput & { partNumbers: PartNumberLinkInput[]; originRequestId?: string | null }) {
    const { data } = await api.post<{ item: Item }>('/items', input);
    return data.item;
  },
  async update(id: string, input: Partial<ItemInput>) {
    const { data } = await api.patch<{ item: Item }>(`/items/${id}`, input);
    return data.item;
  },
  async addPartNumber(id: string, link: PartNumberLinkInput) {
    const { data } = await api.post<{ item: Item }>(`/items/${id}/part-numbers`, link);
    return data.item;
  },
  async updatePartNumber(id: string, linkId: string, quantityPerPart: number) {
    const { data } = await api.patch<{ item: Item }>(`/items/${id}/part-numbers/${linkId}`, { quantityPerPart });
    return data.item;
  },
  async removePartNumber(id: string, linkId: string) {
    const { data } = await api.delete<{ item: Item }>(`/items/${id}/part-numbers/${linkId}`);
    return data.item;
  },
};
