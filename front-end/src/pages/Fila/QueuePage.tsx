import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/PageHeader';
import { RequestStatusBadge } from '@/components/StatusBadges';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatGrams, formatMinutes, formatRelative } from '@/lib/format';
import { FilamentTag } from '@/components/FilamentDisplay';
import { cn } from '@/lib/utils';
import { requestDetailPath } from '@/routes/constants';
import { requestsApi } from '@/services/requests';
import {
  REQUEST_TYPE_LABELS,
  requestStatusLabel,
  type RequestStatus,
  type RequestType,
} from '@/types/domain';

type Filter = 'ATIVAS' | RequestStatus | 'TODAS';

const ACTIVE: RequestStatus[] = [
  'EM_IMPRESSAO',
  'EM_PROTOTIPAGEM',
  'AGUARDANDO_IMPRESSAO',
  'AGUARDANDO_FILAMENTO',
  'PAUSADO',
  'FALHA_IMPRESSAO',
];

const FILTER_CHIPS: Filter[] = ['ATIVAS', ...ACTIVE, 'FINALIZADO', 'CANCELADO', 'TODAS'];

export function QueuePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('ATIVAS');
  const [type, setType] = useState<RequestType | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');

  const statusParam = filter === 'ATIVAS' ? ACTIVE : filter === 'TODAS' ? undefined : [filter];

  const { data, isLoading } = useQuery({
    queryKey: ['requests', statusParam, type, search],
    queryFn: () =>
      requestsApi.list({ status: statusParam, type: type === 'TODOS' ? undefined : type, search }),
    refetchInterval: 20_000,
  });

  const queue = useQuery({ queryKey: ['queue-estimate'], queryFn: requestsApi.queueEstimate, refetchInterval: 60_000 });

  const counts = useMemo(() => data?.counts ?? {}, [data]);
  const activeCount = useMemo(() => ACTIVE.reduce((sum, s) => sum + (counts[s] ?? 0), 0), [counts]);

  // Ordem da fila: imprimindo, depois prototipando, depois o resto por data de criação
  const rows = useMemo(() => {
    const list = data?.requests ?? [];
    const weight = (s: RequestStatus) => (s === 'EM_IMPRESSAO' ? 0 : s === 'EM_PROTOTIPAGEM' ? 1 : ACTIVE.includes(s) ? 2 : 3);
    return [...list].sort((a, b) => weight(a.status) - weight(b.status) || a.createdAt.localeCompare(b.createdAt));
  }, [data]);

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader
        title='Fila de produção'
        description='Fila única de prototipagem e produção.'
        actions={
          queue.data && (
            <Badge variant='outline' className='gap-1 py-1 font-normal'>
              <Clock className='size-3' />
              Fila: {formatMinutes(queue.data.totalMinutes ?? queue.data.queueMinutes)} em{' '}
              {queue.data.productiveMachines} máquina(s)
            </Badge>
          )
        }
      />

      <div className='flex flex-wrap gap-2'>
        {FILTER_CHIPS.map((chip) => {
          const count =
            chip === 'ATIVAS' ? activeCount : chip === 'TODAS' ? undefined : (counts[chip as RequestStatus] ?? 0);
          return (
            <button
              key={chip}
              type='button'
              onClick={() => setFilter(chip)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                filter === chip ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
              )}
            >
              {chip === 'ATIVAS' ? 'Ativas' : chip === 'TODAS' ? 'Todas' : requestStatusLabel(chip)}
              {count != null && <span className='ml-1 opacity-70'>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className='flex flex-wrap gap-2'>
        <div className='relative min-w-60 flex-1'>
          <Search className='absolute top-2.5 left-2.5 size-4 text-muted-foreground' />
          <Input
            className='pl-8'
            placeholder='Código, solicitante, partnumber, item…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as RequestType | 'TODOS')}>
          <SelectTrigger className='w-44'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='TODOS'>Todos os tipos</SelectItem>
            <SelectItem value='PRODUCAO'>Produção</SelectItem>
            <SelectItem value='PROTOTIPAGEM'>Prototipagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className='py-0'>
        <CardContent className='px-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='pl-4'>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className='text-right'>Qtd.</TableHead>
                <TableHead>Filamento</TableHead>
                <TableHead>Tempo est.</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead className='text-center' title='Erros de impressão registrados'>
                  Erros
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='pr-4'>Aberta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className='py-8 text-center text-muted-foreground'>
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className='py-8 text-center text-muted-foreground'>
                    Nenhuma solicitação.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className='cursor-pointer' onClick={() => navigate(requestDetailPath(r.id))}>
                  <TableCell className='pl-4 font-mono text-xs'>{r.trackingCode}</TableCell>
                  <TableCell>{REQUEST_TYPE_LABELS[r.type]}</TableCell>
                  <TableCell className='max-w-56'>
                    <p className='truncate font-medium'>{r.type === 'PRODUCAO' ? r.item?.code : r.itemName}</p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {r.type === 'PRODUCAO' ? r.partNumber : r.requesterName}
                    </p>
                  </TableCell>
                  <TableCell className='text-right'>{r.quantity}</TableCell>
                  <TableCell>
                    <FilamentTag filament={r.filament} className='text-xs' />
                    <p className='text-xs text-muted-foreground'>{formatGrams(r.estimatedGrams)}</p>
                  </TableCell>
                  <TableCell>{formatMinutes(r.estimatedMinutes)}</TableCell>
                  <TableCell>{r.machine?.name ?? '—'}</TableCell>
                  <TableCell className='text-center'>
                    {r._count.failures > 0 ? (
                      <span
                        title={`${r._count.failures} ${r._count.failures === 1 ? 'erro' : 'erros'} de impressão`}
                        className='inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 tabular-nums'
                      >
                        <AlertTriangle className='size-3.5' />
                        {r._count.failures}
                      </span>
                    ) : (
                      <span className='text-muted-foreground tabular-nums'>0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RequestStatusBadge status={r.status} type={r.type} />
                  </TableCell>
                  <TableCell className='pr-4 text-xs text-muted-foreground'>{formatRelative(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
