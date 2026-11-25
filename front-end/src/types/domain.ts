export type FilamentRigidity = 'RIGIDO' | 'MALEAVEL';

export const FILAMENT_RIGIDITY_LABELS: Record<FilamentRigidity, string> = {
  RIGIDO: 'Rígido',
  MALEAVEL: 'Maleável',
};

/** Sugestões para o campo tipo (o operador pode digitar outro). */
export const FILAMENT_TYPE_SUGGESTIONS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'PC'];

/** Dados do filamento que acompanham itens e solicitações. */
export interface FilamentSummary {
  id: string;
  type: string;
  colorName: string;
  colorHex: string;
  rigidity: FilamentRigidity;
  imageStoredName: string | null;
  updatedAt: string;
}

/** Ex.: "PLA Preto" */
export function filamentLabel(filament: Pick<FilamentSummary, 'type' | 'colorName'>): string {
  return `${filament.type} ${filament.colorName}`;
}

export const REQUEST_STATUSES = [
  'AGUARDANDO_IMPRESSAO',
  'EM_PROTOTIPAGEM',
  'EM_IMPRESSAO',
  'FALHA_IMPRESSAO',
  'PAUSADO',
  'FINALIZADO',
  'AGUARDANDO_FILAMENTO',
  'CANCELADO',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type RequestType = 'PROTOTIPAGEM' | 'PRODUCAO';

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  PROTOTIPAGEM: 'Prototipagem',
  PRODUCAO: 'Produção',
};

export function requestStatusLabel(status: RequestStatus, type?: RequestType): string {
  switch (status) {
    case 'AGUARDANDO_IMPRESSAO':
      return type === 'PROTOTIPAGEM' ? 'Aguardando prototipagem' : 'Aguardando impressão';
    case 'EM_PROTOTIPAGEM':
      return 'Prototipando';
    case 'EM_IMPRESSAO':
      return 'Imprimindo';
    case 'FALHA_IMPRESSAO':
      return 'Falha na impressão';
    case 'PAUSADO':
      return 'Pausado';
    case 'FINALIZADO':
      return 'Finalizado';
    case 'AGUARDANDO_FILAMENTO':
      return 'Aguardando filamento';
    case 'CANCELADO':
      return 'Cancelado';
  }
}

/**
 * Transições permitidas por tipo. Mesmas regras do back-end (request-service TRANSITIONS).
 * Prototipagem: aguardando → prototipando → imprimindo → finalizado.
 */
const TRANSITIONS: Record<RequestType, Record<RequestStatus, RequestStatus[]>> = {
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

export function allowedTransitions(type: RequestType, status: RequestStatus): RequestStatus[] {
  return TRANSITIONS[type][status];
}

/** O "próximo passo" natural (botão em destaque): prototipar → imprimir → finalizar. */
export function primaryTransition(transitions: RequestStatus[]): RequestStatus | undefined {
  return (['EM_PROTOTIPAGEM', 'EM_IMPRESSAO', 'FINALIZADO'] as RequestStatus[]).find((s) => transitions.includes(s));
}

export const MACHINE_STATUSES = ['DISPONIVEL', 'IMPRIMINDO', 'MANUTENCAO', 'INATIVA'] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  DISPONIVEL: 'Disponível',
  IMPRIMINDO: 'Imprimindo',
  MANUTENCAO: 'Manutenção',
  INATIVA: 'Inativa',
};

export type FilamentMovementType =
  | 'ESTOQUE_INICIAL'
  | 'ENTRADA'
  | 'CONSUMO_IMPRESSAO'
  | 'PERDA_FALHA'
  | 'ESTORNO'
  | 'AJUSTE';

export const MOVEMENT_TYPE_LABELS: Record<FilamentMovementType, string> = {
  ESTOQUE_INICIAL: 'Estoque inicial',
  ENTRADA: 'Entrada',
  CONSUMO_IMPRESSAO: 'Consumo (impressão)',
  PERDA_FALHA: 'Perda (falha)',
  ESTORNO: 'Estorno',
  AJUSTE: 'Ajuste',
};
