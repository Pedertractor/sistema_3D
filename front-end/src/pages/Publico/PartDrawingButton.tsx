import { useState } from 'react';
import { ImageOff, Maximize2 } from 'lucide-react';

import { AppDialogContent } from '@/components/AppDialogContent';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { partDrawingUrl, type PartDrawing } from '@/services/public';

/**
 * Miniatura do desenho da peça; ao clicar abre um modal com o desenho ampliado.
 * Se a peça tiver mais de um desenho, o modal mostra miniaturas para alternar.
 */
export function PartDrawingButton({
  partNumber,
  description,
  drawings,
}: {
  partNumber: string;
  description: string | null;
  drawings: PartDrawing[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(false);

  if (drawings.length === 0 || failed) return null;

  const thumbUrl = partDrawingUrl(partNumber, drawings[0]!.index);
  const current = drawings[selected] ?? drawings[0]!;
  const currentUrl = partDrawingUrl(partNumber, current.index);

  return (
    <>
      <button
        type='button'
        onClick={() => {
          setSelected(0);
          setOpen(true);
        }}
        className='group relative size-16 shrink-0 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-xs transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
        aria-label={`Ver desenho da peça ${partNumber}`}
        title='Ver desenho'
      >
        <img src={thumbUrl} alt='' className='size-full object-contain p-1' onError={() => setFailed(true)} />
        <span className='absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100'>
          <Maximize2 className='size-4' />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <AppDialogContent className='sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Desenho da peça</DialogTitle>
            <DialogDescription>
              <span className='font-mono'>{partNumber}</span>
              {description ? ` · ${description}` : ''}
            </DialogDescription>
          </DialogHeader>

          <DrawingImage key={currentUrl} url={currentUrl} name={current.name} />

          {drawings.length > 1 && (
              <div className='flex flex-wrap gap-2'>
                {drawings.map((drawing, position) => (
                  <button
                    key={drawing.index}
                    type='button'
                    onClick={() => setSelected(position)}
                    className={cn(
                      'size-12 overflow-hidden rounded-lg border bg-white',
                      position === selected ? 'border-primary ring-1 ring-primary' : 'hover:border-foreground/30',
                    )}
                    aria-label={`Desenho ${position + 1}: ${drawing.name}`}
                  >
                    <img src={partDrawingUrl(partNumber, drawing.index)} alt='' className='size-full object-contain p-0.5' />
                  </button>
                ))}
              </div>
          )}
        </AppDialogContent>
      </Dialog>
    </>
  );
}

function DrawingImage({ url, name }: { url: string; name: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <div className='relative flex h-[min(70vh,40rem)] items-center justify-center overflow-hidden rounded-2xl border bg-white'>
      {status === 'loading' && <div className='absolute inset-0 animate-pulse bg-muted' />}
      {status === 'error' ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <ImageOff className='size-4' /> Não foi possível carregar o desenho.
        </p>
      ) : (
        <img
          src={url}
          alt={`Desenho ${name}`}
          className={cn('size-full object-contain p-2 transition-opacity', status === 'ready' ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}
