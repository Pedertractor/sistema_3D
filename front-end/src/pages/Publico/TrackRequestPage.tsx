import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RequestStatusBadge } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatMinutes } from '@/lib/format';
import { ROUTES } from '@/routes/constants';
import { publicApi } from '@/services/public';
import { FilamentTag } from '@/components/FilamentDisplay';
import { REQUEST_TYPE_LABELS, requestStatusLabel } from '@/types/domain';
import { PublicShell, publicCardClass } from './PublicShell';

export function TrackRequestPage() {
  const { trackingCode = '' } = useParams();
  const location = useLocation();
  const created = Boolean((location.state as { created?: boolean } | null)?.created);

  const { data, isLoading, error } = useQuery({
    queryKey: ['track', trackingCode],
    queryFn: () => publicApi.track(trackingCode),
    refetchInterval: 30_000,
  });

  return (
    <PublicShell backTo={ROUTES.SOLICITACAO}>
      {created && (
        <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900'>
          <CheckCircle2 className='size-4' /> Solicitação enviada! Guarde o código abaixo para acompanhar.
        </div>
      )}

      {isLoading && <p className='text-muted-foreground'>Carregando…</p>}
      {error && <p className='text-destructive'>Solicitação {trackingCode} não encontrada.</p>}

      {data && (
        <>
          <Card className={publicCardClass}>
            <CardHeader>
              <CardDescription>{REQUEST_TYPE_LABELS[data.type]}</CardDescription>
              <CardTitle className='flex flex-wrap items-center gap-3 text-2xl'>
                <span className='font-mono'>{data.trackingCode}</span>
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={() => {
                    void navigator.clipboard.writeText(data.trackingCode);
                    toast.success('Código copiado');
                  }}
                  aria-label='Copiar código'
                >
                  <Copy />
                </Button>
                <RequestStatusBadge status={data.status} type={data.type} />
              </CardTitle>
            </CardHeader>
            <CardContent className='grid gap-3 text-sm sm:grid-cols-2'>
              <p>
                <span className='text-muted-foreground'>Solicitante: </span>
                {data.requesterName}
              </p>
              <p>
                <span className='text-muted-foreground'>Item: </span>
                {data.type === 'PRODUCAO' ? `${data.item?.code} — ${data.partNumber}` : data.itemName}
              </p>
              <p>
                <span className='text-muted-foreground'>Quantidade: </span>
                {data.partQuantity != null && data.itemsPerPart != null
                  ? `${data.partQuantity} ${data.partQuantity === 1 ? 'peça' : 'peças'} × ${data.itemsPerPart} = ${data.quantity} itens`
                  : data.quantity}
              </p>
              <p>
                <span className='text-muted-foreground'>Filamento: </span>
                <FilamentTag filament={data.filament} showRigidity />
              </p>
              <p>
                <span className='text-muted-foreground'>Aberta em: </span>
                {formatDateTime(data.createdAt)}
              </p>
              {data.estimate?.estimatedCompletionAt && (
                <p>
                  <span className='text-muted-foreground'>Previsão: </span>
                  {formatDateTime(data.estimate.estimatedCompletionAt)} ({formatMinutes(data.estimate.totalMinutes)})
                </p>
              )}
              {data.finishedAt && (
                <p>
                  <span className='text-muted-foreground'>Finalizada em: </span>
                  {formatDateTime(data.finishedAt)}
                </p>
              )}
            </CardContent>
          </Card>

          {data.status === 'AGUARDANDO_FILAMENTO' && (
            <div className='flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'>
              <AlertTriangle className='mt-0.5 size-4 shrink-0' />
              <p>
                Aguardando filamento. Abra uma ordem no almoxarifado
                {data.almxCode ? (
                  <>
                    {' '}com o código <span className='font-mono font-semibold'>{data.almxCode}</span>
                  </>
                ) : null}
                .
              </p>
            </div>
          )}

          <Card className={publicCardClass}>
            <CardHeader>
              <CardTitle className='text-base'>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className='flex flex-col gap-3 border-l pl-4'>
                {data.history.map((item, index) => (
                  <li key={index} className='text-sm'>
                    <p className='font-medium'>{requestStatusLabel(item.toStatus, data.type)}</p>
                    <p className='text-xs text-muted-foreground'>{formatDateTime(item.createdAt)}</p>
                    {item.note && <p className='text-xs text-muted-foreground'>{item.note}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </PublicShell>
  );
}
