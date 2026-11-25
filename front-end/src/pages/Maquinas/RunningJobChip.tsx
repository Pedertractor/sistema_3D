import { ArrowUpRight, Hourglass, Printer3d, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatClock, useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import { formatMinutes } from '@/lib/format';
import { requestDetailPath } from '@/routes/constants';
import type { Machine } from '@/services/machines';

/** Versão compacta (card da lista de máquinas) do processo em andamento: código, cronômetro e progresso. */
export function RunningJobChip({ job, startedAt }: { job: Machine['requests'][number]; startedAt: string | null }) {
  const elapsed = useElapsedSeconds(startedAt);
  const estimateSeconds = job.estimatedMinutes ? job.estimatedMinutes * 60 : null;
  const progress = estimateSeconds ? Math.min(1, elapsed / estimateSeconds) : null;
  const overtime = estimateSeconds != null && elapsed > estimateSeconds;

  return (
    <Link
      to={requestDetailPath(job.id)}
      className='group flex flex-col gap-2.5 rounded-xl bg-foreground p-3 text-background transition-opacity hover:opacity-90'
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='flex min-w-0 items-center gap-2'>
          <span className='relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-background/10'>
            <Printer3d className='size-4' />
            <span className='absolute -top-0.5 -right-0.5 flex size-2'>
              <span className='absolute inline-flex size-full animate-ping rounded-full bg-background/70' />
              <span className='relative inline-flex size-2 rounded-full bg-background' />
            </span>
          </span>
          <span className='truncate font-mono text-sm font-semibold'>{job.trackingCode}</span>
        </span>
        <ArrowUpRight className='size-4 shrink-0 text-background/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
      </div>

      <div className='flex items-end justify-between gap-2'>
        <span className='flex items-center gap-1.5'>
          <Timer className='size-4 text-background/60' />
          <span className='font-mono text-xl font-bold tabular-nums'>{startedAt ? formatClock(elapsed) : '—'}</span>
        </span>
        {job.estimatedMinutes ? (
          <span className='flex items-center gap-1 text-xs text-background/60'>
            <Hourglass className='size-3.5' />
            {overtime ? 'acima de ' : ''}
            {formatMinutes(job.estimatedMinutes)} est.
          </span>
        ) : null}
      </div>

      {progress != null && (
        <div className='h-1 overflow-hidden rounded-full bg-background/15'>
          <div className='h-full rounded-full bg-background transition-[width] duration-1000' style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </Link>
  );
}
