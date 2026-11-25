import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import { ALL_ROLES } from '../../constants/roles.js';
import {
  addItemPartNumber,
  createItem,
  getItem,
  getNextItemCode,
  listItems,
  removeItemPartNumber,
  updateItemPartNumber,
  updateItem,
} from '../controllers/item-controller.js';

const tags = ['items'];
const security = [{ bearerAuth: [] }];

export async function itemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', roleMiddleware(ALL_ROLES));

  app.get('/', { schema: { tags, security, summary: 'Listar itens (busca por código, nome ou partnumber)' } }, listItems);
  // Antes de "/:id" para "next-code" não ser lido como id.
  app.get('/next-code', { schema: { tags, security, summary: 'Prévia do próximo código de item' } }, getNextItemCode);
  app.get('/:id',{ schema: { tags, security, summary: 'Detalhe do item' } }, getItem);
  app.post('/', { schema: { tags, security, summary: 'Registrar item (manual ou a partir de prototipagem)' } }, createItem);
  app.patch('/:id', { schema: { tags, security, summary: 'Editar item' } }, updateItem);
  app.post('/:id/part-numbers', { schema: { tags, security, summary: 'Vincular partnumber (validado na API)' } }, addItemPartNumber);
  app.patch(
    '/:id/part-numbers/:linkId',
    { schema: { tags, security, summary: 'Alterar quantos itens vão em uma peça do partnumber' } },
    updateItemPartNumber,
  );
  app.delete('/:id/part-numbers/:linkId', { schema: { tags, security, summary: 'Desvincular partnumber' } }, removeItemPartNumber);
}
