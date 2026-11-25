import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { filamentImageUrl } from '@/services/filaments';
import { FILAMENT_RIGIDITY_LABELS, filamentLabel, type FilamentSummary } from '@/types/domain';

/** Bolinha com a cor do filamento. */
export function FilamentSwatch({ colorHex, className }: { colorHex: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-3 shrink-0 rounded-full border border-black/15', className)}
      style={{ backgroundColor: colorHex }}
    />
  );
}

/** Cor + "PLA Preto" (+ rigidez, opcional) em uma linha. */
export function FilamentTag({
  filament,
  showRigidity = false,
  className,
}: {
  filament: FilamentSummary;
  showRigidity?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <FilamentSwatch colorHex={filament.colorHex} />
      <span>{filamentLabel(filament)}</span>
      {showRigidity && <span className='text-muted-foreground'>· {FILAMENT_RIGIDITY_LABELS[filament.rigidity]}</span>}
    </span>
  );
}

/** Foto do filamento ou, sem foto, um bloco na cor dele. */
export function FilamentThumb({ filament, className }: { filament: FilamentSummary; className?: string }) {
  const url = filamentImageUrl(filament);
  return (
    <div className={cn('overflow-hidden bg-muted', className)} style={url ? undefined : { backgroundColor: filament.colorHex }}>
      {url && <img src={url} alt={`Foto do filamento ${filamentLabel(filament)}`} className='size-full object-cover' />}
    </div>
  );
}

/** Escolha de um filamento cadastrado (cor, foto, tipo e rigidez visíveis). */
export function FilamentPicker({
  filaments,
  value,
  onChange,
  emptyMessage = 'Nenhum filamento ativo cadastrado.',
}: {
  filaments: FilamentSummary[];
  value: string | null;
  onChange: (filamentId: string) => void;
  emptyMessage?: string;
}) {
  if (filaments.length === 0) {
    return <p className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>{emptyMessage}</p>;
  }
  return (
    <div role='radiogroup' className='grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2'>
      {filaments.map((filament) => {
        const selected = value === filament.id;
        return (
          <button
            key={filament.id}
            type='button'
            role='radio'
            aria-checked={selected}
            onClick={() => onChange(filament.id)}
            className={cn(
              'relative flex flex-col overflow-hidden rounded-md border text-left text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              selected ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent',
            )}
          >
            <FilamentThumb filament={filament} className='h-14 w-full' />
            <span className='flex flex-col gap-0.5 p-2'>
              <span className='font-medium leading-tight'>{filamentLabel(filament)}</span>
              <span className='text-xs text-muted-foreground'>{FILAMENT_RIGIDITY_LABELS[filament.rigidity]}</span>
            </span>
            {selected && (
              <span className='absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                <Check className='size-3' />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
