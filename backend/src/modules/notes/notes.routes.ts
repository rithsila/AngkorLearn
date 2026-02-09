import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../auth/auth.middleware.js';
import { 
  saveNote, 
  getNotesBySession, 
  getUserNotes,
  updateNote,
  searchNotes,
  deleteNote 
} from './notes.service.js';

// Request schemas
const saveNoteSchema = z.object({
  sessionId: z.string().uuid(),
  noteText: z.string().min(1).max(50000),
});

const updateNoteSchema = z.object({
  noteText: z.string().min(1).max(50000),
});

const searchSchema = z.object({
  query: z.string().min(1).max(200),
});

export async function notesRoutes(app: FastifyInstance) {
  // GET /api/notes - Get all user notes
  app.get('/', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const notes = await getUserNotes(request.user.userId);
    
    return reply.send({
      success: true,
      data: { notes },
    });
  });

  // POST /api/notes - Save a note
  app.post('/', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const body = saveNoteSchema.parse(request.body);
    
    const note = await saveNote({
      userId: request.user.userId,
      sessionId: body.sessionId,
      noteText: body.noteText,
    });
    
    return reply.send({
      success: true,
      data: { note },
      message: 'Note saved',
    });
  });

  // GET /api/notes/session/:sessionId - Get notes for a session
  app.get<{ Params: { sessionId: string } }>('/session/:sessionId', { preHandler: authMiddleware }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const notes = await getNotesBySession(request.user.userId, request.params.sessionId);
    
    return reply.send({
      success: true,
      data: { notes },
    });
  });

  // PUT /api/notes/:id - Update a note
  app.put<{ Params: { id: string } }>('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const body = updateNoteSchema.parse(request.body);
    
    const note = await updateNote(
      request.user.userId,
      request.params.id,
      body.noteText
    );
    
    return reply.send({
      success: true,
      data: { note },
      message: 'Note updated',
    });
  });

  // GET /api/notes/search - Search notes
  app.get('/search', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    const query = searchSchema.parse(request.query);
    const notes = await searchNotes(request.user.userId, query.query);
    
    return reply.send({
      success: true,
      data: { notes },
    });
  });

  // DELETE /api/notes/:id - Delete a note
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { message: 'Unauthorized' } });
    }
    
    await deleteNote(request.user.userId, request.params.id);
    
    return reply.send({
      success: true,
      message: 'Note deleted',
    });
  });
}
