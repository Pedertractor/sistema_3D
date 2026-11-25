import { $Enums } from '../generated/prisma/client.js';

export const FILAMENT_RIGIDITY_LABELS: Record<$Enums.FilamentRigidity, string> = {
  RIGIDO: 'Rígido',
  MALEAVEL: 'Maleável',
};

/** Nome de exibição do filamento, ex.: "PLA Preto". */
export function filamentLabel(filament: { type: string; colorName: string }): string {
  return `${filament.type} ${filament.colorName}`;
}

/** Campos do filamento devolvidos junto com itens e solicitações. */
export const FILAMENT_SUMMARY_SELECT = {
  id: true,
  type: true,
  colorName: true,
  colorHex: true,
  rigidity: true,
  imageStoredName: true,
  updatedAt: true,
} as const;

/** Status em que a solicitação ainda NÃO debitou filamento, mas vai precisar. */
export const STATUSES_PENDING_CONSUMPTION: $Enums.RequestStatus[] = [
  $Enums.RequestStatus.AGUARDANDO_IMPRESSAO,
  $Enums.RequestStatus.EM_PROTOTIPAGEM,
  $Enums.RequestStatus.AGUARDANDO_FILAMENTO,
];

/** Status que ocupam a fila (entram no cálculo de prazo). */
export const STATUSES_IN_QUEUE: $Enums.RequestStatus[] = [
  $Enums.RequestStatus.AGUARDANDO_IMPRESSAO,
  $Enums.RequestStatus.EM_PROTOTIPAGEM,
  $Enums.RequestStatus.AGUARDANDO_FILAMENTO,
  $Enums.RequestStatus.EM_IMPRESSAO,
  $Enums.RequestStatus.PAUSADO,
  $Enums.RequestStatus.FALHA_IMPRESSAO,
];

/** Máquinas que contam como capacidade produtiva. */
export const PRODUCTIVE_MACHINE_STATUSES: $Enums.MachineStatus[] = [
  $Enums.MachineStatus.DISPONIVEL,
  $Enums.MachineStatus.IMPRIMINDO,
];
