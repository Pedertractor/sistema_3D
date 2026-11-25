import type { Unit, UserRole } from '@/types/auth';

export const formattedRoles: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador 3D',
};

export const UNIT_LABELS: Record<Unit, string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
};

export function roleLabel(role: string): string {
  return formattedRoles[role as UserRole] ?? role;
}
