import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './env/index.js';
import { apiErrorHandler } from './https/errors/error-handler.js';
import { mainRoutes } from './https/routes/main-route.js';
import { healthRoutes } from './https/routes/health-route.js';

export const app = Fastify();

app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
});

app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: env.JWT_EXPIRES_IN,
  },
});

app.register(multipart, {
  limits: {
    fileSize: env.UPLOAD_MAX_MB * 1024 * 1024,
    files: 10,
  },
});

app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema 3D API',
      description: 'Solicitações de prototipagem/produção, fila das máquinas e estoque de filamentos',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'API' }],
    tags: [
      { name: 'health', description: 'Health check' },
      { name: 'public', description: 'Rotas abertas para o solicitante' },
      { name: 'users', description: 'Autenticação e gestão de usuários' },
      { name: 'requests', description: 'Fila de produção' },
      { name: 'machines', description: 'Máquinas' },
      { name: 'filaments', description: 'Estoque de filamentos' },
      { name: 'items', description: 'Items e partnumbers' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no login',
        },
      },
    },
  },
});

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

app.register(healthRoutes);
app.register(mainRoutes, { prefix: '/api' });

app.setErrorHandler(apiErrorHandler);
