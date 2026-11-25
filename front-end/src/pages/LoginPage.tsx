import { Link } from 'react-router-dom';

import { LoginForm } from '@/components/login-form';
import { BrandMark, SiteFrame } from '@/components/SiteFrame';
import { StudioScene } from '@/components/StudioScene';
import { ROUTES } from '@/routes/constants';

/**
 * Login em altura fixa da janela (sem rolagem da página): formulário à esquerda e,
 * em telas largas, o painel com a cena de estúdio, que se ajusta ao espaço que sobra.
 */
export function LoginPage() {
  return (
    <SiteFrame className='h-svh' contentClassName='min-h-0 lg:flex-row'>
      <div className='flex min-h-0 flex-1 flex-col px-6 py-5 sm:px-10'>
        <BrandMark to={ROUTES.SOLICITACAO} />
        {/* overflow-y-auto só entra em janelas muito baixas; no tamanho normal tudo cabe. */}
        <div className='mx-auto flex min-h-0 w-full max-w-sm flex-1 flex-col justify-center gap-5 overflow-y-auto py-4'>
          <div>
            <h1 className='text-[clamp(1.875rem,4.5vh,2.5rem)] leading-none font-extrabold tracking-[-0.04em]'>
              Painel da equipe 3D
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>Fila, máquinas, filamentos e itens em um só lugar.</p>
          </div>
          <LoginForm />
          <p className='text-center text-sm text-muted-foreground'>
            Quer pedir uma impressão?{' '}
            <Link to={ROUTES.SOLICITACAO} className='font-medium text-foreground underline underline-offset-4'>
              Abrir solicitação
            </Link>
          </p>
        </div>
      </div>

      <div className='relative m-3 hidden min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-[#f6f6f7] to-[#eceef1] lg:flex'>
        <div className='shrink-0 px-10 pt-[clamp(1.5rem,6vh,3rem)]'>
          <p className='text-[clamp(2.25rem,6vh,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.045em]'>
            Manufatura Aditiva
          </p>
          <p className='mt-3 max-w-sm text-sm text-muted-foreground'>Pedertractor &amp; Tractorcomponents</p>
        </div>
        {/* A cena ocupa todo o espaço restante e se encaixa nele (largura ou altura, o que limitar primeiro). */}
        <div className='relative mt-4 min-h-0 flex-1'>
          <StudioScene fit='contain' className='absolute inset-0' />
        </div>
      </div>
    </SiteFrame>
  );
}
