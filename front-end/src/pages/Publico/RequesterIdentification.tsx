import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react';

import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/api-error';
import { UnitToggle } from '@/components/UnitToggle';
import { publicApi } from '@/services/public';
import type { Unit } from '@/types/auth';
import type { RequesterState } from './requester-state';

/** Cartão completo o bastante para consultar (4 dígitos ou mais). */
const CARD_READY = /^\d{4,10}$/;
/** Espera o usuário parar de digitar antes de consultar a API. */
const LOOKUP_DELAY_MS = 400;

/**
 * Identificação pelo cartão + unidade. A consulta é automática: com 4+ dígitos e a unidade
 * escolhida, busca sozinha e mostra nome, setor e centro de custo encontrados.
 */
export function RequesterIdentification({
  value,
  onChange,
}: {
  value: RequesterState;
  onChange: Dispatch<SetStateAction<RequesterState>>;
}) {
  const { mutate, reset, isPending, isError, error } = useMutation({
    mutationFn: (vars: { cardNumber: string; unit: Unit }) => publicApi.identifyRequester(vars.unit, vars.cardNumber),
    // Só aplica se o cartão/unidade ainda forem os mesmos (o usuário pode ter digitado de novo nesse meio tempo).
    onSuccess: (identity, vars) =>
      onChange((prev) => (prev.cardNumber === vars.cardNumber && prev.unit === vars.unit ? { ...prev, identity } : prev)),
  });

  const cardNumber = value.cardNumber.trim();
  const unit = value.unit;

  useEffect(() => {
    if (!CARD_READY.test(cardNumber)) return;
    const timer = setTimeout(() => mutate({ cardNumber, unit }), LOOKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cardNumber, unit, mutate]);

  // Qualquer mudança no cartão ou na unidade invalida a identificação anterior.
  const update = (patch: Partial<RequesterState>) => {
    reset();
    onChange((prev) => ({ ...prev, ...patch, identity: null }));
  };

  const identity = value.identity;
  const errorMessage = isError && !identity ? apiErrorMessage(error, 'Não foi possível consultar o colaborador') : null;

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid gap-3 sm:grid-cols-[1fr_auto]'>
        <Field>
          <FieldLabel htmlFor='requesterCard'>Número do cartão *</FieldLabel>
          <div className='relative'>
            <Input
              id='requesterCard'
              inputMode='numeric'
              autoComplete='off'
              placeholder='Ex.: 5487'
              value={value.cardNumber}
              onChange={(e) => update({ cardNumber: e.target.value.replace(/\D/g, '') })}
              className='pr-10'
            />
            {isPending && (
              <Loader2
                className='absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground'
                aria-label='Buscando colaborador'
              />
            )}
          </div>
        </Field>
        <Field>
          <FieldLabel>Unidade *</FieldLabel>
          <UnitToggle value={value.unit} onChange={(next) => update({ unit: next })} />
        </Field>
      </div>

      {identity && (
        <div role='status' className='flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
          <CircleCheck className='mt-0.5 size-5 shrink-0 text-emerald-700' />
          <div className='min-w-0 text-sm'>
            <p className='font-semibold text-emerald-900'>Encontrado: {identity.name}</p>
            <dl className='mt-1 grid gap-x-6 gap-y-0.5 text-emerald-900/80 sm:grid-cols-2'>
              <div>
                <dt className='inline text-emerald-900/60'>Setor: </dt>
                <dd className='inline'>{identity.sectorName ?? 'não informado'}</dd>
              </div>
              <div>
                <dt className='inline text-emerald-900/60'>Centro de custo: </dt>
                <dd className='inline font-mono'>{identity.costCenter ?? 'não informado'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {errorMessage && (
        <div role='alert' className='flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900'>
          <CircleAlert className='mt-0.5 size-5 shrink-0 text-red-700' />
          <p>{errorMessage}</p>
        </div>
      )}

      {identity && (
        <Field>
          <FieldLabel htmlFor='requesterEmail'>E-mail para contato (opcional)</FieldLabel>
          <Input
            id='requesterEmail'
            type='email'
            value={value.email}
            onChange={(e) => onChange((prev) => ({ ...prev, email: e.target.value }))}
          />
        </Field>
      )}
    </div>
  );
}
