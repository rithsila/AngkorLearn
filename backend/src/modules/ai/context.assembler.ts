import { prisma } from '../../config/database.js';
import { searchSimilar } from '../content/embedding.service.js';
import { PromptContext } from './prompt.service.js';

// Token budget for context (leave room for prompt + response)
const MAX_CONTEXT_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;

export interface ContextOptions {
  userId: string;
  contentId?: string;
  conceptId?: string;
  sessionId?: string;
  maxSections?: number;
}

/**
 * Assemble context from multiple sources for AI prompts
 */
export async function assembleContext(options: ContextOptions): Promise<Partial<PromptContext>> {
  const { userId, contentId, conceptId, sessionId, maxSections = 5 } = options;
  const context: Partial<PromptContext> = {};
  
  // 1. Get content details
  if (contentId) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { title: true, description: true },
    });
    
    if (content) {
      context.contentTitle = content.title;
      context.contentDescription = content.description || '';
    }
  }
  
  // 2. Get concept details
  if (conceptId) {
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      select: { title: true, description: true },
    });
    
    if (concept) {
      context.conceptTitle = concept.title;
      context.conceptDescription = concept.description || '';
    }
  }
  
  // 3. Get relevant sections via RAG (Qdrant similarity search)
  if (contentId && context.conceptTitle) {
    try {
      const searchQuery = context.conceptTitle + ' ' + (context.conceptDescription || '');
      const similarSections = await searchSimilar(searchQuery, contentId, maxSections);
      
      if (similarSections.length > 0) {
        const sectionIds = similarSections.map(s => s.sectionId);
        const sections = await prisma.contentSection.findMany({
          where: { id: { in: sectionIds } },
          select: { title: true, contentText: true },
        });
        
        context.relevantSections = formatSections(sections);
      }
    } catch (error) {
      console.warn('RAG search failed:', error);
    }
  }
  
  // 4. Get session history if in active session
  if (sessionId) {
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    
    if (session) {
      context.sessionState = session.status;
    }
    
    // Get recent AI interactions in this session
    const recentInteractions = await prisma.interaction.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { role: true, aiResponse: true, createdAt: true },
    });
    
    if (recentInteractions.length > 0) {
      context.sessionHistory = recentInteractions
        .reverse()
        .map(i => `[${i.role}]: ${(i.aiResponse || '').slice(0, 200)}...`)
        .join('\n\n');
    }
  }
  
  // Truncate context to fit token budget
  return truncateContext(context);
}

/**
 * Format sections for prompt
 */
function formatSections(sections: Array<{ title: string; contentText: string }>): string {
  return sections
    .map((s, i) => `### Section ${i + 1}: ${s.title}\n${s.contentText}`)
    .join('\n\n---\n\n');
}

/**
 * Truncate context to fit within token budget
 */
function truncateContext(context: Partial<PromptContext>): Partial<PromptContext> {
  const result = { ...context };
  
  // Calculate current size
  let totalChars = JSON.stringify(result).length;
  
  // Fields to truncate in order of priority (less important first)
  const truncatableFields: (keyof PromptContext)[] = [
    'sessionHistory',
    'previousStruggles',
    'relevantSections',
    'contentSections',
  ];
  
  for (const field of truncatableFields) {
    if (totalChars <= MAX_CONTEXT_CHARS) break;
    
    const value = result[field];
    if (typeof value === 'string' && value.length > 500) {
      const excess = totalChars - MAX_CONTEXT_CHARS;
      const newLength = Math.max(500, value.length - excess);
      result[field] = value.slice(0, newLength) + '... [truncated]';
      totalChars = JSON.stringify(result).length;
    }
  }
  
  return result;
}
