import type {
  ComponentPropsWithoutRef,
  ForwardRefExoticComponent,
  HTMLAttributes,
  RefAttributes,
} from 'react';
import { BoxesIcon, ChartColumnIncreasingIcon, CogIcon, LayersIcon, LayoutGridIcon, UsersIcon } from 'lucide-animated';
import { ROUTES } from '@/routes/constants';
import type { UserRole } from '@/types/auth';

/** Handle comum dos ícones lucide-animated. */
export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

/** Ícone animado da sidebar (lucide-animated) — anima no hover da área do link. */
export type SidebarIcon = ForwardRefExoticComponent<
  {
    size?: number;
    className?: string;
    animateOnHover?: boolean;
  } & HTMLAttributes<HTMLDivElement> &
    RefAttributes<AnimatedIconHandle>
>;

export type SidebarIconProps = ComponentPropsWithoutRef<SidebarIcon>;

export interface SidebarNavChild {
  path: string;
  label: string;
  icon?: SidebarIcon;
}

export interface SidebarNavItem {
  path: string;
  label: string;
  /** Rótulo curto usado na navegação do topo (cai para label). */
  shortLabel?: string;
  icon: SidebarIcon;
  roles: UserRole[];
  children?: SidebarNavChild[];
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard de produção', shortLabel: 'Dashboard', icon: ChartColumnIncreasingIcon, roles: ['ADMIN', 'OPERATOR'] },
  { path: ROUTES.FILA, label: 'Fila de produção', shortLabel: 'Fila', icon: LayoutGridIcon, roles: ['ADMIN', 'OPERATOR'] },
  { path: ROUTES.MAQUINAS, label: 'Máquinas', icon: CogIcon, roles: ['ADMIN', 'OPERATOR'] },
  { path: ROUTES.FILAMENTOS, label: 'Estoque de filamentos', shortLabel: 'Filamentos', icon: LayersIcon, roles: ['ADMIN', 'OPERATOR'] },
  { path: ROUTES.ITENS, label: 'Itens', icon: BoxesIcon, roles: ['ADMIN', 'OPERATOR'] },
  { path: ROUTES.USUARIOS, label: 'Usuários', icon: UsersIcon, roles: ['ADMIN'] },
];
