import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { env } from './config/env.js';
import { initQdrantCollection } from './config/qdrant.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { contentRoutes } from './modules/content/content.routes.js';
import { learningRoutes } from './modules/learning/learning.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';

const app = Fastify({
  logger: env.NODE_ENV === 'development' 
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : true,
});

async function buildApp() {
  // Register plugins
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // File upload support
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Serve uploaded files
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  // Register routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(contentRoutes, { prefix: '/api/content' });
  await app.register(learningRoutes, { prefix: '/api/learning' });
  await app.register(aiRoutes, { prefix: '/api/ai' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    
    const statusCode = error.statusCode || 500;
    const message = env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : error.message;
    
    reply.status(statusCode).send({
      success: false,
      error: {
        message,
        statusCode,
      },
    });
  });

  return app;
}

// Start server
const start = async () => {
  try {
    // Initialize Qdrant collection
    await initQdrantCollection();
    
    const server = await buildApp();
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`📚 API docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

export { app };
