import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import { ADMIN_ONLY } from '../../constants/roles.js';
import {
  changePassword,
  createUser,
  listUsers,
  login,
  me,
  resetUserPassword,
  updateUser,
} from '../controllers/user-controller.js';

const tags = ['users'];
const security = [{ bearerAuth: [] }];
const adminOnly = [authMiddleware, roleMiddleware(ADMIN_ONLY)];

export async function userRoutes(app: FastifyInstance) {
  app.post('/login', { schema: { tags, summary: 'Login (cartão + unidade + senha)' } }, login);

  app.get('/me', { preHandler: [authMiddleware], schema: { tags, security, summary: 'Usuário logado' } }, me);

  app.post(
    '/me/change-password',
    { preHandler: [authMiddleware], schema: { tags, security, summary: 'Trocar a própria senha' } },
    changePassword,
  );

  app.get('/', { preHandler: adminOnly, schema: { tags, security, summary: 'Listar usuários (admin)' } }, listUsers);
  app.post('/', { preHandler: adminOnly, schema: { tags, security, summary: 'Criar usuário (admin)' } }, createUser);
  app.patch('/:id', { preHandler: adminOnly, schema: { tags, security, summary: 'Editar usuário (admin)' } }, updateUser);
  app.post(
    '/:id/reset-password',
    { preHandler: adminOnly, schema: { tags, security, summary: 'Resetar senha para o cartão (admin)' } },
    resetUserPassword,
  );
}
