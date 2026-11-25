export const UNIT = ['PEDERTRACTOR', 'TRACTOR'] as const;
export type Unit = (typeof UNIT)[number];

export const USER_ROLES = ['ADMIN', 'OPERATOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  cardNumber: string;
  unit: Unit;
  name: string;
  role: UserRole;
  /** Indica que o usuário deve trocar a senha (ex.: primeiro login) */
  mustChangePassword?: boolean;
  active?: boolean;
  createdAt?: string;
}

export type ListUser = Required<AuthUser>;
