import { cn } from '@/lib/utils';
import { UNIT, type Unit } from '@/types/auth';
import { UNIT_LABELS } from '@/utils/roles';

/** Letra exibida no botão de cada unidade. */
const UNIT_SHORT: Record<Unit, string> = {
  PEDERTRACTOR: 'P',
  TRACTOR: 'T',
};

type UnitToggleProps = {
  value: Unit;
  onChange: (unit: Unit) => void;
  className?: string;
  'aria-label'?: string;
};

/** Seleção da unidade como dois botões (P = Pedertractor, T = Tractor); clicar em um seleciona ele. */
export function UnitToggle({ value, onChange, className, 'aria-label': ariaLabel = 'Unidade' }: UnitToggleProps) {
  return (
    // A caixa tem a mesma altura, raio, borda e sombra do <Input>; P e T ficam lado a lado dentro dela.
    <div
      role='radiogroup'
      aria-label={ariaLabel}
      className={cn('inline-flex h-8 shrink-0 gap-0.5 rounded-md border border-input p-0.5 shadow-xs', className)}
    >
      {UNIT.map((unit) => {
        const selected = unit === value;
        return (
          <button
            key={unit}
            type='button'
            role='radio'
            aria-checked={selected}
            aria-label={UNIT_LABELS[unit]}
            title={UNIT_LABELS[unit]}
            onClick={() => onChange(unit)}
            className={cn(
              'flex w-10 items-center justify-center rounded-[7px] first:rounded-l-[11px] last:rounded-r-[11px] text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {UNIT_SHORT[unit]}
          </button>
        );
      })}
    </div>
  );
}
