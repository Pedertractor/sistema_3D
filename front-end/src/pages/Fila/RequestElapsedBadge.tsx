import { Timer } from 'lucide-react';

import { useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import { formatStopwatch } from '@/lib/format';
import type { RequestDetail } from '@/services/requests';

/** Tempo total da solicitação: ticando desde a criação enquanto aberta, parado no fechamento. */
export function RequestElapsedBadge({ request }: { request: RequestDetail }) {
  const closed = request.status === 'FINALIZADO' || request.status === 'CANCELADO';
  const closedAt = request.finishedAt ?? request.history[0]?.createdAt ?? null;

  const liveSeconds = useElapsedSeconds(closed ? null : request.createdAt);
  const ms =
    closed && closedAt
      ? new Date(closedAt).getTime() - new Date(request.createdAt).getTime()
      : liveSeconds * 1000;

  return (
    <span className='inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-background'>
      <Timer className='size-4 shrink-0 text-background/70' />
      <span className='font-mono text-sm font-semibold tabular-nums'>{formatStopwatch(ms)}</span>
      <span className='text-xs text-background/60'>{closed ? 'tempo total' : 'em aberto'}</span>
    </span>
  );
}
