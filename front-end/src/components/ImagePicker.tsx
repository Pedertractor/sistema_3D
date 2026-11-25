import { useRef, type ChangeEvent } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useObjectUrl } from '@/hooks/use-object-url';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/** O que fazer com a foto ao salvar o formulário. */
export type ImageChange = { kind: 'keep' } | { kind: 'replace'; file: File } | { kind: 'remove' };

/** Seletor de foto de formulário: mostra a foto salva ou a nova escolhida, com trocar/remover. */
export function ImagePicker({
  id,
  savedUrl,
  value,
  onChange,
}: {
  id: string;
  /** URL da foto já salva (null se não houver). */
  savedUrl: string | null;
  value: ImageChange;
  onChange: (change: ImageChange) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const newUrl = useObjectUrl(value.kind === 'replace' ? value.file : null);
  const previewUrl = value.kind === 'replace' ? newUrl : value.kind === 'remove' ? null : savedUrl;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange({ kind: 'replace', file });
    e.target.value = '';
  };

  const remove = () => onChange(savedUrl ? { kind: 'remove' } : { kind: 'keep' });

  return (
    <div className='flex flex-col gap-2'>
      <input ref={inputRef} id={id} type='file' accept={IMAGE_ACCEPT} className='sr-only' onChange={onFile} />
      {previewUrl ? (
        <div className='relative overflow-hidden rounded-md border'>
          <img src={previewUrl} alt='Pré-visualização da foto' className='h-40 w-full object-cover' />
          <div className='absolute right-2 bottom-2 flex gap-2'>
            <Button type='button' size='sm' variant='secondary' onClick={() => inputRef.current?.click()}>
              <ImagePlus /> Trocar
            </Button>
            <Button type='button' size='sm' variant='secondary' onClick={remove}>
              <Trash2 /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          className='flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
        >
          <ImagePlus className='size-6' aria-hidden />
          Adicionar foto
          <span className='text-xs'>JPG, PNG, WEBP ou GIF</span>
        </button>
      )}
    </div>
  );
}
