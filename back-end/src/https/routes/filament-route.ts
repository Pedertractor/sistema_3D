import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import { ALL_ROLES } from '../../constants/roles.js';
import {
  createFilament,
  createMovement,
  deleteFilamentImage,
  getFilamentImage,
  listFilaments,
  listMovements,
  updateFilament,
  uploadFilamentImage,
} from '../controllers/filament-controller.js';

const tags = ['filaments'];
const security = [{ bearerAuth: [] }];

export async function filamentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', roleMiddleware(ALL_ROLES));

  app.get('/', { schema: { tags, security, summary: 'Filamentos com saldo, comprometido e disponível (?active=true só ativos)' } }, listFilaments);
  app.post('/', { schema: { tags, security, summary: 'Cadastrar filamento (tipo, cor, rigidez, código ALMX)' } }, createFilament);
  app.patch('/:id', { schema: { tags, security, summary: 'Editar filamento / ativar ou desativar' } }, updateFilament);
  app.post('/:id/movements', { schema: { tags, security, summary: 'Entrada, estoque inicial ou ajuste' } }, createMovement);
  app.get('/:id/movements', { schema: { tags, security, summary: 'Histórico de movimentações' } }, listMovements);
  app.get('/:id/image', { schema: { tags, security, summary: 'Foto do filamento' } }, getFilamentImage);
  app.put(
    '/:id/image',
    { schema: { tags, security, summary: 'Enviar/substituir foto do filamento (multipart, campo "image")', consumes: ['multipart/form-data'] } },
    uploadFilamentImage,
  );
  app.delete('/:id/image', { schema: { tags, security, summary: 'Remover foto do filamento' } }, deleteFilamentImage);
}
