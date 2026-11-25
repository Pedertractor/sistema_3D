import type { FilamentSummary, MachineStatus, RequestStatus, RequestType } from '@/types/domain';
import api from '@/utils/axiosConfig';

export interface Machine {
  id: string;
  name: string;
  model: string | null;
  notes: string | null;
  status: MachineStatus;
  imageStoredName: string | null;
  createdAt: string;
  updatedAt: string;
  requests: {
    id: string;
    trackingCode: string;
    type: RequestType;
    startedAt: string | null;
    estimatedMinutes: number | null;
  }[];
  /** Processos em andamento na máquina (início do período atual de cada solicitação). */
  runs?: { requestId: string; startedAt: string }[];
}

/** Um período em que uma solicitação ocupou a máquina (entrou em impressão até sair dela). */
export interface MachineRun {
  id: string;
  startedAt: string;
  /** Nulo enquanto ainda está imprimindo. */
  endedAt: string | null;
  /** Status com que a solicitação saiu da máquina. */
  outcome: RequestStatus | null;
  minutes: number;
  user: { id: string; name: string } | null;
  request: {
    id: string;
    trackingCode: string;
    type: RequestType;
    status: RequestStatus;
    quantity: number;
    itemName: string | null;
    estimatedMinutes: number | null;
    requesterName: string;
    item: { code: string; name: string } | null;
    filament: FilamentSummary;
  };
}

export interface MachineHistory {
  machine: Omit<Machine, 'requests'>;
  stats: {
    operatingMinutes: number;
    runs: number;
    requests: number;
    finishedRuns: number;
    finishedPieces: number;
    failures: number;
    lostGrams: number;
    averageRunMinutes: number;
    firstRunAt: string | null;
    lastRunAt: string | null;
  };
  runs: MachineRun[];
  failures: {
    id: string;
    lostGrams: number;
    processMinutes: number | null;
    reason: string;
    createdAt: string;
    user: { id: string; name: string } | null;
    request: { id: string; trackingCode: string };
  }[];
}

export interface MachineInput {
  name?: string;
  model?: string | null;
  notes?: string | null;
  status?: MachineStatus;
}

export const machinesApi = {
  async list() {
    const { data } = await api.get<{ machines: Machine[] }>('/machines');
    return data.machines;
  },
  async history(id: string) {
    const { data } = await api.get<MachineHistory>(`/machines/${id}/history`);
    return data;
  },
  async create(input: MachineInput & { name: string }) {
    const { data } = await api.post<{ machine: Machine }>('/machines', input);
    return data.machine;
  },
  async update(id: string, input: MachineInput) {
    const { data } = await api.patch<{ machine: Machine }>(`/machines/${id}`, input);
    return data.machine;
  },
  async uploadImage(id: string, file: File) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.put<{ machine: Machine }>(`/machines/${id}/image`, form);
    return data.machine;
  },
  async removeImage(id: string) {
    const { data } = await api.delete<{ machine: Machine }>(`/machines/${id}/image`);
    return data.machine;
  },
  /** A rota exige token, então a imagem é baixada como blob. `version` evita servir a foto antiga do cache. */
  async getImage(id: string, version: string) {
    const { data } = await api.get<Blob>(`/machines/${id}/image`, { params: { v: version }, responseType: 'blob' });
    return data;
  },
};
