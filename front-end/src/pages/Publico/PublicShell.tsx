import { ArrowLeft } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import { BrandMark, SiteFrame } from '@/components/SiteFrame';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/constants';

/** Mantido para os cards das páginas públicas; o visual vem do tema. */
export const publicCardClass = 'overflow-hidden';

const PUBLIC_LINKS = [
  { to: ROUTES.SOLICITACAO, label: 'Início', end: true },
  { to: ROUTES.SOLICITACAO_PRODUCAO, label: 'Produção' },
  { to: ROUTES.SOLICITACAO_PROTOTIPAGEM, label: 'Prototipagem' },
];

function PublicHeader() {
  return (
    <header className='grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8'>
      <BrandMark to={ROUTES.SOLICITACAO} />
      <nav aria-label='Solicitações' className='hidden items-center gap-1 sm:flex'>
        {PUBLIC_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className='flex justify-end'>
        <Button asChild variant='outline' size='sm'>
          <Link to={ROUTES.LOGIN}>Entrar</Link>
        </Button>
      </div>
    </header>
  );
}

export function PublicShell({
  children,
  backTo,
  className,
  bare = false,
}: {
  children: React.ReactNode;
  backTo?: string;
  className?: string;
  /** Sem a coluna central (a página controla a largura, ex.: o hero). */
  bare?: boolean;
}) {
  return (
    <SiteFrame header={<PublicHeader />}>
      {bare ? (
        <div className={cn('flex flex-1 flex-col', className)}>{children}</div>
      ) : (
        <div className={cn('mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-2 pb-10 [&>*]:shrink-0', className)}>
          {backTo && (
            <Link to={backTo} className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
              <ArrowLeft className='size-4' /> Voltar
            </Link>
          )}
          {children}
          <p className='mt-auto pt-6 text-center text-[11px] text-muted-foreground/70'>Pedertractor & Tractor · Impressão 3D</p>
        </div>
      )}
    </SiteFrame>
  );
}
