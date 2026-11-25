import type { ReactNode } from 'react';
import { ArrowUpRight, CalendarClock, CalendarCheck, Clock, Hourglass, Package, User } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppDialogContent } from '@/components/AppDialogContent';
import { FilamentTag } from '@/components/FilamentDisplay';
import { RequestStatusBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime, formatGrams, formatMinutes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { requestDetailPath } from '@/routes/constants';
import type { MachineHistory, MachineRun } from '@/services/machines';
import { REQUEST_TYPE_LABELS } from '@/types/domain';

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className='flex items-start gap-3'>
      <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
        {icon}
      </span>
      <div className='min-w-0'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <div className='text-sm'>{children}</div>
      </div>
    </div>
  );
}

/** Detalhe de um processo da máquina: solicitação, horários, duração x estimativa, operador e falhas do período. */
export function RunDetailDialog({
  run,
  failures,
  onOpenChange,
}: {
  run: MachineRun;
  failures: MachineHistory['failures'];
  onOpenChange: (open: boolean) => void;
}) {
  const { request } = run;
  const estimate = request.estimatedMinutes;
  const diff = estimate && run.outcome === 'FINALIZADO' ? run.minutes - estimate : null;
  const itemName = request.item ? `${request.item.code} — ${request.item.name}` : request.itemName;

  // Falhas desta solicitação registradas durante este período na máquina.
  const start = new Date(run.startedAt).getTime();
  const end = run.endedAt ? new Date(run.endedAt).getTime() + 1000 : Number.POSITIVE_INFINITY;
  const runFailures = failures.filter((f) => {
    const at = new Date(f.createdAt).getTime();
    return f.request.id === request.id && at >= start && at <= end;
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <AppDialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex flex-wrap items-center gap-2'>
            <span className='font-mono'>{request.trackingCode}</span>
            {run.outcome ? (
              <RequestStatusBadge status={run.outcome} type={request.type} />
            ) : (
              <Badge variant='outline' className='font-normal'>
                Em andamento
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {REQUEST_TYPE_LABELS[request.type]}
            {itemName ? ` · ${itemName}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Duração em destaque, comparada à estimativa. */}
        <div className='flex items-end justify-between gap-4 rounded-2xl bg-foreground p-4 text-background'>
          <div>
            <p className='text-xs text-background/60'>Duração do processo</p>
            <p className='text-3xl font-extrabold tracking-[-0.03em] tabular-nums'>
              {run.minutes > 0 ? formatMinutes(run.minutes) : '< 1 min'}
            </p>
          </div>
          {estimate ? (
            <div className='text-right text-xs text-background/70'>
              <p className='inline-flex items-center gap-1'>
                <Hourglass className='size-3.5' /> est. {formatMinutes(estimate)}
              </p>
              {diff != null && diff !== 0 && (
                <p className={cn('font-semibold', diff > 0 ? 'text-amber-300' : 'text-emerald-300')}>
                  {diff > 0 ? '+' : '−'}
                  {formatMinutes(Math.abs(diff))} {diff > 0 ? 'acima' : 'abaixo'} da estimativa
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <Row icon={<CalendarClock className='size-4' />} label='Início'>
            {formatDateTime(run.startedAt)}
          </Row>
          <Row icon={<CalendarCheck className='size-4' />} label='Fim'>
            {run.endedAt ? formatDateTime(run.endedAt) : 'Em andamento'}
          </Row>
          <Row icon={<Package className='size-4' />} label='Quantidade'>
            {request.quantity}{' '}
            {request.type === 'PRODUCAO' ? (request.quantity === 1 ? 'item' : 'itens') : request.quantity === 1 ? 'peça' : 'peças'}
          </Row>
          <Row icon={<span className='size-3 rounded-full bg-current' />} label='Filamento'>
            <FilamentTag filament={request.filament} />
          </Row>
          <Row icon={<User className='size-4' />} label='Operador'>
            {run.user?.name ?? '—'}
          </Row>
          <Row icon={<User className='size-4' />} label='Solicitante'>
            {request.requesterName}
          </Row>
        </div>

        {runFailures.length > 0 && (
          <div className='flex flex-col gap-2'>
            <p className='text-sm font-semibold'>Falhas neste processo</p>
            {runFailures.map((f) => (
              <div key={f.id} className='flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3'>
                <div className='min-w-0'>
                  <p className='text-sm text-red-900'>{f.reason}</p>
                  <p className='flex items-center gap-1 text-xs text-red-900/70'>
                    <Clock className='size-3' /> {formatDateTime(f.createdAt)}
                    {f.processMinutes != null && ` · ${formatMinutes(f.processMinutes)} de processo`}
                  </p>
                </div>
                <span className='shrink-0 text-sm font-semibold text-red-700'>−{formatGrams(f.lostGrams)}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button asChild>
            <Link to={requestDetailPath(request.id)}>
              Abrir solicitação <ArrowUpRight />
            </Link>
          </Button>
        </DialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
