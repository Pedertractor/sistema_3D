import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Factory, FlaskConical, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES, trackPath } from '@/routes/constants';
import { PublicShell } from './PublicShell';

function OptionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className='flex flex-col gap-3 rounded-[1.5rem] border bg-background p-4 shadow-[var(--shadow-soft)] md:gap-4 md:p-6'>
      <div className='flex items-center gap-3 md:flex-col md:items-start md:gap-4'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:size-11 [&_svg]:size-4 md:[&_svg]:size-5'>
          {icon}
        </span>
        <h2 className='text-lg font-bold tracking-[-0.02em] md:text-xl'>{title}</h2>
      </div>
      <p className='-mt-1 text-sm text-muted-foreground md:-mt-3'>{description}</p>
      <div className='mt-auto'>{children}</div>
    </div>
  );
}

/** Três caminhos, tudo em uma tela: acompanhar, produção e prototipagem. */
export function PublicHomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const onTrack = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim()) navigate(trackPath(code.trim().toUpperCase()));
  };

  return (
    <PublicShell bare>
      <section className='mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-4 px-4 py-4 sm:px-8 md:gap-6 md:py-6'>
        <h1 className='text-center text-2xl font-extrabold tracking-[-0.035em] sm:text-4xl'>O que você precisa?</h1>
        <div className='grid gap-3 md:grid-cols-3 md:gap-4'>
          <OptionCard icon={<Search />} title='Acompanhar' description='Veja o status e o prazo com o código recebido.'>
            <form onSubmit={onTrack} className='flex gap-2'>
              <label htmlFor='track-code' className='sr-only'>
                Código da solicitação
              </label>
              <Input id='track-code' value={code} onChange={(e) => setCode(e.target.value)} placeholder='3D-2026-00001' />
              <Button type='submit' size='icon' aria-label='Acompanhar solicitação'>
                <ArrowRight />
              </Button>
            </form>
          </OptionCard>

          <OptionCard icon={<Factory />} title='Produção' description='Item já cadastrado: informe o partnumber e a quantidade.'>
            <Button asChild className='w-full'>
              <Link to={ROUTES.SOLICITACAO_PRODUCAO}>
                Solicitar produção <ArrowRight />
              </Link>
            </Button>
          </OptionCard>

          <OptionCard icon={<FlaskConical />} title='Prototipagem' description='Item novo: descreva, escolha o filamento e anexe foto ou sólido.'>
            <Button asChild variant='outline' className='w-full'>
              <Link to={ROUTES.SOLICITACAO_PROTOTIPAGEM}>
                Solicitar prototipagem <ArrowRight />
              </Link>
            </Button>
          </OptionCard>
        </div>
      </section>
    </PublicShell>
  );
}
