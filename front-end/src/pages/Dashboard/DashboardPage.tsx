import { useMemo, useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { RequestStatusBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatGrams, formatMinutes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { machineDetailPath, requestDetailPath } from '@/routes/constants';
import { dashboardApi, type ProductionDashboard } from '@/services/dashboard';
import { PeriodPicker } from './PeriodPicker';
import { bucketsOf, formatHours, overlapMinutes, periodOf, type Bucket, type Period } from './period';

function Stat({ label, value, detail, hero }: { label: string; value: ReactNode; detail?: ReactNode; hero?: boolean }) {
  return (
    <Card className={cn('gap-1 py-4', hero && 'bg-primary text-primary-foreground')}>
      <CardContent className='px-4'>
        <p className={cn('text-xs', hero ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{label}</p>
        <p className={cn('mt-1 font-extrabold tracking-[-0.03em] tabular-nums', hero ? 'text-4xl' : 'text-2xl')}>{value}</p>
        {detail && <p className={cn('text-xs', hero ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{detail}</p>}
      </CardContent>
    </Card>
  );
}

function computeSummary(data: ProductionDashboard, period: Period) {
  const now = Date.now();
  const buckets = bucketsOf(period);
  const series = buckets.map((b) => ({ bucket: b, minutes: 0 }));
  const perMachine = new Map<string, number>();

  for (const run of data.runs) {
    const start = new Date(run.clippedStart).getTime();
    const end = new Date(run.clippedEnd).getTime();
    perMachine.set(run.machineId, (perMachine.get(run.machineId) ?? 0) + run.minutes);
    for (const s of series) s.minutes += overlapMinutes(start, end, s.bucket.start.getTime(), s.bucket.end.getTime());
  }

  const totalMinutes = data.runs.reduce((sum, r) => sum + r.minutes, 0);
  const machines = data.machines
    .filter((m) => m.status !== 'INATIVA' || perMachine.has(m.id))
    .map((m) => ({ ...m, minutes: perMachine.get(m.id) ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));

  // Capacidade = máquinas ativas × tempo já decorrido do período (não conta o futuro).
  const elapsedMinutes = Math.max(0, Math.min(period.to.getTime(), now) - period.from.getTime()) / 60_000;
  const capacityMinutes = elapsedMinutes * machines.length;

  const finished = data.runs.filter((r) => r.outcome === 'FINALIZADO' && r.endedAt && new Date(r.endedAt) < period.to);
  return {
    series,
    machines,
    totalMinutes,
    elapsedMinutes,
    capacityMinutes,
    utilization: capacityMinutes > 0 ? totalMinutes / capacityMinutes : null,
    runningNow: data.runs.filter((r) => !r.endedAt).length,
    finishedPieces: finished.reduce((sum, r) => sum + r.request.quantity, 0),
    finishedRuns: finished.length,
    failures: data.failures.length,
    lostGrams: data.failures.reduce((sum, f) => sum + f.lostGrams, 0),
  };
}

/** Teto "redondo" para o eixo Y, em horas. */
function niceMaxHours(maxMinutes: number): number {
  const h = maxMinutes / 60;
  if (h <= 1) return 1;
  const steps = [2, 4, 5, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300];
  return steps.find((s) => s >= h) ?? Math.ceil(h / 100) * 100;
}

function ProductionChart({ series, machineCount }: { series: { bucket: Bucket; minutes: number }[]; machineCount: number }) {
  const maxH = niceMaxHours(Math.max(...series.map((s) => s.minutes), 1));
  const ticks = [maxH, maxH / 2, 0];
  const dense = series.length > 24;
  const bucketHours = (b: Bucket) => (b.end.getTime() - b.start.getTime()) / 3_600_000;

  return (
    <div className='flex gap-2'>
      <div className='relative flex h-56 w-9 shrink-0 flex-col justify-between pb-6 text-right text-[11px] text-muted-foreground tabular-nums'>
        {ticks.map((t) => (
          <span key={t} className='-translate-y-1/2 first:translate-y-0 last:translate-y-1/2'>
            {t.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
          </span>
        ))}
      </div>
      <div className='relative min-w-0 flex-1'>
        <div className='pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between'>
          {ticks.map((t) => (
            <div key={t} className={cn('border-t', t === 0 ? 'border-foreground/30' : 'border-dashed border-border')} />
          ))}
        </div>
        <div className='relative flex h-56 items-stretch gap-[2px]'>
          {series.map(({ bucket, minutes }, i) => {
            const pct = (minutes / 60 / maxH) * 100;
            const capacity = machineCount * bucketHours(bucket) * 60;
            const showLabel = !dense || i % 2 === 0;
            return (
              <div key={bucket.start.toISOString()} className='group relative flex min-w-0 flex-1 flex-col'>
                <div className='relative flex flex-1 items-end rounded-md transition-colors group-hover:bg-muted/70'>
                  <div
                    className='mx-auto w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80'
                    style={{ height: `${pct}%`, minHeight: minutes > 0 ? 2 : 0 }}
                  />
                </div>
                <span className='mt-1 h-5 truncate text-center text-[10px] text-muted-foreground capitalize tabular-nums'>
                  {showLabel ? bucket.label : ''}
                </span>
                <div
                  role='tooltip'
                  className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md group-hover:block'
                >
                  <p className='font-semibold capitalize'>{bucket.title}</p>
                  <p className='tabular-nums'>{minutes > 0 ? formatMinutes(minutes) : '0 min'} produzidos</p>
                  {capacity > 0 && (
                    <p className='text-muted-foreground tabular-nums'>
                      {Math.round((minutes / capacity) * 100)}% da capacidade
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>(() => periodOf('day', new Date()));
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['dashboard-production', period.from.toISOString(), period.to.toISOString()],
    queryFn: () => dashboardApi.production(period.from, period.to),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const summary = useMemo(() => (data ? computeSummary(data, period) : null), [data, period]);
  const chartTitle = period.mode === 'day' ? 'Horas produzidas por hora' : 'Horas produzidas por dia';

  return (
    <div className='flex flex-col gap-5'>
      <PageHeader
        title='Dashboard'
        description='Horas de máquina produzindo no período: soma do tempo em impressão de todas as máquinas.'
      />
      <PeriodPicker period={period} onChange={setPeriod} />

      {isError && <p className='text-muted-foreground'>Não foi possível carregar o dashboard.</p>}
      {isLoading && <p className='text-muted-foreground'>Carregando…</p>}

      {summary && (
        <div className={cn('flex flex-col gap-4 transition-opacity', isFetching && 'opacity-70')}>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5'>
            <Stat
              hero
              label='Horas produzidas'
              value={formatHours(summary.totalMinutes)}
              detail={summary.totalMinutes > 0 ? formatMinutes(summary.totalMinutes) : 'Nenhuma impressão no período'}
            />
            <Stat
              label='Utilização das máquinas'
              value={summary.utilization == null ? '—' : `${Math.round(summary.utilization * 100)}%`}
              detail={
                summary.elapsedMinutes === 0
                  ? 'Período ainda não começou'
                  : `de ${formatHours(summary.capacityMinutes)} disponíveis (${summary.machines.length} ${summary.machines.length === 1 ? 'máquina' : 'máquinas'})`
              }
            />
            <Stat
              label='Processos'
              value={data!.runs.length}
              detail={summary.runningNow > 0 ? `${summary.runningNow} em andamento agora` : 'Nenhum em andamento'}
            />
            <Stat
              label='Peças concluídas'
              value={summary.finishedPieces}
              detail={`${summary.finishedRuns} ${summary.finishedRuns === 1 ? 'processo finalizado' : 'processos finalizados'}`}
            />
            <Stat
              label='Falhas'
              value={summary.failures}
              detail={summary.lostGrams > 0 ? `${formatGrams(summary.lostGrams)} perdidos` : 'Nenhum material perdido'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>{chartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductionChart series={summary.series} machineCount={summary.machines.length} />
            </CardContent>
          </Card>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Por máquina</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.machines.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>Nenhuma máquina cadastrada.</p>
                ) : (
                  <ul className='flex flex-col gap-3'>
                    {summary.machines.map((m) => {
                      const util = summary.elapsedMinutes > 0 ? m.minutes / summary.elapsedMinutes : 0;
                      return (
                        <li key={m.id}>
                          <Link to={machineDetailPath(m.id)} className='group block rounded-lg'>
                            <div className='flex items-baseline justify-between gap-2 text-sm'>
                              <span className='truncate font-medium group-hover:underline'>{m.name}</span>
                              <span className='shrink-0 tabular-nums'>
                                <span className='font-semibold'>{formatHours(m.minutes)}</span>
                                <span className='ml-2 text-xs text-muted-foreground'>{Math.round(util * 100)}%</span>
                              </span>
                            </div>
                            <div className='mt-1.5 h-2 overflow-hidden rounded-full bg-muted'>
                              <div className='h-full rounded-full bg-primary' style={{ width: `${Math.min(100, util * 100)}%` }} />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className='mt-4 text-xs text-muted-foreground'>% = tempo imprimindo ÷ tempo decorrido do período.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Processos no período</CardTitle>
              </CardHeader>
              <CardContent>
                {data!.runs.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>Nenhuma impressão no período.</p>
                ) : (
                  <ul className='flex max-h-[26rem] flex-col divide-y overflow-y-auto'>
                    {[...data!.runs].reverse().map((run) => {
                      const machine = data!.machines.find((m) => m.id === run.machineId);
                      return (
                        <li key={run.id}>
                          <Link
                            to={requestDetailPath(run.request.id)}
                            className='group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60'
                          >
                            <div className='min-w-0 flex-1'>
                              <p className='font-mono text-sm font-semibold'>{run.request.trackingCode}</p>
                              <p className='truncate text-xs text-muted-foreground'>
                                {machine?.name ?? '—'} · {formatDateTime(run.startedAt)} ·{' '}
                                {run.request.item ? run.request.item.name : run.request.itemName}
                              </p>
                            </div>
                            <span className='shrink-0 text-sm font-medium tabular-nums'>
                              {run.minutes >= 1 ? formatMinutes(run.minutes) : '< 1 min'}
                            </span>
                            <span className='hidden w-36 shrink-0 justify-end sm:flex'>
                              {run.outcome ? (
                                <RequestStatusBadge status={run.outcome} type={run.request.type} />
                              ) : (
                                <Badge variant='outline' className='font-normal'>
                                  Em andamento
                                </Badge>
                              )}
                            </span>
                            <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
