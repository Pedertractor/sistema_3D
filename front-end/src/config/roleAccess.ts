import { SIDEBAR_NAV_ITEMS, type SidebarNavItem } from '@/config/sidebar';
import type { UserRole } from '@/types/auth';

export function pathMatchesNavSegment(pathname: string, navPath: string): boolean {
  const normalized = pathname || '/';
  return normalized === navPath || normalized.startsWith(`${navPath}/`);
}

export function pathMatchesNavExact(pathname: string, navPath: string): boolean {
  return pathMatchesNavSegment(pathname, navPath);
}

/** Rota do painel liberada para o papel? (rotas fora da sidebar ficam liberadas) */
export function canRoleAccessPath(role: UserRole, pathname: string): boolean {
  const item = SIDEBAR_NAV_ITEMS.find((nav) => pathMatchesNavSegment(pathname, nav.path));
  return item ? item.roles.includes(role) : true;
}

export function getSidebarNavItemsForRole(role: UserRole): SidebarNavItem[] {
  return SIDEBAR_NAV_ITEMS.filter((item) => item.roles.includes(role));
}
