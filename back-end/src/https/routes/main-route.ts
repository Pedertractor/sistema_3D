import type { FastifyInstance } from 'fastify';
import { userRoutes } from './user-route.js';
import { publicRoutes } from './public-route.js';
import { requestRoutes } from './request-route.js';
import { machineRoutes } from './machine-route.js';
import { filamentRoutes } from './filament-route.js';
import { itemRoutes } from './item-route.js';
import { dashboardRoutes } from './dashboard-route.js';

export async function mainRoutes(app: FastifyInstance) {
  app.register(publicRoutes, { prefix: '/public' });
  app.register(userRoutes, { prefix: '/users' });
  app.register(requestRoutes, { prefix: '/requests' });
  app.register(machineRoutes, { prefix: '/machines' });
  app.register(filamentRoutes, { prefix: '/filaments' });
  app.register(itemRoutes, { prefix: '/items' });
  app.register(dashboardRoutes, { prefix: '/dashboard' });
}
