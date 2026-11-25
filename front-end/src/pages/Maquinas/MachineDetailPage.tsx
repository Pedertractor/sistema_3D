import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { MachineStatusBadge, RequestStatusBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatGrams, formatMinutes, formatRelative } from '@/lib/format';
import { requestDetailPath, ROUTES } from '@/routes/constants';
import { machinesApi, type MachineRun } from '@/services/machines';
import { MachineImage } from './MachineImage';
import { RunDetailDialog } from './RunDetailDialog';
import { RunningJobBanner } from './RunningJobBanner';

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <Card className='gap-1 py-4'>
      <CardContent className='px-4'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className='mt-1 text-2xl font-extrabold tracking-[-0.03em]'>{value}</p>
        {detail && <p className='text-xs text-muted-foreground'>{detail}</p>}
      </CardContent>
    </Card>
  );
}

export function MachineDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['machine-history', id],
    queryFn: () => machinesApi.history(id),
    refetchInterval: 30_000,
  });
  const [selected, setSelected] = useState<MachineRun | null>(null);

  if (isError) return <p className='text-muted-foreground'>Máquina não encontrada.</p>;
  if (isLoading || !data) return <p className='text-muted-foreground'>Carregando…</p>;
  const { machine, stats, runs, failures } = data;
  const running = runs.find((r) => !r.endedAt);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <Button asChild variant='ghost' size='icon'>
          <Link to={ROUTES.MAQUINAS} aria-label='Voltar para máquinas'>
            <ArrowLeft />
          </Link>
        </Button>
        <MachineImage machine={machine} className='aspect-auto h-14 w-20 rounded-xl' />
        <div className='min-w-0'>
          <p className='text-xs text-muted-foreground'>{machine.model ?? 'Modelo não informado'}</p>
          <h1 className='flex flex-wrap items-center gap-2 text-3xl font-extrabold tracking-[-0.035em]'>
            {machine.name}
            <MachineStatusBadge status={machine.status} />
          </h1>
        </div>
      </div>

      {running && <RunningJobBanner run={running} />}

      <div className='grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>
        <Stat
          label='Tempo de operação'
          value={stats.operatingMinutes > 0 ? formatMinutes(stats.operatingMinutes) : '0 min'}
          detail={stats.firstRunAt ? `desde ${formatDateTime(stats.firstRunAt)}` : 'Ainda sem uso'}
        />
        <Stat
          label='Processos'
          value={stats.runs}
          detail={`${stats.requests} ${stats.requests === 1 ? 'solicitação' : 'solicitações'}`}
        />
        <Stat
          label='Média por processo'
          value={stats.averageRunMinutes > 0 ? formatMinutes(stats.averageRunMinutes) : '—'}
        />
        <Stat
          label='Concluídos'
          value={stats.finishedRuns}
          detail={`${stats.finishedPieces} ${stats.finishedPieces === 1 ? 'peça' : 'peças'}`}
        />
        <Stat
          label='Falhas'
          value={stats.failures}
          detail={stats.lostGrams > 0 ? `${formatGrams(stats.lostGrams)} perdidos` : 'Nenhum material perdido'}
        />
        <Stat
          label='Último uso'
          value={stats.lastRunAt ? formatRelative(stats.lastRunAt) : '—'}
          detail={stats.lastRunAt ? formatDateTime(stats.lastRunAt) : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Processos</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Nenhuma impressão registrada nesta máquina.</p>
          ) : (
            // Resumo por processo; o clique abre o detalhe completo no modal.
            <ul className='flex flex-col divide-y'>
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type='button'
                    onClick={() => setSelected(run)}
                    className='group flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='font-mono text-sm font-semibold'>{run.request.trackingCode}</p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {formatDateTime(run.startedAt)} ·{' '}
                        {run.request.item ? run.request.item.name : run.request.itemName}
                      </p>
                    </div>
                    <span className='shrink-0 text-sm font-medium tabular-nums'>
                      {run.minutes > 0 ? formatMinutes(run.minutes) : '< 1 min'}
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
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Falhas nesta máquina</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-2'>
          {failures.length === 0 && <p className='text-sm text-muted-foreground'>Nenhuma falha registrada.</p>}
          {failures.map((f) => (
            <div key={f.id} className='flex flex-wrap items-start justify-between gap-2 rounded-xl border p-3'>
              <div className='min-w-0'>
                <p className='text-sm'>{f.reason}</p>
                <p className='text-xs text-muted-foreground'>
                  <Link to={requestDetailPath(f.request.id)} className='font-mono hover:underline'>
                    {f.request.trackingCode}
                  </Link>{' '}
                  · {formatDateTime(f.createdAt)} · {f.user?.name ?? '—'}
                  {f.processMinutes != null && ` · ${formatMinutes(f.processMinutes)} de processo`}
                </p>
              </div>
              <span className='text-sm font-medium text-red-700'>−{formatGrams(f.lostGrams)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {selected && (
        <RunDetailDialog run={selected} failures={failures} onOpenChange={(open) => !open && setSelected(null)} />
      )}
    </div>
  );
}
