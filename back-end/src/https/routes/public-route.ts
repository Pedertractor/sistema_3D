import type { FastifyInstance } from 'fastify';
import {
  createProduction,
  createPrototype,
  identifyRequester,
  publicFilaments,
  lookupPart,
  partDrawing,
  previewProduction,
  trackRequest,
} from '../controllers/public-controller.js';
import { getFilamentImage } from '../controllers/filament-controller.js';

const tags = ['public'];

/** Rotas abertas: o solicitante não precisa de usuário. */
export async function publicRoutes(app: FastifyInstance) {
  app.get('/employees/:unit/:cardNumber', { schema: { tags, summary: 'Identificar solicitante (cartão + unidade) na API corporativa' } }, identifyRequester);
  app.get('/filaments', { schema: { tags, summary: 'Filamentos ativos (tipo, cor, rigidez)' } }, publicFilaments);
  app.get('/filaments/:id/image', { schema: { tags, summary: 'Foto do filamento' } }, getFilamentImage);
  app.get('/parts/:partNumber/drawings/:index', { schema: { tags, summary: 'Desenho da peça (imagem) vindo da API corporativa' } }, partDrawing);
  app.get('/parts/:partNumber', { schema: { tags, summary: 'Valida partnumber na API e lista itens disponíveis' } }, lookupPart);
  app.post('/requests/production/preview', { schema: { tags, summary: 'Visualização prévia (itens, filamento, prazo)' } }, previewProduction);
  app.post('/requests/production', { schema: { tags, summary: 'Criar solicitação de produção' } }, createProduction);
  app.post('/requests/prototype', { schema: { tags, summary: 'Criar solicitação de prototipagem (multipart)', consumes: ['multipart/form-data'] } }, createPrototype);
  app.get('/requests/:trackingCode', { schema: { tags, summary: 'Acompanhar solicitação pelo código' } }, trackRequest);
}
