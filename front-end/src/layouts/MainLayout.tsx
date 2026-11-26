import { useState } from 'react';
import { ExternalLink, LogOut, Menu } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BrandMark, SiteFrame } from '@/components/SiteFrame';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getSidebarNavItemsForRole, pathMatchesNavSegment } from '@/config/roleAccess';
import type { SidebarNavItem } from '@/config/sidebar';
import { useAuth } from '@/contexts/useAuth';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/constants';
import { formattedRoles } from '@/utils/roles';

function initialsOf(name: string | undefined) {
  if (!name) return '3D';
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ? formattedRoles[user.role] : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className='flex items-center gap-2 rounded-full border bg-background py-1 pr-3 pl-1 text-left shadow-xs transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none'
        >
          <Avatar className='size-7'>
            <AvatarFallback className='bg-primary text-[11px] font-semibold text-primary-foreground'>
              {initialsOf(user?.name)}
            </AvatarFallback>
          </Avatar>
          <span className='hidden max-w-32 truncate text-xs font-medium sm:block'>{user?.name ?? 'Usuário'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' sideOffset={8} className='min-w-56'>
        <DropdownMenuLabel className='font-normal'>
          <p className='truncate text-sm font-semibold'>{user?.name}</p>
          <p className='text-xs text-muted-foreground'>{role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open(ROUTES.SOLICITACAO, '_blank')}>
          <ExternalLink /> Página de solicitação
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
            navigate(ROUTES.LOGIN);
          }}
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Links do topo: texto pequeno; o ativo ganha uma pílula cinza. */
function TopNavLinks({ items, pathname }: { items: SidebarNavItem[]; pathname: string }) {
  return (
    <nav aria-label='Principal' className='hidden items-center gap-1 md:flex'>
      {items.map((item) => {
        const active = pathMatchesNavSegment(pathname, item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.shortLabel ?? item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function MobileNav({ items, pathname }: { items: SidebarNavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant='outline' size='icon' className='md:hidden' onClick={() => setOpen(true)} aria-label='Abrir menu'>
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side='left' className='w-72'>
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className='sr-only'>Navegação do sistema</SheetDescription>
          </SheetHeader>
          <nav aria-label='Principal' className='flex flex-col gap-1 px-4'>
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathMatchesNavSegment(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium',
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function MainLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const items = user ? getSidebarNavItemsForRole(user.role) : [];

  const header = (
    <header className='grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-background px-4 py-2.5 sm:px-8'>
      <div className='flex items-center gap-2'>
        <MobileNav items={items} pathname={pathname} />
        <BrandMark to={ROUTES.FILA} />
      </div>
      <TopNavLinks items={items} pathname={pathname} />
      <div className='flex justify-end'>
        <UserMenu />
      </div>
    </header>
  );

  return (
    <SiteFrame header={header} className='h-svh' contentClassName='min-h-0 overflow-y-auto'>
      <main className='flex min-w-0 flex-1 flex-col gap-6 px-4 pt-2 pb-10 sm:px-8'>
        <Outlet />
      </main>
    </SiteFrame>
  );
}
