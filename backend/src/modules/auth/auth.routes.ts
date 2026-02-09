import { FastifyInstance } from 'fastify';

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    // TODO: Implement registration
    return reply.status(501).send({ 
      message: 'Registration not implemented yet' 
    });
  });

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    // TODO: Implement login
    return reply.status(501).send({ 
      message: 'Login not implemented yet' 
    });
  });

  // POST /api/auth/logout
  app.post('/logout', async (request, reply) => {
    // TODO: Implement logout
    return reply.status(501).send({ 
      message: 'Logout not implemented yet' 
    });
  });

  // GET /api/auth/me
  app.get('/me', async (request, reply) => {
    // TODO: Return current user
    return reply.status(501).send({ 
      message: 'Get current user not implemented yet' 
    });
  });

  // POST /api/auth/refresh
  app.post('/refresh', async (request, reply) => {
    // TODO: Refresh token
    return reply.status(501).send({ 
      message: 'Token refresh not implemented yet' 
    });
  });
}
