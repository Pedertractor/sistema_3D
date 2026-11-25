import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import { ALL_ROLES } from '../../constants/roles.js';
import {
  addFailure,
  changeStatus,
  downloadAttachment,
  getRequest,
  listRequests,
  queueEstimate,
  updateEstimate,
} from '../controllers/request-controller.js';

const tags = ['requests'];
const security = [{ bearerAuth: [] }];

export async function requestRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', roleMiddleware(ALL_ROLES));

  app.get('/', { schema: { tags, security, summary: 'Fila de produção (filtros: status, type, search)' } }, listRequests);
  app.get('/queue-estimate', { schema: { tags, security, summary: 'Tempo restante da fila' } }, queueEstimate);
  app.get('/:id', { schema: { tags, security, summary: 'Detalhe da solicitação' } }, getRequest);
  app.patch('/:id/status', { schema: { tags, security, summary: 'Alterar status (inicia impressão, pausa, finaliza...)' } }, changeStatus);
  app.patch('/:id/estimate', { schema: { tags, security, summary: 'Ajustar gramas/tempo estimados' } }, updateEstimate);
  app.post('/:id/failures', { schema: { tags, security, summary: 'Registrar falha e material perdido' } }, addFailure);
  app.get('/:id/attachments/:attachmentId', { schema: { tags, security, summary: 'Baixar arquivo auxiliar' } }, downloadAttachment);
}
