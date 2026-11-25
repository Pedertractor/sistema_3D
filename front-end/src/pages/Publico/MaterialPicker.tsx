import { Check } from 'lucide-react';

import { FilamentSwatch } from '@/components/FilamentDisplay';
import { cn } from '@/lib/utils';
import type { PublicFilament } from '@/services/public';
import type { FilamentRigidity } from '@/types/domain';
import { availableColors, type MaterialChoice } from './material-choice';

const RIGIDITY_OPTIONS: { value: FilamentRigidity; title: string; hint: string }[] = [
  { value: 'RIGIDO', title: 'Rígido', hint: 'Peça firme, que não dobra' },
  { value: 'MALEAVEL', title: 'Maleável', hint: 'Flexível, tipo borracha' },
];

/** Prototipagem: o solicitante escolhe rígido ou maleável e, depois, uma das cores que existem nesse tipo. */
export function MaterialPicker({
  filaments,
  value,
  onChange,
}: {
  filaments: PublicFilament[];
  value: MaterialChoice;
  onChange: (value: MaterialChoice) => void;
}) {
  const colors = value.rigidity ? availableColors(filaments, value.rigidity) : [];

  const chooseRigidity = (rigidity: FilamentRigidity) => {
    if (rigidity === value.rigidity) return;
    const options = availableColors(filaments, rigidity);
    // Só uma cor nesse tipo (ex.: maleável só preto): já deixa escolhida.
    onChange({ rigidity, colorName: options.length === 1 ? options[0]!.colorName : null });
  };

  return (
    <div className='flex flex-col gap-4'>
      <div role='radiogroup' aria-label='Tipo de material' className='grid gap-2 sm:grid-cols-2'>
        {RIGIDITY_OPTIONS.map((option) => {
          const available = availableColors(filaments, option.value).length > 0;
          const selected = value.rigidity === option.value;
          return (
            <button
              key={option.value}
              type='button'
              role='radio'
              aria-checked={selected}
              disabled={!available}
              onClick={() => chooseRigidity(option.value)}
              className={cn(
                'relative flex flex-col items-start rounded-2xl border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
              )}
            >
              <span className='font-semibold'>{option.title}</span>
              <span className={cn('text-xs', selected ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                {available ? option.hint : 'Indisponível no momento'}
              </span>
              {selected && <Check className='absolute top-4 right-4 size-4' />}
            </button>
          );
        })}
      </div>

      {value.rigidity && (
        <div className='flex flex-col gap-2'>
          <p className='text-sm font-medium'>Cor</p>
          <div role='radiogroup' aria-label='Cor' className='flex flex-wrap gap-2'>
            {colors.map((color) => {
              const selected = value.colorName?.toLowerCase() === color.colorName.toLowerCase();
              return (
                <button
                  key={color.colorName}
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  onClick={() => onChange({ ...value, colorName: color.colorName })}
                  className={cn(
                    'flex items-center gap-2 rounded-full border py-2 pr-4 pl-2.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    selected ? 'border-primary ring-1 ring-primary' : 'bg-background hover:bg-accent',
                  )}
                >
                  <FilamentSwatch colorHex={color.colorHex} className='size-5' />
                  {color.colorName}
                  {selected && <Check className='size-3.5' />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
