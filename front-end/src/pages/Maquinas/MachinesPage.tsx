import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { MachineStatusBadge } from '@/components/StatusBadges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppDialogContent } from '@/components/AppDialogContent';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { machineDetailPath } from '@/routes/constants';
import { machinesApi, type Machine } from '@/services/machines';
import { MACHINE_STATUS_LABELS, type MachineStatus } from '@/types/domain';
import type { ImageChange } from '@/components/ImagePicker';
import { MachineImage, MachineImagePicker } from './MachineImage';
import { RunningJobChip } from './RunningJobChip';

/** Status que o operador pode escolher manualmente (IMPRIMINDO é automático). */
const MANUAL_STATUSES: MachineStatus[] = ['DISPONIVEL', 'MANUTENCAO', 'INATIVA'];

function MachineDialog({ machine, open, onOpenChange }: { machine: Machine | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(machine?.name ?? '');
  const [model, setModel] = useState(machine?.model ?? '');
  const [notes, setNotes] = useState(machine?.notes ?? '');
  const [image, setImage] = useState<ImageChange>({ kind: 'keep' });

  const mutation = useMutation({
    mutationFn: async () => {
      const input = { name, model: model || null, notes: notes || null };
      const saved = machine ? await machinesApi.update(machine.id, input) : await machinesApi.create(input);
      if (image.kind === 'replace') await machinesApi.uploadImage(saved.id, image.file);
      if (image.kind === 'remove') await machinesApi.removeImage(saved.id);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['machines'] }),
    onSuccess: () => {
      toast.success(machine ? 'Máquina atualizada' : 'Máquina registrada');
      onOpenChange(false);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{machine ? 'Editar máquina' : 'Registrar máquina'}</DialogTitle>
          </DialogHeader>
          <FieldGroup className='py-4'>
            <Field>
              <FieldLabel htmlFor='mname'>Nome / identificação *</FieldLabel>
              <Input id='mname' value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor='mmodel'>Modelo</FieldLabel>
              <Input id='mmodel' value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor='mnotes'>Observações</FieldLabel>
              <Textarea id='mnotes' rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor='mimage'>Foto</FieldLabel>
              <MachineImagePicker machine={machine} value={image} onChange={setImage} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
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

export function MachinesPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; machine: Machine | null }>({ open: false, machine: null });
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: machinesApi.list,
    refetchInterval: 20_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MachineStatus }) => machinesApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Status da máquina alterado');
      void queryClient.invalidateQueries();
    },
  });

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader
        title='Máquinas'
        description='Registro e status das impressoras. “Imprimindo” é definido automaticamente pela fila.'
        actions={
          <Button onClick={() => setDialog({ open: true, machine: null })}>
            <Plus /> Registrar máquina
          </Button>
        }
      />

      {isLoading && <p className='text-muted-foreground'>Carregando…</p>}
      {!isLoading && machines.length === 0 && (
        <p className='text-muted-foreground'>Nenhuma máquina cadastrada ainda.</p>
      )}

      <div className='grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4'>
        {machines.map((machine) => {
          const job = machine.requests[0];
          return (
            <Card key={machine.id} className='gap-3 overflow-hidden pt-0 pb-4 transition-shadow hover:shadow-md'>
              {/* Foto e nome abrem o histórico da máquina. */}
              <Link to={machineDetailPath(machine.id)} className='group flex flex-col gap-3 outline-none' title='Ver histórico da máquina'>
                <MachineImage machine={machine} className='aspect-auto h-36 rounded-none' />
                <CardHeader className='px-4'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <CardTitle className='text-base group-hover:underline group-focus-visible:underline'>{machine.name}</CardTitle>
                      <CardDescription>{machine.model ?? 'Modelo não informado'}</CardDescription>
                    </div>
                    <MachineStatusBadge status={machine.status} />
                  </div>
                </CardHeader>
              </Link>
              <CardContent className='flex flex-1 flex-col gap-3 px-4'>
                {job ? (
                  <RunningJobChip
                    job={job}
                    startedAt={machine.runs?.find((r) => r.requestId === job.id)?.startedAt ?? job.startedAt}
                  />
                ) : (
                  machine.notes && <p className='line-clamp-2 text-sm text-muted-foreground'>{machine.notes}</p>
                )}
                <div className='mt-auto flex gap-2'>
                  <Select
                    value={machine.status}
                    disabled={machine.status === 'IMPRIMINDO'}
                    onValueChange={(status) => statusMutation.mutate({ id: machine.id, status: status as MachineStatus })}
                  >
                    <SelectTrigger className='flex-1'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {machine.status === 'IMPRIMINDO' && (
                        <SelectItem value='IMPRIMINDO'>{MACHINE_STATUS_LABELS.IMPRIMINDO}</SelectItem>
                      )}
                      {MANUAL_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {MACHINE_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant='outline' size='icon' onClick={() => setDialog({ open: true, machine })}>
                    <Pencil />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {dialog.open && (
        <MachineDialog
          machine={dialog.machine}
          open={dialog.open}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        />
      )}
    </div>
  );
}
