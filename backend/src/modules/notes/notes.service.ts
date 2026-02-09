import { prisma } from '../../config/database.js';

export interface CreateNoteInput {
  userId: string;
  sessionId: string;
  noteText: string;
}

export interface NoteResponse {
  id: string;
  noteText: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or update a note for a session
 */
export async function saveNote(input: CreateNoteInput): Promise<NoteResponse> {
  const { userId, sessionId, noteText } = input;
  
  // Check for existing note in this session
  const existing = await prisma.userNote.findFirst({
    where: { userId, sessionId },
  });
  
  if (existing) {
    // Update existing note
    const updated = await prisma.userNote.update({
      where: { id: existing.id },
      data: { noteText },
    });
    
    return {
      id: updated.id,
      noteText: updated.noteText,
      sessionId: updated.sessionId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
  
  // Create new note
  const note = await prisma.userNote.create({
    data: {
      userId,
      sessionId,
      noteText,
    },
  });
  
  return {
    id: note.id,
    noteText: note.noteText,
    sessionId: note.sessionId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Get notes for a session
 */
export async function getNotesBySession(
  userId: string, 
  sessionId: string
): Promise<NoteResponse[]> {
  const notes = await prisma.userNote.findMany({
    where: { userId, sessionId },
    orderBy: { updatedAt: 'desc' },
  });
  
  return notes.map(n => ({
    id: n.id,
    noteText: n.noteText,
    sessionId: n.sessionId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}

/**
 * Get all notes for a user
 */
export async function getUserNotes(userId: string): Promise<NoteResponse[]> {
  const notes = await prisma.userNote.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  
  return notes.map(n => ({
    id: n.id,
    noteText: n.noteText,
    sessionId: n.sessionId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}

/**
 * Get a note by ID
 */
export async function getNoteById(noteId: string): Promise<NoteResponse | null> {
  const note = await prisma.userNote.findUnique({
    where: { id: noteId },
  });
  
  if (!note) return null;
  
  return {
    id: note.id,
    noteText: note.noteText,
    sessionId: note.sessionId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Update a note
 */
export async function updateNote(
  userId: string,
  noteId: string,
  noteText: string
): Promise<NoteResponse> {
  const note = await prisma.userNote.findUnique({
    where: { id: noteId },
  });
  
  if (!note || note.userId !== userId) {
    throw new Error('Note not found or unauthorized');
  }
  
  const updated = await prisma.userNote.update({
    where: { id: noteId },
    data: { noteText },
  });
  
  return {
    id: updated.id,
    noteText: updated.noteText,
    sessionId: updated.sessionId,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a note
 */
export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const note = await prisma.userNote.findUnique({
    where: { id: noteId },
  });
  
  if (!note || note.userId !== userId) {
    throw new Error('Note not found or unauthorized');
  }
  
  await prisma.userNote.delete({
    where: { id: noteId },
  });
}

/**
 * Search notes by content
 */
export async function searchNotes(
  userId: string,
  query: string
): Promise<NoteResponse[]> {
  const notes = await prisma.userNote.findMany({
    where: {
      userId,
      noteText: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  
  return notes.map(n => ({
    id: n.id,
    noteText: n.noteText,
    sessionId: n.sessionId,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}
