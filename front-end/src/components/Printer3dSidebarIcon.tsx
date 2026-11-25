import { forwardRef, useImperativeHandle, useState } from 'react';
import { Printer3d } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { AnimatedIconHandle, SidebarIcon } from '@/config/sidebar';

/**
 * Ícone da impressora 3D (lucide) no formato dos ícones animados da sidebar:
 * aceita o mesmo ref e dá um leve balanço ao passar o mouse.
 */
export const Printer3dSidebarIcon: SidebarIcon = forwardRef<
  AnimatedIconHandle,
  { size?: number; className?: string; animateOnHover?: boolean } & React.HTMLAttributes<HTMLDivElement>
>(({ size = 24, className, animateOnHover, ...props }, ref) => {
  void animateOnHover; // a animação é disparada pelo ref (hover da área do link), não por este prop

  const [active, setActive] = useState(false);
  useImperativeHandle(ref, () => ({ startAnimation: () => setActive(true), stopAnimation: () => setActive(false) }), []);
  return (
    <div className={cn('inline-flex', className)} {...props}>
      <Printer3d
        size={size}
        className={cn('transition-transform duration-300', active && '-translate-y-px -rotate-6')}
        aria-hidden
      />
    </div>
  );
});
Printer3dSidebarIcon.displayName = 'Printer3dSidebarIcon';
