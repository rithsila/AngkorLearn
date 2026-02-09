import { prisma } from '../../config/database.js';
import { 
  SessionState, 
  SessionAction, 
  getNextState, 
  isValidTransition,
  getValidActions,
  isTerminalState,
  getResponsibleRole
} from './session-state.machine.js';
import { orchestrate } from '../ai/orchestrator.service.js';

export interface CreateSessionInput {
  userId: string;
  contentId: string;
}

export interface SessionWithDetails {
  id: string;
  userId: string;
  contentId: string;
  currentConceptId: string | null;
  status: string;
  progress: number;
  totalTimeMinutes: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  content: {
    title: string;
    description: string | null;
  };
  currentConcept: {
    id: string;
    title: string;
    description: string | null;
  } | null;
}

/**
 * Create a new learning session for content
 */
export async function createSession(input: CreateSessionInput): Promise<SessionWithDetails> {
  const { userId, contentId } = input;
  
  // Check if content exists and has a learning map
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      learningMaps: {
        include: {
          concepts: {
            orderBy: { conceptOrder: 'asc' },
            take: 1,
          },
        },
      },
    },
  });
  
  if (!content) {
    throw new Error('Content not found');
  }
  
  if (content.learningMaps.length === 0) {
    throw new Error('Content has no learning map. Please generate one first.');
  }
  
  const firstConcept = content.learningMaps[0].concepts[0];
  
  // Create the session
  const session = await prisma.learningSession.create({
    data: {
      userId,
      contentId,
      currentConceptId: firstConcept?.id || null,
      status: 'ACTIVE',
      progress: 0,
      totalTimeMinutes: 0,
    },
    include: {
      content: {
        select: { title: true, description: true },
      },
    },
  });
  
  // Get current concept details
  let currentConcept = null;
  if (firstConcept) {
    currentConcept = {
      id: firstConcept.id,
      title: firstConcept.title,
      description: firstConcept.description,
    };
  }
  
  return {
    ...session,
    currentConcept,
  };
}

/**
 * Get session by ID with full details
 */
export async function getSession(sessionId: string): Promise<SessionWithDetails | null> {
  const session = await prisma.learningSession.findUnique({
    where: { id: sessionId },
    include: {
      content: {
        select: { title: true, description: true },
      },
    },
  });
  
  if (!session) return null;
  
  let currentConcept = null;
  if (session.currentConceptId) {
    const concept = await prisma.concept.findUnique({
      where: { id: session.currentConceptId },
      select: { id: true, title: true, description: true },
    });
    currentConcept = concept;
  }
  
  return {
    ...session,
    currentConcept,
  };
}

/**
 * Get user's sessions
 */
export async function getUserSessions(userId: string) {
  return prisma.learningSession.findMany({
    where: { userId },
    include: {
      content: {
        select: { title: true, description: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Update session state/progress
 */
export async function updateSession(
  sessionId: string,
  updates: {
    status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    currentConceptId?: string;
    progress?: number;
    totalTimeMinutes?: number;
  }
) {
  return prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      ...updates,
      lastActiveAt: new Date(),
    },
  });
}

/**
 * Process an interaction in the session
 */
export async function processInteraction(
  sessionId: string,
  userId: string,
  message: string,
  currentState: SessionState
): Promise<{
  response: string;
  newState: SessionState;
  action: SessionAction;
  conceptProgress?: number;
}> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Determine which AI role should respond
  const role = getResponsibleRole(currentState);
  
  if (!role) {
    // User is in user_explain state, they're providing their explanation
    // Move to evaluate state
    return {
      response: 'Thank you for your explanation. Let me evaluate your understanding...',
      newState: 'evaluate',
      action: 'user_responded',
    };
  }
  
  // Call the appropriate AI role
  const aiResponse = await orchestrate(userId, {
    role,
    contentId: session.contentId,
    conceptId: session.currentConceptId || undefined,
    sessionId,
    userMessage: message,
  });
  
  // Determine state transition based on role and response
  let action: SessionAction;
  let newState: SessionState;
  
  switch (currentState) {
    case 'init':
      action = 'start';
      newState = 'explain';
      break;
      
    case 'explain':
      action = 'explain_complete';
      newState = 'user_explain';
      break;
      
    case 'evaluate':
      action = 'evaluation_complete';
      newState = 'decide_next';
      break;
      
    case 'decide_next':
      // Parse coach decision from response
      const decision = parseCoachDecision(aiResponse.content);
      action = decision;
      newState = getNextState(currentState, decision) || 'explain';
      break;
      
    default:
      action = 'start';
      newState = currentState;
  }
  
  return {
    response: aiResponse.content,
    newState,
    action,
  };
}

/**
 * Parse coach decision from AI response
 */
function parseCoachDecision(response: string): 'proceed' | 'review' | 'practice' | 'complete' {
  try {
    const parsed = JSON.parse(response);
    const action = parsed.nextAction?.toLowerCase();
    
    if (action === 'advance' || action === 'proceed' || action === 'continue') {
      return 'proceed';
    }
    if (action === 'review' || action === 'revisit') {
      return 'review';
    }
    if (action === 'practice' || action === 'evaluate') {
      return 'practice';
    }
    if (action === 'complete' || action === 'finish') {
      return 'complete';
    }
  } catch {
    // Not JSON, try keyword matching
    const lower = response.toLowerCase();
    if (lower.includes('proceed') || lower.includes('next concept') || lower.includes('move on')) {
      return 'proceed';
    }
    if (lower.includes('review') || lower.includes('revisit')) {
      return 'review';
    }
    if (lower.includes('practice') || lower.includes('try again')) {
      return 'practice';
    }
  }
  
  // Default to proceed
  return 'proceed';
}

/**
 * Pause a session
 */
export async function pauseSession(sessionId: string) {
  return updateSession(sessionId, { status: 'PAUSED' });
}

/**
 * Resume a session
 */
export async function resumeSession(sessionId: string) {
  return updateSession(sessionId, { status: 'ACTIVE' });
}

/**
 * Complete a session
 */
export async function completeSession(sessionId: string) {
  return updateSession(sessionId, { 
    status: 'COMPLETED',
    progress: 100,
  });
}

/**
 * Move to next concept in the learning map
 */
export async function moveToNextConcept(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session || !session.currentConceptId) {
    return false;
  }
  
  // Get current concept order
  const currentConcept = await prisma.concept.findUnique({
    where: { id: session.currentConceptId },
    select: { conceptOrder: true, learningMapId: true },
  });
  
  if (!currentConcept) return false;
  
  // Find next concept
  const nextConcept = await prisma.concept.findFirst({
    where: {
      learningMapId: currentConcept.learningMapId,
      conceptOrder: { gt: currentConcept.conceptOrder },
    },
    orderBy: { conceptOrder: 'asc' },
  });
  
  if (!nextConcept) {
    // No more concepts, session is complete
    await completeSession(sessionId);
    return false;
  }
  
  // Update session with new concept
  const totalConcepts = await prisma.concept.count({
    where: { learningMapId: currentConcept.learningMapId },
  });
  
  const newProgress = Math.round((currentConcept.conceptOrder / totalConcepts) * 100);
  
  await updateSession(sessionId, {
    currentConceptId: nextConcept.id,
    progress: newProgress,
  });
  
  return true;
}
