import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, History, PackagePlus, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { AppDialogContent } from '@/components/AppDialogContent';
import { FilamentThumb } from '@/components/FilamentDisplay';
import { ImagePicker, type ImageChange } from '@/components/ImagePicker';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatGrams } from '@/lib/format';
import { cn } from '@/lib/utils';
import { filamentImageUrl, filamentsApi, type FilamentAvailability } from '@/services/filaments';
import {
  FILAMENT_RIGIDITY_LABELS,
  FILAMENT_TYPE_SUGGESTIONS,
  MOVEMENT_TYPE_LABELS,
  type FilamentRigidity,
} from '@/types/domain';

const RIGIDITIES: FilamentRigidity[] = ['RIGIDO', 'MALEAVEL'];

function RigidityToggle({ value, onChange }: { value: FilamentRigidity | null; onChange: (v: FilamentRigidity) => void }) {
  return (
    <div role='radiogroup' className='flex gap-2'>
      {RIGIDITIES.map((option) => (
        <button
          key={option}
          type='button'
          role='radio'
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'flex-1 rounded-md border px-4 py-2 text-sm transition-colors',
            value === option ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
          )}
        >
          {FILAMENT_RIGIDITY_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

/** Cadastro livre ou edição de um filamento. */
function FilamentDialog({ filament, onClose }: { filament: FilamentAvailability | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const editing = Boolean(filament);
  const [type, setType] = useState(filament?.type ?? '');
  const [colorName, setColorName] = useState(filament?.colorName ?? '');
  const [colorHex, setColorHex] = useState(filament?.colorHex ?? '#1F2937');
  const [rigidity, setRigidity] = useState<FilamentRigidity | null>(filament?.rigidity ?? null);
  const [almxCode, setAlmxCode] = useState(filament?.almxCode ?? '');
  const [minStock, setMinStock] = useState(filament ? String(filament.minStockGrams || '') : '');
  const [initialStock, setInitialStock] = useState('');
  const [active, setActive] = useState(filament?.active ?? true);
  const [image, setImage] = useState<ImageChange>({ kind: 'keep' });

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        type,
        colorName,
        colorHex,
        rigidity: rigidity!,
        almxCode,
        minStockGrams: minStock ? Number(minStock) : 0,
      };
      const saved = filament
        ? await filamentsApi.update(filament.id, { ...input, active })
        : await filamentsApi.create({ ...input, ...(initialStock ? { initialStockGrams: Number(initialStock) } : {}) });
      if (image.kind === 'replace') await filamentsApi.uploadImage(saved.id, image.file);
      if (image.kind === 'remove') await filamentsApi.removeImage(saved.id);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['filaments'] }),
    onSuccess: () => {
      toast.success(editing ? 'Filamento atualizado' : 'Filamento cadastrado');
      onClose();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!rigidity) return toast.error('Escolha se o filamento é rígido ou maleável');
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <AppDialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar filamento' : 'Cadastrar filamento'}</DialogTitle>
            <DialogDescription>Tipo, cor e rigidez definem o filamento. Cada um tem seu próprio saldo.</DialogDescription>
          </DialogHeader>
          <FieldGroup className='py-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='ftype'>Tipo *</FieldLabel>
                <Input id='ftype' list='filament-types' value={type} onChange={(e) => setType(e.target.value)} placeholder='Ex.: PLA' required />
                <datalist id='filament-types'>
                  {FILAMENT_TYPE_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field>
                <FieldLabel htmlFor='fcolorname'>Cor *</FieldLabel>
                <div className='flex gap-2'>
                  <label
                    className='relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs'
                    style={{ backgroundColor: colorHex }}
                    title='Escolher a cor'
                  >
                    <input
                      type='color'
                      aria-label='Escolher a cor'
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      className='absolute inset-0 size-full cursor-pointer opacity-0'
                    />
                  </label>
                  <Input id='fcolorname' value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder='Ex.: Preto' required />
                </div>
              </Field>
            </div>
            <Field>
              <FieldLabel>Rigidez *</FieldLabel>
              <RigidityToggle value={rigidity} onChange={setRigidity} />
            </Field>
            <Field>
              <FieldLabel htmlFor='almx'>Código no almoxarifado (ALMX) *</FieldLabel>
              <Input id='almx' value={almxCode} onChange={(e) => setAlmxCode(e.target.value)} required />
              <FieldDescription>Mostrado ao solicitante quando faltar material.</FieldDescription>
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='min'>Estoque mínimo (g)</FieldLabel>
                <Input id='min' type='number' min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              </Field>
              {!editing && (
                <Field>
                  <FieldLabel htmlFor='init'>Estoque inicial (g)</FieldLabel>
                  <Input id='init' type='number' min={0} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
                </Field>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor='fimage'>Foto</FieldLabel>
              <ImagePicker id='fimage' savedUrl={filament ? filamentImageUrl(filament) : null} value={image} onChange={setImage} />
            </Field>
            {editing && (
              <Field orientation='horizontal'>
                <Switch id='factive' checked={active} onCheckedChange={setActive} />
                <FieldLabel htmlFor='factive'>Ativo (aparece para itens e solicitações)</FieldLabel>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}

function MovementDialog({ filament, onClose }: { filament: FilamentAvailability; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'ENTRADA' | 'AJUSTE' | 'ESTOQUE_INICIAL'>('ENTRADA');
  const [grams, setGrams] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => filamentsApi.addMovement(filament.id, { type, grams: Number(grams), note: note || null }),
    onSuccess: (data) => {
      toast.success('Movimentação registrada');
      if (data.released.length) {
        toast.info(`Liberadas para impressão: ${data.released.join(', ')}`);
      }
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <AppDialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Movimentar estoque</DialogTitle>
            <DialogDescription>
              {filament.label} · saldo atual {formatGrams(filament.stockGrams)}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className='py-4'>
            <Field>
              <FieldLabel>Tipo</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ENTRADA'>Entrada (recebi material)</SelectItem>
                  <SelectItem value='ESTOQUE_INICIAL'>Estoque inicial</SelectItem>
                  <SelectItem value='AJUSTE'>Ajuste (inventário, +/-)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor='mg'>Gramas *</FieldLabel>
              <Input id='mg' type='number' value={grams} onChange={(e) => setGrams(e.target.value)} required />
              {type === 'AJUSTE' && <FieldDescription>Use valor negativo para baixar do estoque.</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel htmlFor='mn'>Observação</FieldLabel>
              <Input id='mn' value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}

function MovementsSheet({ filament, onClose }: { filament: FilamentAvailability; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['filament-movements', filament.id],
    queryFn: () => filamentsApi.movements(filament.id),
  });
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>Movimentações</SheetTitle>
          <SheetDescription>{filament.label}</SheetDescription>
        </SheetHeader>
        <div className='px-4'>
          {isLoading ? (
            <p className='text-muted-foreground'>Carregando…</p>
          ) : data.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Nenhuma movimentação ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className='text-right'>Gramas</TableHead>
                  <TableHead className='text-right'>Saldo</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className='text-xs'>{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className='text-xs'>{MOVEMENT_TYPE_LABELS[m.type]}</TableCell>
                    <TableCell className={cn('text-right text-xs', m.grams < 0 ? 'text-red-700' : 'text-emerald-700')}>
                      {m.grams > 0 ? '+' : ''}
                      {formatGrams(m.grams)}
                    </TableCell>
                    <TableCell className='text-right text-xs'>{formatGrams(m.balanceAfter)}</TableCell>
                    <TableCell className='max-w-48 truncate text-xs text-muted-foreground'>
                      {m.request?.trackingCode ?? m.note ?? ''} {m.user ? `· ${m.user.name}` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilamentCard({
  filament,
  onEdit,
  onMove,
  onHistory,
}: {
  filament: FilamentAvailability;
  onEdit: () => void;
  onMove: () => void;
  onHistory: () => void;
}) {
  const low = filament.stockGrams <= filament.minStockGrams;
  const committedPct = filament.stockGrams > 0 ? Math.min(100, (filament.committedGrams / filament.stockGrams) * 100) : 0;
  return (
    <Card className={cn('gap-3 overflow-hidden pt-0 pb-4', low && filament.active && 'border-amber-300', !filament.active && 'opacity-60')}>
      <FilamentThumb filament={filament} className='h-28 w-full' />
      <CardHeader className='px-4'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <CardTitle className='truncate text-base'>{filament.label}</CardTitle>
            <CardDescription>
              ALMX <span className='font-mono'>{filament.almxCode}</span>
            </CardDescription>
          </div>
          <div className='flex shrink-0 flex-col items-end gap-1'>
            <Badge variant='outline'>{filament.rigidityLabel}</Badge>
            {!filament.active && <Badge variant='secondary'>Inativo</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col gap-3 px-4'>
        <div>
          <p className='text-2xl font-semibold'>{formatGrams(filament.stockGrams)}</p>
          <p className='text-xs text-muted-foreground'>em estoque · mínimo {formatGrams(filament.minStockGrams)}</p>
        </div>
        <div className='flex flex-col gap-1'>
          <Progress value={committedPct} />
          <div className='flex justify-between gap-2 text-xs text-muted-foreground'>
            <span>Na fila: {formatGrams(filament.committedGrams)}</span>
            <span className={cn(filament.availableGrams < 0 && 'font-medium text-red-700')}>
              Livre: {formatGrams(filament.availableGrams)}
            </span>
          </div>
        </div>
        {low && filament.active && (
          <p className='flex items-center gap-1 text-xs text-amber-800'>
            <AlertTriangle className='size-3 shrink-0' /> Abaixo do mínimo, abrir ordem ALMX
          </p>
        )}
        <div className='mt-auto flex gap-2'>
          <Button size='sm' className='flex-1' onClick={onMove}>
            <PackagePlus /> Movimentar
          </Button>
          <Button size='icon' variant='outline' className='size-8' onClick={onHistory} aria-label='Histórico'>
            <History />
          </Button>
          <Button size='icon' variant='outline' className='size-8' onClick={onEdit} aria-label='Editar'>
            <Pencil />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FilamentsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['filaments'], queryFn: () => filamentsApi.list() });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ open: boolean; filament: FilamentAvailability | null }>({ open: false, filament: null });
  const [movement, setMovement] = useState<FilamentAvailability | null>(null);
  const [history, setHistory] = useState<FilamentAvailability | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((f) => `${f.label} ${f.rigidityLabel} ${f.almxCode}`.toLowerCase().includes(term));
  }, [data, search]);

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader
        title='Estoque de filamentos'
        description='Saldo em gramas por filamento. O consumo é baixado ao colocar uma solicitação em impressão; falhas baixam o material perdido.'
        actions={
          <Button onClick={() => setEditing({ open: true, filament: null })}>
            <Plus /> Cadastrar filamento
          </Button>
        }
      />

      {data.length > 0 && (
        <div className='relative max-w-md'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input className='pl-9' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Tipo, cor, rigidez ou código ALMX' />
        </div>
      )}

      {isLoading && <p className='text-muted-foreground'>Carregando…</p>}
      {!isLoading && data.length === 0 && (
        <p className='text-muted-foreground'>Nenhum filamento cadastrado ainda. Use “Cadastrar filamento” para começar.</p>
      )}
      {!isLoading && data.length > 0 && filtered.length === 0 && (
        <p className='text-muted-foreground'>Nenhum filamento encontrado.</p>
      )}

      <div className='grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4'>
        {filtered.map((filament) => (
          <FilamentCard
            key={filament.id}
            filament={filament}
            onEdit={() => setEditing({ open: true, filament })}
            onMove={() => setMovement(filament)}
            onHistory={() => setHistory(filament)}
          />
        ))}
      </div>

      {editing.open && (
        <FilamentDialog
          key={editing.filament?.id ?? 'new'}
          filament={editing.filament}
          onClose={() => setEditing({ open: false, filament: null })}
        />
      )}
      {movement && <MovementDialog filament={movement} onClose={() => setMovement(null)} />}
      {history && <MovementsSheet filament={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
