import type { FilamentRigidity, FilamentSummary, RequestStatus, RequestType } from '@/types/domain';
import type { QueueEstimate } from '@/services/requests';
import type { Unit } from '@/types/auth';
import api from '@/utils/axiosConfig';

export interface PublicItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  filament: FilamentSummary;
  gramsPerUnit: number;
  printMinutesPerUnit: number;
  unitsPerPrint: number;
  /** Quantos deste item vão em uma peça do partnumber consultado. */
  itemsPerPart: number;
}

/** Desenho da peça na base da Pedertractor (o arquivo é servido pelo nosso back-end). */
export interface PartDrawing {
  index: number;
  name: string;
}

export interface PartLookup {
  part: { partNumber: string; partCode: string | null; description: string | null; drawings: PartDrawing[] };
  items: PublicItem[];
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3150';

export function partDrawingUrl(partNumber: string, index: number) {
  return `${apiUrl}/api/public/parts/${encodeURIComponent(partNumber)}/drawings/${index}`;
}

export interface ProductionPreview {
  partNumber: string;
  item: { id: string; code: string; name: string };
  /** Peças pedidas × itens por peça = itens a produzir (quantity). */
  partQuantity: number;
  itemsPerPart: number;
  quantity: number;
  prints: number;
  gramsNeeded: number;
  filament: {
    id: string;
    label: string;
    rigidityLabel: string;
    colorHex: string;
    stockGrams: number;
    committedGrams: number;
    availableGrams: number;
    almxCode: string | null;
    sufficient: boolean;
    missingGrams: number;
  };
  estimate: QueueEstimate;
}

/** Filamento ativo como o solicitante vê (sem estoque). */
export interface PublicFilament extends FilamentSummary {
  label: string;
  rigidity: FilamentRigidity;
  rigidityLabel: string;
}

/** Solicitante identificado pelo cartão + unidade; o servidor confere de novo na API ao criar. */
export interface Requester {
  requesterCardNumber: string;
  requesterUnit: Unit;
  requesterEmail?: string | null;
}

/** Colaborador encontrado na API corporativa. */
export interface RequesterIdentity {
  cardNumber: string;
  unit: Unit;
  name: string;
  sectorName: string | null;
  costCenter: string | null;
}

export interface PublicTracking {
  trackingCode: string;
  type: RequestType;
  status: RequestStatus;
  requesterName: string;
  itemName: string | null;
  partNumber: string | null;
  item: { code: string; name: string } | null;
  filament: FilamentSummary;
  quantity: number;
  partQuantity: number | null;
  itemsPerPart: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  history: { toStatus: RequestStatus; createdAt: string; note: string | null }[];
  estimate: QueueEstimate | null;
  almxCode: string | null;
}

export const publicApi = {
  async identifyRequester(unit: Unit, cardNumber: string) {
    const { data } = await api.get<{ employee: RequesterIdentity }>(
      `/public/employees/${unit}/${encodeURIComponent(cardNumber.trim())}`,
      { skipErrorToast: true },
    );
    return data.employee;
  },
  async filaments() {
    const { data } = await api.get<{ filaments: PublicFilament[] }>('/public/filaments');
    return data.filaments;
  },
  async lookupPart(partNumber: string) {
    const { data } = await api.get<PartLookup>(`/public/parts/${encodeURIComponent(partNumber.trim())}`, {
      skipErrorToast: true,
    });
    return data;
  },
  async previewProduction(input: { partNumber: string; itemId: string; partQuantity: number }) {
    const { data } = await api.post<ProductionPreview>('/public/requests/production/preview', input);
    return data;
  },
  async createProduction(input: { partNumber: string; itemId: string; partQuantity: number } & Requester) {
    const { data } = await api.post<{
      trackingCode: string;
      status: RequestStatus;
      filament: { sufficient: boolean; almxCode: string | null; missingGrams: number };
    }>('/public/requests/production', input);
    return data;
  },
  async createPrototype(
    input: Requester & {
      itemName: string;
      quantity: number;
      rigidity: FilamentRigidity;
      colorName: string;
      /** Partnumber quando o protótipo vai virar item de produção. */
      partNumber: string | null;
      description: string;
    },
    files: File[],
  ) {
    const form = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value != null && value !== '') form.append(key, String(value));
    });
    files.forEach((file) => form.append('files', file));
    const { data } = await api.post<{ trackingCode: string; status: RequestStatus }>(
      '/public/requests/prototype',
      form,
    );
    return data;
  },
  async track(trackingCode: string) {
    const { data } = await api.get<PublicTracking>(`/public/requests/${encodeURIComponent(trackingCode)}`, {
      skipErrorToast: true,
    });
    return data;
  },
};
