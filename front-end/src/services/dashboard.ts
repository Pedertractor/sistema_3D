import type { FilamentSummary, MachineStatus, RequestStatus, RequestType } from '@/types/domain';
import api from '@/utils/axiosConfig';

/** Processo (período de uma solicitação na máquina) recortado ao período consultado. */
export interface ProductionRun {
  id: string;
  machineId: string;
  requestId: string;
  startedAt: string;
  endedAt: string | null;
  outcome: RequestStatus | null;
  /** Início/fim dentro do período consultado. */
  clippedStart: string;
  clippedEnd: string;
  /** Minutos dentro do período consultado. */
  minutes: number;
  user: { id: string; name: string } | null;
  request: {
    id: string;
    trackingCode: string;
    type: RequestType;
    quantity: number;
    itemName: string | null;
    item: { code: string; name: string } | null;
    filament: FilamentSummary;
  };
}

export interface ProductionDashboard {
  from: string;
  to: string;
  generatedAt: string;
  machines: { id: string; name: string; model: string | null; status: MachineStatus }[];
  runs: ProductionRun[];
  failures: { id: string; lostGrams: number; machineId: string | null }[];
}

export const dashboardApi = {
  async production(from: Date, to: Date) {
    const { data } = await api.get<ProductionDashboard>('/dashboard/production', {
      params: { from: from.toISOString(), to: to.toISOString() },
    });
    return data;
  },
};
