import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppDialogContent } from '@/components/AppDialogContent';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatGrams } from '@/lib/format';
import { machinesApi } from '@/services/machines';
import { requestsApi, type RequestDetail } from '@/services/requests';
import { requestStatusLabel, type RequestStatus } from '@/types/domain';

export function StatusChangeDialog({
  request,
  target,
  onOpenChange,
}: {
  request: RequestDetail;
  target: RequestStatus | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [machineId, setMachineId] = useState<string>(request.machine?.id ?? '');
  const [grams, setGrams] = useState<string>(request.estimatedGrams ? String(request.estimatedGrams) : '');
  const [note, setNote] = useState('');
  const [waitFilament, setWaitFilament] = useState(false);

  // Ao imprimir, a equipe pode marcar que falta filamento: a solicitação vai para "Aguardando filamento".
  const canWaitFilament = target === 'EM_IMPRESSAO' && request.status !== 'AGUARDANDO_FILAMENTO';
  const waiting = canWaitFilament && waitFilament;
  const finalStatus: RequestStatus | null = waiting ? 'AGUARDANDO_FILAMENTO' : target;
  const startingPrint = target === 'EM_IMPRESSAO' && !waiting;
  const firstConsumption = startingPrint && request.consumedGrams === 0;

  const machines = useQuery({ queryKey: ['machines'], queryFn: machinesApi.list, enabled: startingPrint });
  const available = (machines.data ?? []).filter((m) => m.status === 'DISPONIVEL');

  const mutation = useMutation({
    mutationFn: () =>
      requestsApi.changeStatus(request.id, {
        status: finalStatus!,
        machineId: startingPrint ? machineId || null : undefined,
        grams: firstConsumption && grams ? Number(grams) : undefined,
        note: note || null,
      }),
    onSuccess: () => {
      toast.success(`Status alterado para ${requestStatusLabel(finalStatus!, request.type)}`);
      setWaitFilament(false);
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <AppDialogContent>
        <DialogHeader>
          <DialogTitle>{target ? requestStatusLabel(target, request.type) : ''}</DialogTitle>
          <DialogDescription>
            {request.trackingCode} — {requestStatusLabel(request.status, request.type)} →{' '}
            {finalStatus ? requestStatusLabel(finalStatus, request.type) : ''}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {canWaitFilament && (
            <div className='flex items-start gap-2 rounded-lg border p-3'>
              <Checkbox id='wait-filament' checked={waitFilament} onCheckedChange={(v) => setWaitFilament(v === true)} />
              <div className='grid gap-0.5'>
                <Label htmlFor='wait-filament'>Aguardando filamento</Label>
                <p className='text-xs text-muted-foreground'>
                  Sem material para imprimir agora. A solicitação fica em “Aguardando filamento” até a entrada no estoque.
                </p>
              </div>
            </div>
          )}

          {startingPrint && (
            <Field>
              <FieldLabel>Máquina</FieldLabel>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Selecione uma máquina disponível' />
                </SelectTrigger>
                <SelectContent>
                  {available.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.model ? ` (${m.model})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {machines.isSuccess && available.length === 0 && (
                <FieldDescription className='text-destructive'>Nenhuma máquina disponível no momento.</FieldDescription>
              )}
            </Field>
          )}

          {firstConsumption && (
            <Field>
              <FieldLabel htmlFor='grams'>Filamento a debitar do estoque (g)</FieldLabel>
              <Input id='grams' type='number' min={1} value={grams} onChange={(e) => setGrams(e.target.value)} />
              <FieldDescription>
                {request.type === 'PRODUCAO'
                  ? `Calculado pelo item: ${formatGrams(request.estimatedGrams)}.`
                  : 'Informe quanto material a prototipagem vai consumir.'}{' '}
                O débito acontece agora, ao colocar em impressão.
              </FieldDescription>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor='note'>Observação</FieldLabel>
            <Textarea id='note' rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant={target === 'CANCELADO' ? 'destructive' : 'default'}
            disabled={mutation.isPending || (startingPrint && !machineId) || (firstConsumption && !grams)}
            onClick={() => mutation.mutate()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
