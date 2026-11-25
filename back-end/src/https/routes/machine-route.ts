import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import { ALL_ROLES } from '../../constants/roles.js';
import {
  createMachine,
  deleteMachineImage,
  getMachineHistory,
  getMachineImage,
  listMachines,
  updateMachine,
  uploadMachineImage,
} from '../controllers/machine-controller.js';

const tags = ['machines'];
const security = [{ bearerAuth: [] }];

export async function machineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', roleMiddleware(ALL_ROLES));

  app.get('/', { schema: { tags, security, summary: 'Listar máquinas' } }, listMachines);
  app.post('/', { schema: { tags, security, summary: 'Registrar máquina' } }, createMachine);
  app.patch('/:id', { schema: { tags, security, summary: 'Editar máquina / alterar status' } }, updateMachine);
  app.get('/:id/history', { schema: { tags, security, summary: 'Histórico e tempo de operação da máquina' } }, getMachineHistory);
  app.get('/:id/image', { schema: { tags, security, summary: 'Foto da máquina' } }, getMachineImage);
  app.put(
    '/:id/image',
    { schema: { tags, security, summary: 'Enviar/substituir foto da máquina (multipart, campo "image")', consumes: ['multipart/form-data'] } },
    uploadMachineImage,
  );
  app.delete('/:id/image', { schema: { tags, security, summary: 'Remover foto da máquina' } }, deleteMachineImage);
}
