import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { FilamentPicker } from '@/components/FilamentDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppDialogContent } from '@/components/AppDialogContent';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { filamentsApi } from '@/services/filaments';
import { itemsApi, type Item, type PartNumberLinkInput } from '@/services/items';

export interface ItemFormDefaults {
  name?: string;
  description?: string;
  filamentId?: string;
  /** Partnumbers já conhecidos (ex.: informados na prototipagem). */
  partNumbers?: string[];
  /** Estimativa por peça vinda da prototipagem. */
  gramsPerUnit?: number;
  minutesPerUnit?: number;
  originRequestId?: string;
  originTrackingCode?: string;
}

/**
 * Editar item: partnumbers vinculados, com vincular/desvincular na hora (cada partnumber é
 * validado na API da Pedertractor). Independente do "Salvar" dos demais campos.
 */
function LinkedPartNumbers({ item }: { item: Item }) {
  const queryClient = useQueryClient();
  const [partNumbers, setPartNumbers] = useState(item.partNumbers);
  const [value, setValue] = useState('');
  const [perPart, setPerPart] = useState('1');

  const applied = (saved: Item) => {
    setPartNumbers(saved.partNumbers);
    void queryClient.invalidateQueries({ queryKey: ['items'] });
  };
  const add = useMutation({
    mutationFn: () => itemsApi.addPartNumber(item.id, { partNumber: value.trim(), quantityPerPart: Number(perPart) }),
    onSuccess: (saved) => {
      applied(saved);
      setValue('');
      setPerPart('1');
      toast.success('Partnumber vinculado');
    },
  });
  const updateQty = useMutation({
    mutationFn: ({ linkId, quantityPerPart }: { linkId: string; quantityPerPart: number }) =>
      itemsApi.updatePartNumber(item.id, linkId, quantityPerPart),
    onSuccess: (saved) => {
      applied(saved);
      toast.success('Itens por peça atualizados');
    },
  });
  const remove = useMutation({
    mutationFn: (linkId: string) => itemsApi.removePartNumber(item.id, linkId),
    onSuccess: (saved) => {
      applied(saved);
      toast.success('Partnumber desvinculado');
    },
  });

  const submit = () => {
    if (!value.trim() || add.isPending) return;
    if (!isPositiveInt(perPart)) return toast.error('Itens por peça deve ser um número inteiro maior que zero');
    add.mutate();
  };

  return (
    <Field>
      <FieldLabel htmlFor='pn-link'>
        Partnumbers vinculados <span className='font-normal text-muted-foreground'>({partNumbers.length})</span>
      </FieldLabel>
      {partNumbers.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Nenhum partnumber vinculado.</p>
      ) : (
        <ul className='flex flex-col divide-y rounded-xl border'>
          {partNumbers.map((pn) => (
            <li key={pn.id} className='flex items-center justify-between gap-3 px-3 py-2'>
              <div className='min-w-0'>
                <p className='font-mono text-sm font-semibold'>{pn.partNumber}</p>
                {pn.partDescription && <p className='truncate text-xs text-muted-foreground'>{pn.partDescription}</p>}
              </div>
              <PerPartInput
                key={`${pn.id}-${pn.quantityPerPart}`}
                initial={pn.quantityPerPart}
                disabled={updateQty.isPending}
                onCommit={(quantityPerPart) => updateQty.mutate({ linkId: pn.id, quantityPerPart })}
              />
              <Button
                type='button'
                size='icon'
                variant='ghost'
                className='size-7 shrink-0'
                disabled={remove.isPending}
                onClick={() => remove.mutate(pn.id)}
                aria-label={`Desvincular ${pn.partNumber}`}
                title='Desvincular'
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className='flex gap-2'>
        <Input
          id='pn-link'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter vincula o partnumber em vez de enviar o formulário do item.
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder='Vincular partnumber'
        />
        <PerPartField id='pn-link-qty' value={perPart} onChange={setPerPart} onEnter={submit} />
        <Button type='button' variant='outline' onClick={submit} disabled={add.isPending || !value.trim()}>
          <Plus />
        </Button>
      </div>
      <FieldDescription>Itens por peça: quantos deste item vão em uma peça do partnumber.</FieldDescription>
    </Field>
  );
}

function isPositiveInt(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/** Campo "× itens por peça" ao lado do partnumber. */
function PerPartField({
  id,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <div className='flex shrink-0 items-center gap-1.5'>
      <span className='text-sm text-muted-foreground'>×</span>
      <Input
        id={id}
        type='number'
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
        className='w-20'
        aria-label='Itens por peça'
        title='Itens por peça'
      />
    </div>
  );
}

/** Itens por peça de um partnumber já vinculado: salva ao sair do campo ou com Enter. */
function PerPartInput({
  initial,
  disabled,
  onCommit,
}: {
  initial: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [value, setValue] = useState(String(initial));
  const commit = () => {
    if (!isPositiveInt(value)) {
      setValue(String(initial));
      return;
    }
    if (Number(value) !== initial) onCommit(Number(value));
  };
  return (
    <label className='flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground'>
      ×
      <Input
        type='number'
        min={1}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        className='h-7 w-16'
        aria-label='Itens por peça'
      />
      por peça
    </label>
  );
}

/** Cria (com partnumbers) ou edita os dados de um item. */
export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  defaults?: ItemFormDefaults;
  onSaved?: (item: Item) => void;
}) {
  const queryClient = useQueryClient();
  const editing = Boolean(item);
  const [name, setName] = useState(item?.name ?? defaults?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? defaults?.description ?? '');
  const [filamentId, setFilamentId] = useState<string | null>(item?.filamentId ?? defaults?.filamentId ?? null);
  // Prévia do código no cadastro novo; o definitivo é gerado ao salvar (pode avançar se outro item for salvo antes).
  const { data: nextCode } = useQuery({
    queryKey: ['items', 'next-code'],
    queryFn: itemsApi.nextCode,
    enabled: open && !editing,
    staleTime: 0,
  });
  const { data: activeFilaments = [] } = useQuery({
    queryKey: ['filaments', 'active'],
    queryFn: () => filamentsApi.list({ activeOnly: true }),
  });
  // Ao editar, mantém visível o filamento atual mesmo se ele tiver sido desativado.
  const filamentOptions =
    item && !activeFilaments.some((f) => f.id === item.filamentId) ? [item.filament, ...activeFilaments] : activeFilaments;
  const [gramsPerUnit, setGramsPerUnit] = useState(item ? String(item.gramsPerUnit) : defaults?.gramsPerUnit ? String(defaults.gramsPerUnit) : '');
  const [minutesPerUnit, setMinutesPerUnit] = useState(
    item ? String(item.printMinutesPerUnit) : defaults?.minutesPerUnit ? String(defaults.minutesPerUnit) : '',
  );
  const [unitsPerPrint, setUnitsPerPrint] = useState(item ? String(item.unitsPerPrint) : '1');
  const [partNumberInput, setPartNumberInput] = useState('');
  const [perPartInput, setPerPartInput] = useState('1');
  const [partNumbers, setPartNumbers] = useState<PartNumberLinkInput[]>(
    (defaults?.partNumbers ?? []).map((partNumber) => ({ partNumber, quantityPerPart: 1 })),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        filamentId: filamentId!,
        gramsPerUnit: Number(gramsPerUnit),
        printMinutesPerUnit: Number(minutesPerUnit),
        unitsPerPrint: Number(unitsPerPrint),
      };
      return editing
        ? itemsApi.update(item!.id, payload)
        : itemsApi.create({ ...payload, partNumbers, originRequestId: defaults?.originRequestId ?? null });
    },
    onSuccess: (saved) => {
      toast.success(editing ? 'Item atualizado' : `Item ${saved.code} registrado`);
      void queryClient.invalidateQueries();
      onSaved?.(saved);
      onOpenChange(false);
    },
  });

  const addPartNumber = () => {
    const value = partNumberInput.trim().toUpperCase();
    if (!value) return;
    if (!isPositiveInt(perPartInput)) return toast.error('Itens por peça deve ser um número inteiro maior que zero');
    const link = { partNumber: value, quantityPerPart: Number(perPartInput) };
    // Repetir o partnumber atualiza a quantidade.
    setPartNumbers((prev) => [...prev.filter((p) => p.partNumber !== value), link]);
    setPartNumberInput('');
    setPerPartInput('1');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!filamentId) return toast.error('Escolha o filamento');
    mutation.mutate();
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent className='sm:max-w-2xl'>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar item ${item!.code}` : 'Registrar item'}</DialogTitle>
            <DialogDescription>
              {defaults?.originTrackingCode
                ? `A partir da prototipagem ${defaults.originTrackingCode}.`
                : 'Os partnumbers são validados na API da Pedertractor.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className='py-4'>
            <div className='grid gap-4 sm:grid-cols-[10rem_1fr]'>
              <Field>
                <FieldLabel>Código</FieldLabel>
                {/* Gerado pelo servidor ao salvar (ITM-00001...), sem repetir. Só exibição: não recebe clique, foco nem seleção. */}
                <div
                  aria-label='Código gerado automaticamente'
                  className='pointer-events-none flex h-8 items-center rounded-md border border-input bg-muted/60 px-3 font-mono text-sm text-muted-foreground shadow-xs select-none'
                >
                  {item?.code ?? nextCode ?? 'Gerando…'}
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor='name'>Nome *</FieldLabel>
                <Input id='name' value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor='desc'>Descrição</FieldLabel>
              <Textarea id='desc' rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Filamento *</FieldLabel>
              <FilamentPicker
                filaments={filamentOptions}
                value={filamentId}
                onChange={setFilamentId}
                emptyMessage='Nenhum filamento ativo. Cadastre um na tela Filamentos.'
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Field>
                <FieldLabel htmlFor='g'>Gramas por unidade *</FieldLabel>
                <Input id='g' type='number' min={1} value={gramsPerUnit} onChange={(e) => setGramsPerUnit(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor='m'>Minutos por unidade *</FieldLabel>
                <Input id='m' type='number' min={1} value={minutesPerUnit} onChange={(e) => setMinutesPerUnit(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor='u' className='whitespace-nowrap'>
                  Unidades por impressão *
                </FieldLabel>
                <Input id='u' type='number' min={1} value={unitsPerPrint} onChange={(e) => setUnitsPerPrint(e.target.value)} required />
              </Field>
            </div>

            {!editing && (
              <Field>
                <FieldLabel htmlFor='pn'>Partnumbers que usam este item</FieldLabel>
                <div className='flex gap-2'>
                  <Input
                    id='pn'
                    value={partNumberInput}
                    onChange={(e) => setPartNumberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPartNumber();
                      }
                    }}
                    placeholder='Digite e pressione Enter'
                  />
                  <PerPartField id='pn-qty' value={perPartInput} onChange={setPerPartInput} onEnter={addPartNumber} />
                  <Button type='button' variant='outline' onClick={addPartNumber}>
                    <Plus />
                  </Button>
                </div>
                {partNumbers.length > 0 && (
                  <div className='flex flex-wrap gap-1'>
                    {partNumbers.map((pn) => (
                      <Badge key={pn.partNumber} variant='secondary' className='gap-1'>
                        {pn.partNumber}
                        <span className='font-normal text-muted-foreground'>× {pn.quantityPerPart}</span>
                        <button
                          type='button'
                          onClick={() => setPartNumbers((prev) => prev.filter((p) => p.partNumber !== pn.partNumber))}
                          aria-label={`Remover ${pn.partNumber}`}
                        >
                          <X className='size-3' />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <FieldDescription>
                  Informe quantos deste item vão em uma peça de cada partnumber (× itens por peça). Na solicitação de
                  produção o solicitante informa só as peças e a quantidade de itens é calculada. Você pode vincular mais
                  partnumbers depois, no editar do item.
                </FieldDescription>
              </Field>
            )}

            {editing && <LinkedPartNumbers item={item!} />}
          </FieldGroup>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
