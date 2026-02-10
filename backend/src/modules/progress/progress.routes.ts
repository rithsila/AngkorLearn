import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import {
  getConceptProgress,
  getContentProgress,
  getUserProgressSummary,
  getConfidenceHistory,
} from './progress.service.js';

export async function progressRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('onRequest', authMiddleware);

  // ── User Progress Summary ──────────────────────────────────────
  app.get(
    '/progress/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId as string;
        const summary = await getUserProgressSummary(userId);
        return reply.send({ success: true, data: summary });
      } catch (error) {
        console.error('Error fetching progress summary:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch progress summary' });
      }
    }
  );

  // ── Content Progress ───────────────────────────────────────────
  app.get(
    '/progress/:contentId',
    async (
      request: FastifyRequest<{ Params: { contentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as any).userId as string;
        const { contentId } = request.params;

        const progress = await getContentProgress(userId, contentId);
        if (!progress) {
          return reply.status(404).send({ success: false, error: 'Content not found' });
        }

        return reply.send({ success: true, data: progress });
      } catch (error) {
        console.error('Error fetching content progress:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch content progress' });
      }
    }
  );

  // ── Confidence History (Chart Data) ────────────────────────────
  app.get(
    '/progress/:contentId/confidence-history',
    async (
      request: FastifyRequest<{ Params: { contentId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as any).userId as string;
        const { contentId } = request.params;

        const history = await getConfidenceHistory(userId, contentId);
        return reply.send({ success: true, data: history });
      } catch (error) {
        console.error('Error fetching confidence history:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch confidence history' });
      }
    }
  );

  // ── Concept Progress ───────────────────────────────────────────
  app.get(
    '/progress/concept/:conceptId',
    async (
      request: FastifyRequest<{ Params: { conceptId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as any).userId as string;
        const { conceptId } = request.params;

        const progress = await getConceptProgress(userId, conceptId);
        if (!progress) {
          return reply.status(404).send({ success: false, error: 'Concept not found' });
        }

        return reply.send({ success: true, data: progress });
      } catch (error) {
        console.error('Error fetching concept progress:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch concept progress' });
      }
    }
  );
}
