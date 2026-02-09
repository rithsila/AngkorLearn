import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../auth/auth.middleware.js';
import { 
  createSession, 
  getSession, 
  getUserSessions,
  pauseSession,
  resumeSession,
  completeSession,
  processInteraction,
  moveToNextConcept
} from './session.service.js';
import { SessionState, getValidActions } from './session-state.machine.js';
import { explainConcept, answerQuestion } from '../ai/roles/tutor.service.js';
import { evaluateExplanation } from '../ai/roles/examiner.service.js';
import { decideNextAction } from '../ai/roles/coach.service.js';

// Request schemas
const createSessionSchema = z.object({
  contentId: z.string().uuid(),
});

const interactSchema = z.object({
  message: z.string().min(1).max(10000),
  state: z.enum(['init', 'explain', 'user_explain', 'evaluate', 'decide_next']).optional(),
});

export async function learningRoutes(app: FastifyInstance) {
  // GET /api/learning/sessions - List user's sessions
  app.get('/sessions', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const sessions = await getUserSessions(request.user.userId);
    
    return reply.send({
      success: true,
      data: { sessions },
    });
  });

  // POST /api/learning/sessions - Create new session
  app.post('/sessions', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const body = createSessionSchema.parse(request.body);
    
    const session = await createSession({
      userId: request.user.userId,
      contentId: body.contentId,
    });
    
    return reply.status(201).send({
      success: true,
      data: { 
        session,
        state: 'init',
        validActions: getValidActions('init'),
      },
      message: 'Learning session created. Ready to start!',
    });
  });

  // GET /api/learning/sessions/:id - Get session details
  app.get<{ Params: { id: string } }>('/sessions/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const session = await getSession(request.params.id);
    
    if (!session) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Session not found' },
      });
    }
    
    // Determine current state based on status
    let state: SessionState = 'init';
    if (session.status === 'PAUSED') state = 'paused';
    if (session.status === 'COMPLETED') state = 'complete';
    
    return reply.send({
      success: true,
      data: { 
        session,
        state,
        validActions: getValidActions(state),
      },
    });
  });

  // POST /api/learning/sessions/:id/start - Start the session
  app.post<{ Params: { id: string } }>('/sessions/:id/start', { preHandler: authMiddleware }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const session = await getSession(request.params.id);
    
    if (!session) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Session not found' },
      });
    }
    
    if (!session.currentConceptId) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No concepts to learn in this content' },
      });
    }
    
    // Tutor explains the first concept
    const tutorResponse = await explainConcept(
      request.user.userId,
      session.contentId,
      session.currentConceptId,
      session.id
    );
    
    return reply.send({
      success: true,
      data: {
        state: 'explain',
        concept: session.currentConcept,
        response: tutorResponse,
        validActions: getValidActions('explain'),
      },
      message: 'Session started! The tutor is explaining the first concept.',
    });
  });

  // POST /api/learning/sessions/:id/interact - Chat with AI
  app.post<{ Params: { id: string } }>('/sessions/:id/interact', { preHandler: authMiddleware }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const body = interactSchema.parse(request.body);
    const session = await getSession(request.params.id);
    
    if (!session) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Session not found' },
      });
    }
    
    const currentState = (body.state || 'user_explain') as SessionState;
    
    // Route to appropriate AI based on state
    let response;
    let newState: SessionState = currentState;
    let evaluation;
    let decision;
    
    switch (currentState) {
      case 'explain':
        // User asking follow-up question
        const tutorAnswer = await answerQuestion(
          request.user.userId,
          session.contentId,
          session.currentConceptId!,
          body.message,
          session.id
        );
        response = tutorAnswer;
        // Stay in explain state for follow-ups
        break;
        
      case 'user_explain':
        // User providing their explanation - evaluate it
        evaluation = await evaluateExplanation(
          request.user.userId,
          session.contentId,
          session.currentConceptId!,
          body.message,
          session.id
        );
        
        // Then get coach decision
        decision = await decideNextAction(
          request.user.userId,
          session.contentId,
          session.currentConceptId!,
          evaluation,
          session.id
        );
        
        response = {
          evaluation,
          decision,
        };
        newState = 'decide_next';
        
        // Handle coach decision
        if (decision.nextAction === 'proceed') {
          const moved = await moveToNextConcept(session.id);
          if (!moved) {
            newState = 'complete';
            await completeSession(session.id);
          } else {
            newState = 'explain';
          }
        } else if (decision.nextAction === 'complete') {
          newState = 'complete';
          await completeSession(session.id);
        } else if (decision.nextAction === 'review') {
          newState = 'explain';
        } else {
          newState = 'user_explain';
        }
        break;
        
      default:
        // Generic interaction
        const result = await processInteraction(
          session.id,
          request.user.userId,
          body.message,
          currentState
        );
        response = result.response;
        newState = result.newState;
    }
    
    // Get updated session
    const updatedSession = await getSession(session.id);
    
    return reply.send({
      success: true,
      data: {
        state: newState,
        concept: updatedSession?.currentConcept,
        response,
        evaluation,
        decision,
        progress: updatedSession?.progress,
        validActions: getValidActions(newState),
      },
    });
  });

  // POST /api/learning/sessions/:id/pause - Pause session
  app.post<{ Params: { id: string } }>('/sessions/:id/pause', { preHandler: authMiddleware }, async (request, reply) => {
    await pauseSession(request.params.id);
    
    return reply.send({
      success: true,
      message: 'Session paused',
    });
  });

  // POST /api/learning/sessions/:id/resume - Resume session
  app.post<{ Params: { id: string } }>('/sessions/:id/resume', { preHandler: authMiddleware }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    await resumeSession(request.params.id);
    const session = await getSession(request.params.id);
    
    if (!session || !session.currentConceptId) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Session not found' },
      });
    }
    
    // Re-explain current concept
    const tutorResponse = await explainConcept(
      request.user.userId,
      session.contentId,
      session.currentConceptId,
      session.id,
      'User is resuming this session. Please briefly recap where we left off.'
    );
    
    return reply.send({
      success: true,
      data: {
        session,
        state: 'explain',
        response: tutorResponse,
        validActions: getValidActions('explain'),
      },
      message: 'Session resumed',
    });
  });

  // GET /api/learning/progress - Get learning progress
  app.get('/progress', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const sessions = await getUserSessions(request.user.userId);
    
    const progress = sessions.map(s => ({
      contentId: s.contentId,
      contentTitle: s.content.title,
      progress: s.progress,
      status: s.status,
      totalTimeMinutes: s.totalTimeMinutes,
      lastActiveAt: s.lastActiveAt,
    }));
    
    return reply.send({
      success: true,
      data: { progress },
    });
  });
}
