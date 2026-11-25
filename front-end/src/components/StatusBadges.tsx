import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MACHINE_STATUS_LABELS,
  requestStatusLabel,
  type MachineStatus,
  type RequestStatus,
  type RequestType,
} from '@/types/domain';

const REQUEST_STATUS_CLASS: Record<RequestStatus, string> = {
  AGUARDANDO_IMPRESSAO: 'border-sky-200 bg-sky-50 text-sky-800',
  EM_PROTOTIPAGEM: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
  EM_IMPRESSAO: 'border-violet-200 bg-violet-50 text-violet-800',
  FALHA_IMPRESSAO: 'border-red-200 bg-red-50 text-red-800',
  PAUSADO: 'border-amber-200 bg-amber-50 text-amber-800',
  FINALIZADO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  AGUARDANDO_FILAMENTO: 'border-orange-200 bg-orange-50 text-orange-800',
  CANCELADO: 'border-border bg-muted text-muted-foreground',
};

export function RequestStatusBadge({ status, type }: { status: RequestStatus; type?: RequestType }) {
  return (
    <Badge variant='outline' className={cn('font-normal', REQUEST_STATUS_CLASS[status])}>
      {requestStatusLabel(status, type)}
    </Badge>
  );
}

const MACHINE_STATUS_CLASS: Record<MachineStatus, string> = {
  DISPONIVEL: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  IMPRIMINDO: 'border-violet-200 bg-violet-50 text-violet-800',
  MANUTENCAO: 'border-amber-200 bg-amber-50 text-amber-800',
  INATIVA: 'border-border bg-muted text-muted-foreground',
};

export function MachineStatusBadge({ status }: { status: MachineStatus }) {
  return (
    <Badge variant='outline' className={cn('font-normal', MACHINE_STATUS_CLASS[status])}>
      {MACHINE_STATUS_LABELS[status]}
    </Badge>
  );
}
