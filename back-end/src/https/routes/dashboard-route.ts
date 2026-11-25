import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import { ALL_ROLES } from '../../constants/roles.js';
import { getProductionDashboard } from '../controllers/dashboard-controller.js';

const tags = ['dashboard'];
const security = [{ bearerAuth: [] }];

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', roleMiddleware(ALL_ROLES));

  app.get(
    '/production',
    { schema: { tags, security, summary: 'Horas produzidas no período (query: from, to em ISO)' } },
    getProductionDashboard,
  );
}
