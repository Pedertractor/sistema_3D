import { ArrowRight, Timer } from 'lucide-react';

import { RequestStatusBadge } from '@/components/StatusBadges';
import { useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import { formatDateTime, formatStopwatch } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { RequestDetail } from '@/services/requests';
import type { RequestStatus } from '@/types/domain';

/** Cor sólida de cada status (mesmos tons dos badges) para os pontos da linha do tempo. */
const REQUEST_STATUS_DOT: Record<RequestStatus, string> = {
  AGUARDANDO_IMPRESSAO: 'bg-sky-500',
  EM_PROTOTIPAGEM: 'bg-fuchsia-500',
  EM_IMPRESSAO: 'bg-violet-500',
  FALHA_IMPRESSAO: 'bg-red-500',
  PAUSADO: 'bg-amber-500',
  FINALIZADO: 'bg-emerald-500',
  AGUARDANDO_FILAMENTO: 'bg-orange-500',
  CANCELADO: 'bg-zinc-400',
};

/** Cronômetro de uma etapa: parado (duração fixa) quando `end` existe, ticando a partir de `start` quando não. */
function StageDuration({ start, end }: { start: string; end: string | null }) {
  const liveSeconds = useElapsedSeconds(end ? null : start);
  const ms = end ? new Date(end).getTime() - new Date(start).getTime() : liveSeconds * 1000;
  return (
    <span className='inline-flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums'>
      <Timer className='size-3' /> {formatStopwatch(ms)}
    </span>
  );
}

/**
 * Linha do tempo das mudanças de status (mais recente no topo): ponto na cor do novo status,
 * transição "de → para" em badges, autor e data, a observação em destaque quando existir, e
 * o cronômetro de cada etapa (ticando na etapa atual, parado nas etapas já encerradas).
 */
export function HistoryTimeline({ request }: { request: RequestDetail }) {
  const items = request.history;
  if (items.length === 0) return <p className='text-sm text-muted-foreground'>Sem histórico.</p>;
  const closed = request.status === 'FINALIZADO' || request.status === 'CANCELADO';

  return (
    <ol className='flex flex-col'>
      {items.map((h, index) => {
        const latest = index === 0;
        const last = index === items.length - 1;
        // A etapa de encerramento (finalizado/cancelado) é um marco, não tem "duração" própria a mostrar.
        const showDuration = !(latest && closed);
        const stageEnd = latest && !closed ? null : (items[index - 1]?.createdAt ?? null);
        return (
          <li key={h.id} className='relative flex gap-4 pb-6 last:pb-0'>
            {/* Linha que liga este ponto ao próximo. */}
            {!last && <span aria-hidden className='absolute top-5 bottom-0 left-[9px] w-px bg-border' />}
            <span
              aria-hidden
              className={cn(
                'relative mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full ring-4 ring-background',
                latest ? REQUEST_STATUS_DOT[h.toStatus] : 'bg-muted',
              )}
            >
              <span className={cn('size-2 rounded-full', latest ? 'bg-background' : REQUEST_STATUS_DOT[h.toStatus])} />
            </span>

            <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
              <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-1'>
                <div className='flex flex-wrap items-center gap-1.5'>
                  {h.fromStatus && (
                    <>
                      <span className='opacity-60'>
                        <RequestStatusBadge status={h.fromStatus} type={request.type} />
                      </span>
                      <ArrowRight className='size-3.5 text-muted-foreground' />
                    </>
                  )}
                  <RequestStatusBadge status={h.toStatus} type={request.type} />
                  {latest && <span className='text-xs font-medium text-muted-foreground'>· atual</span>}
                </div>
                <div className='flex shrink-0 flex-col items-end gap-0.5'>
                  <time dateTime={h.createdAt} className='text-xs text-muted-foreground tabular-nums'>
                    {formatDateTime(h.createdAt)}
                  </time>
                  {showDuration && <StageDuration start={h.createdAt} end={stageEnd} />}
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>{h.user ? h.user.name : 'Solicitante / sistema'}</p>
              {h.note && <p className='w-fit max-w-full rounded-lg bg-muted/60 px-3 py-2 text-sm'>{h.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
