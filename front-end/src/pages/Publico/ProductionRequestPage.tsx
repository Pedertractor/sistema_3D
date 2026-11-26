import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiErrorMessage } from '@/lib/api-error';
import { AlertTriangle, CheckCircle2, CircleAlert, CircleCheck, Clock, Layers, Loader2, PackageSearch, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatGrams, formatMinutes, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES, trackPath } from '@/routes/constants';
import { publicApi, type PartLookup } from '@/services/public';
import { FilamentTag } from '@/components/FilamentDisplay';
import { PublicShell, publicCardClass } from './PublicShell';
import { PartDrawingButton } from './PartDrawingButton';
import { RequesterIdentification } from './RequesterIdentification';
import { EMPTY_REQUESTER, toRequester, type RequesterState } from './requester-state';

function useDebounced<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function ProductionRequestPage() {
  const navigate = useNavigate();
  const [partNumberInput, setPartNumberInput] = useState('');
  const [lookup, setLookup] = useState<PartLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [requester, setRequester] = useState<RequesterState>(EMPTY_REQUESTER);

  const lookupMutation = useMutation({
    mutationFn: publicApi.lookupPart,
    onSuccess: (data) => {
      setLookup(data);
      setLookupError(null);
      setItemId(data.items.length === 1 ? data.items[0]!.id : null);
    },
    onError: (error) => {
      setLookup(null);
      setItemId(null);
      setLookupError(apiErrorMessage(error, 'Erro ao consultar o partnumber'));
    },
  });

  const qty = Number(useDebounced(quantity));
  const previewEnabled = Boolean(lookup && itemId && Number.isInteger(qty) && qty > 0);

  const preview = useQuery({
    queryKey: ['production-preview', lookup?.part.partNumber, itemId, qty],
    queryFn: () => publicApi.previewProduction({ partNumber: lookup!.part.partNumber, itemId: itemId!, partQuantity: qty }),
    enabled: previewEnabled,
  });

  const submit = useMutation({
    mutationFn: () =>
      publicApi.createProduction({ partNumber: lookup!.part.partNumber, itemId: itemId!, partQuantity: qty, ...toRequester(requester) }),
    onSuccess: (data) => navigate(trackPath(data.trackingCode), { state: { created: true } }),
  });

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    if (partNumberInput.trim()) lookupMutation.mutate(partNumberInput.trim());
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!previewEnabled) return;
    if (!requester.identity) return toast.error('Identifique-se com o cartão e a unidade');
    submit.mutate();
  };

  const p = preview.data;
  const selectedItem = lookup?.items.find((i) => i.id === itemId);

  return (
    <PublicShell backTo={ROUTES.SOLICITACAO}>
      <div>
        <h1 className='text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl'>Solicitação de produção</h1>
        <p className='text-muted-foreground'>Identifique-se e busque o partnumber para ver os itens disponíveis.</p>
      </div>

      <Card className={publicCardClass}>
        <CardHeader>
          <CardTitle className='text-base'>1. Identificação</CardTitle>
          <CardDescription>Informe seu cartão e a unidade. Conferimos seus dados no cadastro da empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <RequesterIdentification value={requester} onChange={setRequester} />
        </CardContent>
      </Card>

      <Card className={publicCardClass}>
        <CardHeader>
          <CardTitle className='text-base'>2. Partnumber</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <form onSubmit={onSearch} className='flex gap-2'>
            <Input
              value={partNumberInput}
              onChange={(e) => {
                setPartNumberInput(e.target.value);
                // Mudou o partnumber: o resultado anterior não vale mais.
                if (lookup || lookupError) {
                  setLookup(null);
                  setLookupError(null);
                  setItemId(null);
                }
              }}
              placeholder='Ex.: 123456'
              autoFocus
            />
            <Button type='submit' disabled={lookupMutation.isPending}>
              {lookupMutation.isPending ? <Loader2 className='animate-spin' /> : <Search />} Buscar
            </Button>
          </form>

          {lookupError && (
            <div role='alert' className='flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900'>
              <CircleAlert className='mt-0.5 size-5 shrink-0 text-red-700' />
              <p>{lookupError}</p>
            </div>
          )}

          {lookup && (
            <div className='flex flex-col gap-3'>
              <div role='status' className='flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
                <CircleCheck className='mt-0.5 size-5 shrink-0 text-emerald-700' />
                <div className='min-w-0 flex-1 text-sm text-emerald-900'>
                  <p className='font-semibold'>Peça encontrada na base da Pedertractor</p>
                  <p className='mt-0.5'>
                    <span className='font-mono'>{lookup.part.partNumber}</span>
                    {lookup.part.description && <span className='text-emerald-900/80'> · {lookup.part.description}</span>}
                  </p>
                </div>
                <PartDrawingButton
                  partNumber={lookup.part.partNumber}
                  description={lookup.part.description}
                  drawings={lookup.part.drawings}
                />
              </div>

              <p className='text-sm font-medium'>
                {lookup.items.length === 0
                  ? 'Itens do Sistema 3D para esta peça'
                  : lookup.items.length === 1
                    ? '1 item do Sistema 3D para esta peça'
                    : `${lookup.items.length} itens do Sistema 3D para esta peça. Escolha um:`}
              </p>

              {lookup.items.length === 0 ? (
                <div className='flex flex-col items-start gap-3 rounded-2xl border border-dashed p-4'>
                  <div className='flex items-start gap-2 text-sm'>
                    <PackageSearch className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                    A peça existe, mas ainda não há item cadastrado para ela aqui. Peça uma prototipagem para criar o item.
                  </div>
                  <Button asChild variant='outline' size='sm'>
                    <Link
                      to={ROUTES.SOLICITACAO_PROTOTIPAGEM}
                      state={{
                        partNumber: lookup.part.partNumber,
                        // Leva a identificação já digitada para não pedir de novo na prototipagem.
                        cardNumber: requester.cardNumber,
                        unit: requester.unit,
                        email: requester.email,
                      }}
                    >
                      Solicitar via prototipagem
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className='grid gap-2 sm:grid-cols-2'>
                  {lookup.items.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => setItemId(item.id)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors',
                        itemId === item.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent',
                      )}
                    >
                      <p className='font-medium'>{item.code}</p>
                      <p className='text-sm'>{item.name}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        <FilamentTag filament={item.filament} /> · {formatGrams(item.gramsPerUnit)}/un ·{' '}
                        {item.unitsPerPrint} por impressão
                      </p>
                      <p className='mt-1 text-xs font-medium'>
                        {item.itemsPerPart} {item.itemsPerPart === 1 ? 'item' : 'itens'} por peça
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {lookup && itemId && (
        <form onSubmit={onSubmit} className='flex flex-col gap-4 [&>*]:shrink-0'>
          <Card className={publicCardClass}>
            <CardHeader>
              <CardTitle className='text-base'>3. Quantidade</CardTitle>
              <CardDescription>Quantas peças (partnumber) serão produzidas?</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-2'>
              <Field className='max-w-48'>
                <FieldLabel htmlFor='qty'>Quantidade de peças</FieldLabel>
                <Input id='qty' type='number' min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </Field>
              {selectedItem && selectedItem.itemsPerPart > 1 && (
                <p className='text-sm text-muted-foreground'>
                  Cada peça leva {selectedItem.itemsPerPart} itens {selectedItem.code}. A quantidade de itens é calculada
                  automaticamente.
                </p>
              )}
            </CardContent>
          </Card>

          {previewEnabled && (
            <Card className={cn(publicCardClass, 'border-orange-200 bg-orange-50/40')}>
              <CardHeader>
                <CardTitle className='text-base'>Visualização prévia</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-col gap-4'>
                {preview.isLoading && <p className='text-sm text-muted-foreground'>Calculando…</p>}
                {p && (
                  <>
                    <div className='grid gap-3 sm:grid-cols-3'>
                      <div className='rounded-lg bg-muted/60 p-3'>
                        <p className='text-xs text-muted-foreground'>Itens a produzir</p>
                        <p className='text-lg font-semibold'>{formatNumber(p.quantity)}</p>
                        <p className='text-xs text-muted-foreground'>
                          {formatNumber(p.partQuantity)} {p.partQuantity === 1 ? 'peça' : 'peças'} × {p.itemsPerPart}{' '}
                          {p.itemsPerPart === 1 ? 'item' : 'itens'} · {p.prints} impressão(ões)
                        </p>
                      </div>
                      <div className='rounded-lg bg-muted/60 p-3'>
                        <p className='flex items-center gap-1 text-xs text-muted-foreground'>
                          <Layers className='size-3' /> Filamento necessário
                        </p>
                        <p className='text-lg font-semibold'>{formatGrams(p.gramsNeeded)}</p>
                        <p className='text-xs text-muted-foreground'>{p.filament.label}</p>
                      </div>
                      <div className='rounded-lg bg-muted/60 p-3'>
                        <p className='flex items-center gap-1 text-xs text-muted-foreground'>
                          <Clock className='size-3' /> Prazo estimado
                        </p>
                        <p className='text-lg font-semibold'>
                          {p.estimate.totalMinutes != null ? formatMinutes(p.estimate.totalMinutes) : '—'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {p.estimate.estimatedCompletionAt
                            ? `até ${formatDateTime(p.estimate.estimatedCompletionAt)}`
                            : 'Nenhuma máquina disponível'}
                        </p>
                      </div>
                    </div>

                    {p.filament.sufficient ? (
                      <p className='flex items-center gap-2 text-sm text-emerald-700'>
                        <CheckCircle2 className='size-4' /> Filamento disponível em estoque (
                        {formatGrams(p.filament.availableGrams)} livres).
                      </p>
                    ) : (
                      <div className='flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'>
                        <AlertTriangle className='mt-0.5 size-4 shrink-0' />
                        <div>
                          <p className='font-medium'>Filamento insuficiente em estoque</p>
                          <p>
                            Faltam {formatGrams(p.filament.missingGrams)} de {p.filament.label}. Abra uma ordem no
                            almoxarifado{' '}
                            {p.filament.almxCode ? (
                              <>
                                com o código <span className='font-mono font-semibold'>{p.filament.almxCode}</span>
                              </>
                            ) : (
                              '(código ainda não cadastrado — fale com a equipe 3D)'
                            )}
                            . A solicitação entra na fila como “aguardando filamento”.
                          </p>
                        </div>
                      </div>
                    )}
                    <p className='text-xs text-muted-foreground'>
                      Prazo em horas corridas: {formatMinutes(p.estimate.queueMinutes)} de fila +{' '}
                      {formatMinutes(p.estimate.requestMinutes)} desta solicitação, dividido por{' '}
                      {p.estimate.productiveMachines} máquina(s).
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card className={publicCardClass}>
            <CardContent className='flex flex-col gap-2'>
              {!requester.identity && (
                <p className='text-sm text-muted-foreground'>Identifique-se no passo 1 para enviar.</p>
              )}
              <Button type='submit' disabled={!p || !requester.identity || submit.isPending}>
                {submit.isPending ? 'Enviando…' : 'Enviar solicitação'}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </PublicShell>
  );
}
