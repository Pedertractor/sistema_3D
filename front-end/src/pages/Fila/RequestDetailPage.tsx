import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Boxes, Download, Factory, FlaskConical, Paperclip } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RequestStatusBadge } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime, formatGrams, formatMinutes } from '@/lib/format';
import { FilamentTag } from '@/components/FilamentDisplay';
import { ROUTES } from '@/routes/constants';
import { UNIT_LABELS } from '@/utils/roles';
import { requestsApi, type RequestDetail } from '@/services/requests';
import {
  allowedTransitions,
  primaryTransition,
  REQUEST_TYPE_LABELS,
  type RequestStatus,
} from '@/types/domain';
import { ItemFormDialog } from '../Itens/ItemFormDialog';
import { FailureDialog } from './FailureDialog';
import { HistoryTimeline } from './HistoryTimeline';
import { StatusChangeDialog } from './StatusChangeDialog';

function actionLabel(status: RequestStatus, request: RequestDetail): string {
  switch (status) {
    case 'EM_PROTOTIPAGEM':
      if (request.status === 'PAUSADO') return 'Retomar prototipagem';
      if (request.status === 'FALHA_IMPRESSAO') return 'Voltar para prototipagem';
      return 'Iniciar prototipagem';
    case 'EM_IMPRESSAO':
      if (request.consumedGrams > 0) return 'Retomar impressão';
      // Prototipagem: imprimir encerra a etapa de prototipagem.
      return request.status === 'EM_PROTOTIPAGEM' ? 'Finalizar prototipagem e imprimir' : 'Iniciar impressão';
    case 'AGUARDANDO_IMPRESSAO':
      return 'Voltar para a fila';
    case 'AGUARDANDO_FILAMENTO':
      return 'Aguardando filamento';
    case 'PAUSADO':
      return 'Pausar';
    case 'FALHA_IMPRESSAO':
      return 'Marcar falha';
    case 'FINALIZADO':
      return 'Finalizar';
    case 'CANCELADO':
      return 'Cancelar';
  }
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <div className='text-sm'>{children || '—'}</div>
    </div>
  );
}

/** Valor por peça salvo ou, em solicitações antigas que só tinham o total, total ÷ quantidade. */
function perUnitStart(perUnit: number | null, total: number | null, quantity: number) {
  if (perUnit) return String(perUnit);
  if (total && quantity > 0) return String(Math.round(total / quantity));
  return '';
}

/** Prototipagem: a equipe informa gramas e minutos de UMA peça; o total sai × a quantidade solicitada. */
function EstimateEditor({ request }: { request: RequestDetail }) {
  const queryClient = useQueryClient();
  const [grams, setGrams] = useState(perUnitStart(request.estimatedGramsPerUnit, request.estimatedGrams, request.quantity));
  const [minutes, setMinutes] = useState(perUnitStart(request.estimatedMinutesPerUnit, request.estimatedMinutes, request.quantity));
  const mutation = useMutation({
    mutationFn: () =>
      requestsApi.updateEstimate(request.id, {
        gramsPerUnit: grams ? Number(grams) : undefined,
        minutesPerUnit: minutes ? Number(minutes) : undefined,
      }),
    onSuccess: () => {
      toast.success('Estimativa atualizada');
      void queryClient.invalidateQueries();
    },
  });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const gramsNumber = Number(grams);
  const minutesNumber = Number(minutes);
  const hasTotals = gramsNumber > 0 || minutesNumber > 0;
  const pieces = request.quantity === 1 ? '1 peça' : `${request.quantity} peças`;

  return (
    <form onSubmit={onSubmit} className='grid gap-6 md:grid-cols-2 md:gap-8'>
      {/* Esquerda: valores de uma peça */}
      <div className='flex flex-col gap-4'>
        <div>
          <p className='font-semibold'>Estimativa por peça</p>
          <p className='text-sm text-muted-foreground'>Informe gramas e minutos de impressão de uma peça.</p>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <Field>
            <FieldLabel htmlFor='eg'>Gramas por peça</FieldLabel>
            <Input id='eg' type='number' min={1} value={grams} onChange={(e) => setGrams(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor='em'>Minutos por peça</FieldLabel>
            <Input id='em' type='number' min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
        </div>
        <Button type='submit' className='self-start' disabled={mutation.isPending || !hasTotals}>
          Salvar estimativa
        </Button>
      </div>

      {/* Direita: total da solicitação (por peça × quantidade) */}
      <div className='flex flex-col gap-3 rounded-2xl bg-secondary/70 p-5'>
        <div className='flex items-baseline justify-between gap-2'>
          <p className='font-semibold'>Total da solicitação</p>
          <span className='rounded-full bg-background px-2.5 py-0.5 text-xs font-medium'>{pieces}</span>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <EstimateTotal
            label='Filamento'
            value={gramsNumber > 0 ? formatGrams(gramsNumber * request.quantity) : null}
            detail={gramsNumber > 0 ? `${formatGrams(gramsNumber)} × ${request.quantity}` : null}
          />
          <EstimateTotal
            label='Tempo de impressão'
            value={minutesNumber > 0 ? formatMinutes(minutesNumber * request.quantity) : null}
            detail={minutesNumber > 0 ? `${formatMinutes(minutesNumber)} × ${request.quantity}` : null}
          />
        </div>
        <p className='text-xs text-muted-foreground'>Entra no prazo da fila e no estoque comprometido do filamento.</p>
      </div>
    </form>
  );
}

function EstimateTotal({ label, value, detail }: { label: string; value: string | null; detail: string | null }) {
  return (
    <div className='rounded-xl bg-background p-4'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 text-2xl font-extrabold tracking-[-0.03em]'>{value ?? '—'}</p>
      <p className='text-xs text-muted-foreground'>{detail ?? 'Informe o valor por peça'}</p>
    </div>
  );
}

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const [target, setTarget] = useState<RequestStatus | null>(null);
  const [itemDialog, setItemDialog] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['request', id], queryFn: () => requestsApi.get(id) });

  if (isLoading || !data) return <p className='text-muted-foreground'>Carregando…</p>;
  const { request, filament } = data;
  const transitions = allowedTransitions(request.type, request.status);
  const primary = primaryTransition(transitions);
  const closed = request.status === 'FINALIZADO' || request.status === 'CANCELADO';
  const canRegisterItem = request.type === 'PROTOTIPAGEM' && request.status === 'FINALIZADO' && !request.createdItem;
  const lostTotal = request.failures.reduce((sum, f) => sum + f.lostGrams, 0);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <Button asChild variant='ghost' size='icon'>
            <Link to={ROUTES.FILA}>
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <p className='text-xs text-muted-foreground'>{REQUEST_TYPE_LABELS[request.type]}</p>
            <h1 className='flex items-center gap-2 text-3xl font-extrabold tracking-[-0.035em]'>
              <span className='font-mono'>{request.trackingCode}</span>
              <RequestStatusBadge status={request.status} type={request.type} />
            </h1>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          {transitions.map((status) => (
            <Button
              key={status}
              size='sm'
              variant={status === 'CANCELADO' ? 'outline' : status === primary ? 'default' : 'secondary'}
              onClick={() => setTarget(status)}
            >
              {actionLabel(status, request)}
            </Button>
          ))}
          {canRegisterItem && (
            <Button size='sm' onClick={() => setItemDialog(true)}>
              <Boxes /> Registrar item
            </Button>
          )}
        </div>
      </div>

      {request.status === 'AGUARDANDO_FILAMENTO' && (
        <div className='flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'>
          <AlertTriangle className='mt-0.5 size-4 shrink-0' />
          <p>
            Estoque de {filament.label}: {formatGrams(filament.stockGrams)} ({formatGrams(filament.availableGrams)}{' '}
            livres após a fila). Ordem ALMX: <span className='font-mono font-semibold'>{filament.almxCode ?? 'sem código'}</span>
          </p>
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>
              {request.type === 'PRODUCAO' ? `${request.item?.code} — ${request.item?.name}` : request.itemName}
            </CardTitle>
            {request.partNumber && (
              <CardDescription>
                Partnumber {request.partNumber}
                {request.partDescription ? ` · ${request.partDescription}` : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-3'>
            <Info label='Solicitante'>
              {request.requesterName}
              {request.requesterCardNumber && (
                <p className='text-xs text-muted-foreground'>
                  Cartão {request.requesterCardNumber}
                  {request.requesterUnit ? ` · ${UNIT_LABELS[request.requesterUnit]}` : ''}
                </p>
              )}
              {request.requesterSector && <p className='text-xs text-muted-foreground'>{request.requesterSector}</p>}
              {request.requesterCostCenter && (
                <p className='text-xs text-muted-foreground'>
                  CC <span className='font-mono'>{request.requesterCostCenter}</span>
                </p>
              )}
              {request.requesterEmail && <p className='text-xs text-muted-foreground'>{request.requesterEmail}</p>}
            </Info>
            <Info label='Quantidade'>
              {request.quantity} {request.quantity === 1 ? 'item' : 'itens'}
              {request.partQuantity != null && request.itemsPerPart != null && (
                <p className='text-xs text-muted-foreground'>
                  {request.partQuantity} {request.partQuantity === 1 ? 'peça' : 'peças'} × {request.itemsPerPart} por peça
                </p>
              )}
            </Info>
            <Info label='Filamento'>
              <FilamentTag filament={request.filament} showRigidity />
            </Info>
            <Info label='Gramas estimados'>
              {formatGrams(request.estimatedGrams)}
              {request.estimatedGramsPerUnit && request.quantity > 1 && (
                <p className='text-xs text-muted-foreground'>{formatGrams(request.estimatedGramsPerUnit)} por peça</p>
              )}
            </Info>
            <Info label='Tempo estimado'>
              {formatMinutes(request.estimatedMinutes)}
              {request.estimatedMinutesPerUnit && request.quantity > 1 && (
                <p className='text-xs text-muted-foreground'>{formatMinutes(request.estimatedMinutesPerUnit)} por peça</p>
              )}
            </Info>
            <Info label='Debitado do estoque'>{formatGrams(request.consumedGrams)}</Info>
            <Info label='Máquina'>{request.machine?.name}</Info>
            <Info label='Início'>{request.startedAt && formatDateTime(request.startedAt)}</Info>
            <Info label='Fim'>{request.finishedAt && formatDateTime(request.finishedAt)}</Info>
            {/* Prototipagem com partnumber vinculado vira item de produção ao ser finalizada. */}
            {request.type === 'PROTOTIPAGEM' && (
              <div className='sm:col-span-3'>
                <Info label='Item de produção'>
                  {request.partNumber ? (
                    <span className='inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800'>
                      <Factory className='size-3.5' /> Sim
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'>
                      <FlaskConical className='size-3.5' /> Não
                    </span>
                  )}
                </Info>
              </div>
            )}
            {request.description && (
              <div className='sm:col-span-3'>
                <Info label='Descrição'>
                  <p className='whitespace-pre-wrap'>{request.description}</p>
                </Info>
              </div>
            )}
            {request.createdItem && (
              <div className='sm:col-span-3'>
                <Info label='Item gerado'>
                  <Link to={ROUTES.ITENS} className='underline'>
                    {request.createdItem.code} — {request.createdItem.name}
                  </Link>
                </Info>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Arquivos auxiliares</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-2'>
            {request.attachments.length === 0 && <p className='text-sm text-muted-foreground'>Nenhum arquivo.</p>}
            {request.attachments.map((file) => (
              <button
                key={file.id}
                type='button'
                onClick={() => void requestsApi.downloadAttachment(request.id, file)}
                className='flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent'
              >
                <Paperclip className='size-4 shrink-0 text-muted-foreground' />
                <span className='flex-1 truncate'>{file.originalName}</span>
                <Download className='size-4 text-muted-foreground' />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={request.type === 'PROTOTIPAGEM' && !closed ? 'estimativa' : 'falhas'}>
        <TabsList>
          {request.type === 'PROTOTIPAGEM' && !closed && <TabsTrigger value='estimativa'>Estimativa</TabsTrigger>}
          <TabsTrigger value='falhas'>
            Falhas {request.failures.length > 0 && `(${request.failures.length})`}
          </TabsTrigger>
          <TabsTrigger value='historico'>Histórico</TabsTrigger>
        </TabsList>

        {request.type === 'PROTOTIPAGEM' && !closed && (
          <TabsContent value='estimativa'>
            <Card>
              <CardContent>
                <EstimateEditor request={request} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value='falhas' className='flex flex-col gap-3'>
          {request.failures.length > 0 && (
            <p className='text-sm text-muted-foreground'>Total perdido: {formatGrams(lostTotal)}</p>
          )}
          {request.failures.map((f) => (
            <Card key={f.id} className='py-3'>
              <CardContent className='flex flex-wrap items-start justify-between gap-2 px-4'>
                <div>
                  <p className='text-sm'>{f.reason}</p>
                  <p className='text-xs text-muted-foreground'>
                    {formatDateTime(f.createdAt)} · {f.user?.name ?? '—'} {f.machine && `· ${f.machine.name}`}
                    {f.processMinutes != null && ` · ${formatMinutes(f.processMinutes)} de processo`}
                  </p>
                </div>
                <span className='text-sm font-medium text-red-700'>−{formatGrams(f.lostGrams)}</span>
              </CardContent>
            </Card>
          ))}
          {request.failures.length === 0 && <p className='text-sm text-muted-foreground'>Sem falhas registradas.</p>}
        </TabsContent>

        <TabsContent value='historico'>
          <Card>
            <CardContent>
              <HistoryTimeline request={request} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* "Marcar falha" abre o registro da falha (gramas, observação e tempo); os demais status, a troca simples. */}
      {target === 'FALHA_IMPRESSAO' && (
        <FailureDialog request={request} onOpenChange={(open) => !open && setTarget(null)} />
      )}
      {target && target !== 'FALHA_IMPRESSAO' && (
        <StatusChangeDialog
          key={target}
          request={request}
          target={target}
          onOpenChange={(open) => !open && setTarget(null)}
        />
      )}
      {itemDialog && (
        <ItemFormDialog
          open={itemDialog}
          onOpenChange={setItemDialog}
          defaults={{
            name: request.itemName ?? '',
            description: request.description ?? '',
            filamentId: request.filamentId,
            partNumbers: request.partNumber ? [request.partNumber] : [],
            gramsPerUnit: request.estimatedGramsPerUnit ?? undefined,
            minutesPerUnit: request.estimatedMinutesPerUnit ?? undefined,
            originRequestId: request.id,
            originTrackingCode: request.trackingCode,
          }}
        />
      )}
    </div>
  );
}
