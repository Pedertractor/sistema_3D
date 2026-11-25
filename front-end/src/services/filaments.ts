import type { FilamentMovementType, FilamentRigidity, FilamentSummary } from '@/types/domain';
import api from '@/utils/axiosConfig';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3150';

export interface FilamentAvailability extends FilamentSummary {
  /** Ex.: "PLA Preto" */
  label: string;
  rigidityLabel: string;
  almxCode: string;
  active: boolean;
  stockGrams: number;
  committedGrams: number;
  availableGrams: number;
  minStockGrams: number;
}

export interface FilamentInput {
  type: string;
  colorName: string;
  colorHex: string;
  rigidity: FilamentRigidity;
  almxCode: string;
  minStockGrams?: number;
}

export interface FilamentMovement {
  id: string;
  type: FilamentMovementType;
  grams: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
  request: { id: string; trackingCode: string } | null;
}

/** A foto do filamento é pública (o solicitante também vê); `updatedAt` evita servir a foto antiga do cache. */
export function filamentImageUrl(filament: Pick<FilamentSummary, 'id' | 'imageStoredName' | 'updatedAt'>) {
  if (!filament.imageStoredName) return null;
  return `${apiUrl}/api/public/filaments/${filament.id}/image?v=${encodeURIComponent(filament.updatedAt)}`;
}

export const filamentsApi = {
  async list(options: { activeOnly?: boolean } = {}) {
    const { data } = await api.get<{ filaments: FilamentAvailability[] }>('/filaments', {
      params: options.activeOnly ? { active: 'true' } : undefined,
    });
    return data.filaments;
  },
  async create(input: FilamentInput & { initialStockGrams?: number }) {
    const { data } = await api.post<{ filament: FilamentSummary }>('/filaments', input);
    return data.filament;
  },
  async update(id: string, input: Partial<FilamentInput> & { active?: boolean }) {
    const { data } = await api.patch<{ filament: FilamentSummary }>(`/filaments/${id}`, input);
    return data.filament;
  },
  async uploadImage(id: string, file: File) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.put<{ filament: FilamentSummary }>(`/filaments/${id}/image`, form);
    return data.filament;
  },
  async removeImage(id: string) {
    const { data } = await api.delete<{ filament: FilamentSummary }>(`/filaments/${id}/image`);
    return data.filament;
  },
  async addMovement(
    filamentId: string,
    input: { type: 'ESTOQUE_INICIAL' | 'ENTRADA' | 'AJUSTE'; grams: number; note?: string | null },
  ) {
    const { data } = await api.post<{ released: string[] }>(`/filaments/${filamentId}/movements`, input);
    return data;
  },
  async movements(filamentId: string) {
    const { data } = await api.get<{ movements: FilamentMovement[] }>(`/filaments/${filamentId}/movements`);
    return data.movements;
  },
};
