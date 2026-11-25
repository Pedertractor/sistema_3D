import { $Enums } from '../generated/prisma/client.js';

export const ALL_ROLES: $Enums.UserRole[] = [
  $Enums.UserRole.ADMIN,
  $Enums.UserRole.OPERATOR,
];

export const ADMIN_ONLY: $Enums.UserRole[] = [$Enums.UserRole.ADMIN];
