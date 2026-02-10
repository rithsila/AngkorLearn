import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import {
  generateSessionSummary,
  generateWeeklyReport,
  suggestReviewSchedule,
} from '../ai/roles/reviewer.service.js';

export async function reviewRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authMiddleware);

  // ── Session Summary ────────────────────────────────────────────
  app.get(
    '/review/session/:sessionId',
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as any).userId as string;
        const { sessionId } = request.params;
        const summary = await generateSessionSummary(sessionId, userId);
        return reply.send({ success: true, data: summary });
      } catch (error) {
        console.error('Error generating session summary:', error);
        return reply.status(500).send({ success: false, error: 'Failed to generate session summary' });
      }
    }
  );

  // ── Weekly Report ──────────────────────────────────────────────
  app.get(
    '/review/weekly',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId as string;
        const report = await generateWeeklyReport(userId);
        return reply.send({ success: true, data: report });
      } catch (error) {
        console.error('Error generating weekly report:', error);
        return reply.status(500).send({ success: false, error: 'Failed to generate weekly report' });
      }
    }
  );

  // ── Review Schedule ────────────────────────────────────────────
  app.get(
    '/review/schedule',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId as string;
        const schedule = await suggestReviewSchedule(userId);
        return reply.send({ success: true, data: schedule });
      } catch (error) {
        console.error('Error generating review schedule:', error);
        return reply.status(500).send({ success: false, error: 'Failed to generate review schedule' });
      }
    }
  );
}
