import type { ComponentProps } from 'react';

import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * DialogContent do projeto: a moldura arredondada não rola; o conteúdo rola por dentro,
 * então a barra de rolagem fica dentro do card, afastada das bordas.
 * (components/ui/dialog.tsx é gerado pelo shadcn e fica somente leitura.)
 */
export function AppDialogContent({ className, children, ...props }: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        'flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0',
        '[&>[data-slot=dialog-close]]:right-6 [&>[data-slot=dialog-close]]:z-10 [&>[data-slot=dialog-close]]:bg-background',
        className,
      )}
      {...props}
    >
      <div
        data-slot='dialog-body'
        className='my-2 mr-2 grid min-h-0 gap-4 overflow-y-auto py-4 pr-4 pl-6 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]'
      >
        {children}
      </div>
    </DialogContent>
  );
}
