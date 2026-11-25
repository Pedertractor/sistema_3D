import { $Enums } from '../generated/prisma/client.js';
import { env } from '../env/index.js';

/** Admin garantido pelo seed. Senha inicial = número do cartão. */
export const BOOTSTRAP_ADMIN_CARD = env.SEED_ADMIN_CARD;
export const BOOTSTRAP_ADMIN_UNIT = env.SEED_ADMIN_UNIT as $Enums.Unit;
export const BOOTSTRAP_ADMIN_ROLE = $Enums.UserRole.ADMIN;
