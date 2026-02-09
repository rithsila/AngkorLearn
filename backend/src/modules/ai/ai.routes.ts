import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../auth/auth.middleware.js';
import { listRoles } from './prompt.service.js';
import { orchestrate } from './orchestrator.service.js';
import { generateLearningMap, getLearningMap } from './roles/planner.service.js';
import { getAvailableProviders } from './llm.router.js';

// Request schemas
const chatSchema = z.object({
  role: z.enum(['planner', 'tutor', 'examiner', 'coach', 'reviewer']),
  message: z.string().min(1).max(10000),
  contentId: z.string().optional(),
  conceptId: z.string().optional(),
  sessionId: z.string().optional(),
});

const generateMapSchema = z.object({
  contentId: z.string().uuid(),
});

const analyzeSchema = z.object({
  contentId: z.string().uuid(),
});

export async function aiRoutes(app: FastifyInstance) {
  // POST /api/ai/chat - General AI chat with role
  app.post('/chat', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = chatSchema.parse(request.body);
    
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const response = await orchestrate(request.user.userId, {
      role: body.role,
      contentId: body.contentId,
      conceptId: body.conceptId,
      sessionId: body.sessionId,
      userMessage: body.message,
    });
    
    return reply.send({
      success: true,
      data: {
        content: response.content,
        role: response.role,
        provider: response.provider,
        usage: response.usage,
      },
    });
  });

  // POST /api/ai/generate-map - Generate learning map for content
  app.post('/generate-map', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = generateMapSchema.parse(request.body);
    
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const result = await generateLearningMap(request.user.userId, body.contentId);
    const learningMap = await getLearningMap(body.contentId);
    
    return reply.send({
      success: true,
      data: {
        learningMapId: result.learningMapId,
        conceptCount: result.conceptCount,
        learningMap,
      },
      message: `Learning map generated with ${result.conceptCount} concepts`,
    });
  });

  // POST /api/ai/analyze - Analyze content with Reviewer
  app.post('/analyze', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = analyzeSchema.parse(request.body);
    
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const response = await orchestrate(request.user.userId, {
      role: 'reviewer',
      contentId: body.contentId,
      userMessage: 'Analyze this content for quality and teachability.',
    });
    
    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(response.content);
    } catch {
      analysis = { raw: response.content };
    }
    
    return reply.send({
      success: true,
      data: {
        analysis,
        usage: response.usage,
      },
    });
  });

  // GET /api/ai/roles - Get available AI roles
  app.get('/roles', async (_request, reply) => {
    const roles = listRoles();
    const providers = getAvailableProviders();
    
    return reply.send({
      success: true,
      data: {
        roles,
        providers,
      },
    });
  });
  
  // GET /api/ai/learning-map/:contentId - Get learning map for content
  app.get<{ Params: { contentId: string } }>('/learning-map/:contentId', { preHandler: authMiddleware }, async (request, reply) => {
    const { contentId } = request.params;
    
    const learningMap = await getLearningMap(contentId);
    
    if (!learningMap) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Learning map not found' },
      });
    }
    
    return reply.send({
      success: true,
      data: { learningMap },
    });
  });
}
