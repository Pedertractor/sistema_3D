import '@fastify/jwt';
import type { $Enums } from '../generated/prisma/client.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
    };
    user: {
      sub: string;
      role: $Enums.UserRole;
      name: string;
      cardNumber: string;
      unit: $Enums.Unit;
    };
  }
}
