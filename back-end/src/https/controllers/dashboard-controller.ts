import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DashboardService } from '../../services/dashboard-service.js';

export async function getProductionDashboard(request: FastifyRequest, reply: FastifyReply) {
  const { from, to } = z.object({ from: z.coerce.date(), to: z.coerce.date() }).parse(request.query);
  return reply.send(await new DashboardService().production(from, to));
}
