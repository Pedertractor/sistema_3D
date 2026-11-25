import type { ReactNode } from 'react';
import { Printer3d } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

/** Logo: bloco preto com a impressora 3D + nome em duas linhas. */
export function BrandMark({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('group flex shrink-0 items-center gap-2.5', className)} aria-label='Sistema 3D, início'>
      <span className='flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6'>
        <Printer3d className='size-[18px]' />
      </span>
      <span className='flex flex-col text-[11px] leading-[1.15] font-semibold tracking-[0.08em] text-foreground uppercase'>
        <span>Sistema 3D</span>
        <span className='text-muted-foreground'>Impressão</span>
      </span>
    </Link>
  );
}

/**
 * Fundo cinza de "estúdio" com uma moldura branca arredondada por cima,
 * como a página de referência. Todo o conteúdo do sistema mora dentro da moldura.
 */
export function SiteFrame({
  header,
  children,
  className,
  contentClassName,
}: {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn('flex min-h-svh w-full bg-[hsl(var(--canvas))] p-2 sm:p-4', className)}>
      <div className='relative flex min-h-full w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] bg-background shadow-[var(--shadow-frame)] sm:rounded-[2rem]'>
        {header}
        <div className={cn('flex min-w-0 flex-1 flex-col', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
