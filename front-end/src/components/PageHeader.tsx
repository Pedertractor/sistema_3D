import type { ReactNode } from 'react';

/** Título de página no estilo da referência: grande, pesado e compacto. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-4'>
      <div className='min-w-0'>
        <h1 className='text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl'>{title}</h1>
        {description && <p className='mt-1.5 max-w-2xl text-sm text-muted-foreground'>{description}</p>}
      </div>
      {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
    </div>
  );
}
