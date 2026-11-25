import type { FilamentSummary, MachineStatus, RequestStatus, RequestType } from '@/types/domain';
import type { FilamentAvailability } from '@/services/filaments';
import type { Unit } from '@/types/auth';
import api from '@/utils/axiosConfig';

export interface QueueEstimate {
  requestMinutes: number;
  queueMinutes: number;
  productiveMachines: number;
  totalMinutes: number | null;
  estimatedCompletionAt: string | null;
}

export interface RequestListItem {
  id: string;
  trackingCode: string;
  type: RequestType;
  status: RequestStatus;
  requesterName: string;
  requesterSector: string | null;
  requesterCardNumber: string | null;
  requesterUnit: Unit | null;
  requesterCostCenter: string | null;
  itemName: string | null;
  partNumber: string | null;
  filamentId: string;
  filament: FilamentSummary;
  /** Itens a imprimir. Produção: partQuantity × itemsPerPart. */
  quantity: number;
  partQuantity: number | null;
  itemsPerPart: number | null;
  estimatedGrams: number | null;
  estimatedMinutes: number | null;
  /** Prototipagem: estimativa de UMA peça (os totais acima = por peça × quantidade). */
  estimatedGramsPerUnit: number | null;
  estimatedMinutesPerUnit: number | null;
  consumedGrams: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  item: { id: string; code: string; name: string } | null;
  machine: { id: string; name: string } | null;
  _count: { failures: number };
}

export interface RequestDetail extends Omit<RequestListItem, '_count' | 'machine' | 'item'> {
  requesterEmail: string | null;
  description: string | null;
  partDescription: string | null;
  item: {
    id: string;
    code: string;
    name: string;
    gramsPerUnit: number;
    printMinutesPerUnit: number;
    unitsPerPrint: number;
  } | null;
  machine: { id: string; name: string; status: MachineStatus } | null;
  createdItem: { id: string; code: string; name: string } | null;
  attachments: { id: string; originalName: string; mimeType: string; sizeBytes: number; createdAt: string }[];
  failures: {
    id: string;
    lostGrams: number;
    processMinutes: number | null;
    reason: string;
    createdAt: string;
    machine: { id: string; name: string } | null;
    user: { id: string; name: string } | null;
  }[];
  history: {
    id: string;
    fromStatus: RequestStatus | null;
    toStatus: RequestStatus;
    note: string | null;
    createdAt: string;
    user: { id: string; name: string } | null;
  }[];
}

export const requestsApi = {
  async list(params: { status?: RequestStatus[]; type?: RequestType; search?: string }) {
    const { data } = await api.get<{ requests: RequestListItem[]; counts: Partial<Record<RequestStatus, number>> }>(
      '/requests',
      {
        params: {
          status: params.status?.length ? params.status.join(',') : undefined,
          type: params.type,
          search: params.search || undefined,
        },
      },
    );
    return data;
  },
  async queueEstimate() {
    const { data } = await api.get<{ estimate: QueueEstimate }>('/requests/queue-estimate');
    return data.estimate;
  },
  async get(id: string) {
    const { data } = await api.get<{ request: RequestDetail; filament: FilamentAvailability }>(`/requests/${id}`);
    return data;
  },
  async changeStatus(
    id: string,
    input: { status: RequestStatus; machineId?: string | null; grams?: number; note?: string | null },
  ) {
    const { data } = await api.patch(`/requests/${id}/status`, input);
    return data;
  },
  /** Estimativa por peça; o servidor calcula os totais pela quantidade. */
  async updateEstimate(id: string, input: { gramsPerUnit?: number; minutesPerUnit?: number }) {
    const { data } = await api.patch(`/requests/${id}/estimate`, input);
    return data;
  },
  async addFailure(
    id: string,
    input: {
      lostGrams: number;
      reason: string;
      processMinutes?: number | null;
      machineId?: string | null;
      markAsFailed?: boolean;
    },
  ) {
    const { data } = await api.post(`/requests/${id}/failures`, input);
    return data;
  },
  async downloadAttachment(id: string, attachment: { id: string; originalName: string }) {
    const { data } = await api.get<Blob>(`/requests/${id}/attachments/${attachment.id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalName;
    link.click();
    URL.revokeObjectURL(url);
  },
};
