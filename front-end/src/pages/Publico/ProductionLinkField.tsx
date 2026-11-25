import { type KeyboardEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Info, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/constants';
import { publicApi } from '@/services/public';
import { PartDrawingButton } from './PartDrawingButton';
import type { ProductionLink } from './production-link';

const OPTIONS = [
  { value: true, label: 'Sim', hint: 'Vai ser produzido depois' },
  { value: false, label: 'Não', hint: 'Só o protótipo' },
] as const;

/** "Vai ser item de produção?" — no "sim", pede o partnumber e confere na base da Pedertractor. */
export function ProductionLinkField({ value, onChange }: { value: ProductionLink; onChange: (value: ProductionLink) => void }) {
  const lookup = useMutation({
    mutationFn: () => publicApi.lookupPart(value.partNumberInput),
    onSuccess: (data) => onChange({ ...value, lookup: data }),
    onError: () => onChange({ ...value, lookup: null }),
  });

  const search = () => {
    if (value.partNumberInput.trim() && !lookup.isPending) lookup.mutate();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      search();
    }
  };

  const part = value.lookup?.part;
  const existingItems = value.lookup?.items.length ?? 0;

  return (
    <div className='flex flex-col gap-3'>
      <div role='radiogroup' aria-label='Vai ser item de produção?' className='grid grid-cols-2 gap-2'>
        {OPTIONS.map((option) => {
          const selected = value.forProduction === option.value;
          return (
            <button
              key={option.label}
              type='button'
              role='radio'
              aria-checked={selected}
              onClick={() => {
                lookup.reset();
                onChange({ ...value, forProduction: option.value, lookup: option.value ? value.lookup : null });
              }}
              className={cn(
                'flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
              )}
            >
              <span className='font-semibold'>{option.label}</span>
              <span className={cn('text-xs', selected ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{option.hint}</span>
            </button>
          );
        })}
      </div>

      {value.forProduction && (
        <div className='flex flex-col gap-3'>
          <div className='flex gap-2'>
            <label htmlFor='protoPartNumber' className='sr-only'>
              Partnumber
            </label>
            <Input
              id='protoPartNumber'
              placeholder='Partnumber, ex.: 33Q6_BR02024'
              readOnly={Boolean(part)}
              value={value.partNumberInput}
              onChange={(e) => {
                lookup.reset();
                onChange({ ...value, partNumberInput: e.target.value, lookup: null });
              }}
              onKeyDown={onKeyDown}
            />
            {part ? (
              // Verificado: o botão vira um X que limpa o partnumber para buscar outro.
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-9 shrink-0'
                aria-label='Limpar partnumber'
                title='Limpar partnumber'
                onClick={() => {
                  lookup.reset();
                  onChange({ ...value, partNumberInput: '', lookup: null });
                  document.getElementById('protoPartNumber')?.focus();
                }}
              >
                <X />
              </Button>
            ) : (
              <Button type='button' onClick={search} disabled={!value.partNumberInput.trim() || lookup.isPending}>
                <Search /> {lookup.isPending ? 'Verificando…' : 'Verificar'}
              </Button>
            )}
          </div>

          {lookup.isError && (
            <div role='alert' className='flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900'>
              <CircleAlert className='mt-0.5 size-5 shrink-0 text-red-700' />
              <p>{apiErrorMessage(lookup.error, 'Não foi possível consultar o partnumber')}</p>
            </div>
          )}

          {part && (
            <div role='status' className='flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
              <CircleCheck className='mt-0.5 size-5 shrink-0 text-emerald-700' />
              <div className='min-w-0 flex-1 text-sm text-emerald-900'>
                <p className='font-semibold'>Peça encontrada na base da Pedertractor</p>
                <p className='mt-0.5'>
                  <span className='font-mono'>{part.partNumber}</span>
                  {part.description && <span className='text-emerald-900/80'> · {part.description}</span>}
                </p>
              </div>
              <PartDrawingButton partNumber={part.partNumber} description={part.description} drawings={part.drawings} />
            </div>
          )}

          {part && existingItems > 0 && (
            <div className='flex items-start gap-3 rounded-2xl border bg-secondary/60 p-4 text-sm'>
              <Info className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
              <p>
                Já existe {existingItems === 1 ? 'um item cadastrado' : `${existingItems} itens cadastrados`} para esta peça. Se for
                só produzir,{' '}
                <Link to={ROUTES.SOLICITACAO_PRODUCAO} className='font-medium underline underline-offset-4'>
                  faça uma solicitação de produção
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
