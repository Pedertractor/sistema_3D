import { ArrowUpRight, CalendarClock, Hourglass, Printer, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatClock, useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import { formatDateTime, formatMinutes } from '@/lib/format';
import { requestDetailPath } from '@/routes/constants';
import type { MachineRun } from '@/services/machines';

/** Impressão em andamento na máquina, com cronômetro em tempo real desde o início do processo. */
export function RunningJobBanner({ run }: { run: MachineRun }) {
  const elapsed = useElapsedSeconds(run.startedAt);
  const estimateMinutes = run.request.estimatedMinutes;
  const estimateSeconds = estimateMinutes ? estimateMinutes * 60 : null;
  const progress = estimateSeconds ? Math.min(1, elapsed / estimateSeconds) : null;
  const overtime = estimateSeconds != null && elapsed > estimateSeconds;
  const remainingMinutes = estimateSeconds ? Math.ceil(Math.abs(estimateSeconds - elapsed) / 60) : null;
  const itemName = run.request.item ? `${run.request.item.code} — ${run.request.item.name}` : run.request.itemName;

  return (
    <div className='flex flex-col gap-4 rounded-2xl bg-foreground p-5 text-background sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex min-w-0 items-center gap-4'>
        <div className='relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-background/10'>
          <Printer className='size-6' />
          <span className='absolute -top-0.5 -right-0.5 flex size-3'>
            <span className='absolute inline-flex size-full animate-ping rounded-full bg-background/70' />
            <span className='relative inline-flex size-3 rounded-full bg-background' />
          </span>
        </div>
        <div className='min-w-0'>
          <p className='text-xs tracking-wide text-background/60 uppercase'>Imprimindo agora</p>
          <Link
            to={requestDetailPath(run.request.id)}
            className='inline-flex items-center gap-1 font-mono text-lg font-semibold hover:underline'
          >
            {run.request.trackingCode}
            <ArrowUpRight className='size-4' />
          </Link>
          {itemName && <p className='truncate text-sm text-background/70'>{itemName}</p>}
        </div>
      </div>

      <div className='flex flex-col gap-2 sm:min-w-72 sm:items-end'>
        <div className='flex items-center gap-2'>
          <Timer className='size-5 text-background/60' />
          <span className='font-mono text-3xl font-bold tracking-tight tabular-nums' aria-live='off'>
            {formatClock(elapsed)}
          </span>
        </div>
        {progress != null && (
          <div className='h-1.5 w-full overflow-hidden rounded-full bg-background/15 sm:w-72'>
            <div className='h-full rounded-full bg-background transition-[width] duration-1000' style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-background/60 sm:justify-end'>
          <span className='inline-flex items-center gap-1'>
            <CalendarClock className='size-3.5' /> início {formatDateTime(run.startedAt)}
          </span>
          {estimateMinutes != null && remainingMinutes != null && (
            <span className='inline-flex items-center gap-1'>
              <Hourglass className='size-3.5' />
              {overtime
                ? `${formatMinutes(remainingMinutes)} acima de ${formatMinutes(estimateMinutes)} est.`
                : `faltam ~${formatMinutes(remainingMinutes)} de ${formatMinutes(estimateMinutes)} est.`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
