import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AppDialogContent } from '@/components/AppDialogContent';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requestsApi, type RequestDetail } from '@/services/requests';

/**
 * Aberto pelo botão "Marcar falha": registra o material perdido (debitado do estoque), a observação
 * e o tempo de processo até a falha, muda o status para "Falha na impressão" e libera a máquina.
 */
export function FailureDialog({ request, onOpenChange }: { request: RequestDetail; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [lostGrams, setLostGrams] = useState('');
  const [processMinutes, setProcessMinutes] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      requestsApi.addFailure(request.id, {
        lostGrams: Number(lostGrams || 0),
        processMinutes: processMinutes ? Number(processMinutes) : null,
        reason,
        markAsFailed: true,
      }),
    onSuccess: () => {
      toast.success('Falha registrada e material baixado do estoque');
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <AppDialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Marcar falha</DialogTitle>
            <DialogDescription>
              {request.trackingCode} — o status muda para “Falha na impressão” e a máquina é liberada.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className='py-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='lost'>Material perdido (g) *</FieldLabel>
                <Input
                  id='lost'
                  type='number'
                  min={0}
                  value={lostGrams}
                  onChange={(e) => setLostGrams(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='process'>Tempo de processo (min)</FieldLabel>
                <Input
                  id='process'
                  type='number'
                  min={0}
                  value={processMinutes}
                  onChange={(e) => setProcessMinutes(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor='reason'>Observação *</FieldLabel>
              <Textarea
                id='reason'
                rows={3}
                placeholder='O que aconteceu?'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type='submit' variant='destructive' disabled={mutation.isPending}>
              Registrar falha
            </Button>
          </DialogFooter>
        </form>
      </AppDialogContent>
    </Dialog>
  );
}
