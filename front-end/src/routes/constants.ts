/**
 * Constantes de rotas. Arquivo separado para evitar dependência circular
 * (config/sidebar e outros podem importar ROUTES sem carregar o router).
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  // Público (solicitante sem login)
  SOLICITACAO: '/solicitacao',
  SOLICITACAO_PROTOTIPAGEM: '/solicitacao/prototipagem',
  SOLICITACAO_PRODUCAO: '/solicitacao/producao',
  ACOMPANHAR: '/acompanhar',
  ACOMPANHAR_CODIGO: '/acompanhar/:trackingCode',
  // Painel (ADMIN / OPERATOR)
  DASHBOARD: '/dashboard',
  FILA: '/fila',
  FILA_DETALHE: '/fila/:id',
  MAQUINAS: '/maquinas',
  MAQUINA_DETALHE: '/maquinas/:id',
  FILAMENTOS: '/filamentos',
  ITENS: '/itens',
  USUARIOS: '/usuarios',
  NOT_FOUND: '*',
} as const;

export function requestDetailPath(id: string) {
  return `/fila/${id}`;
}

export function machineDetailPath(id: string) {
  return `/maquinas/${id}`;
}

export function trackPath(trackingCode: string) {
  return `/acompanhar/${encodeURIComponent(trackingCode)}`;
}
