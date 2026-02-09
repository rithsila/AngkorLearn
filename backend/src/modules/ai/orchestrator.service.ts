import { prisma } from '../../config/database.js';
import { AIRole, buildPrompt, PromptContext, getRoleMetadata } from './prompt.service.js';
import { routeToProvider, estimateCost, getProviderForRole } from './llm.router.js';
import { assembleContext } from './context.assembler.js';

export interface AIRequest {
  role: AIRole;
  contentId?: string;
  conceptId?: string;
  sessionId?: string;
  userMessage: string;
  additionalContext?: Partial<PromptContext>;
}

export interface AIResponse {
  content: string;
  role: AIRole;
  provider: 'openai' | 'deepseek';
  promptVersion: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  interactionId: string;
}

/**
 * Central AI Orchestrator
 * Routes requests to appropriate AI roles with context assembly
 */
export async function orchestrate(
  userId: string,
  request: AIRequest
): Promise<AIResponse> {
  const { role, contentId, conceptId, sessionId, userMessage, additionalContext } = request;
  
  // 1. Assemble context from various sources
  let context: PromptContext = {
    userMessage,
    ...additionalContext,
  };
  
  // If content/concept provided, assemble RAG context
  if (contentId || conceptId) {
    const ragContext = await assembleContext({
      userId,
      contentId,
      conceptId,
      sessionId,
    });
    context = { ...context, ...ragContext };
  }
  
  // 2. Build prompt with context
  const { prompt: systemPrompt, version: promptVersion } = buildPrompt(role, context);
  
  // 3. Route to appropriate LLM provider
  const provider = getProviderForRole(role);
  const response = await routeToProvider(role, systemPrompt, userMessage);
  
  // 4. Calculate cost
  const estimatedCost = estimateCost(
    provider,
    response.usage.promptTokens,
    response.usage.completionTokens
  );
  
  // 5. Store interaction in database
  // Note: The Interaction model requires sessionId, so we create a temp session if needed
  let actualSessionId = sessionId;
  
  if (!actualSessionId && contentId) {
    // Find or create a session for this user/content
    const existingSession = await prisma.learningSession.findFirst({
      where: { userId, contentId, status: 'ACTIVE' },
    });
    
    if (existingSession) {
      actualSessionId = existingSession.id;
    } else {
      const newSession = await prisma.learningSession.create({
        data: { userId, contentId },
      });
      actualSessionId = newSession.id;
    }
  }
  
  let interactionId = '';
  
  if (actualSessionId) {
    const interaction = await prisma.interaction.create({
      data: {
        sessionId: actualSessionId,
        conceptId,
        role: role.toUpperCase() as 'TUTOR' | 'EXAMINER' | 'COACH' | 'PLANNER' | 'REVIEWER',
        userMessage: userMessage.slice(0, 10000),
        aiResponse: response.content.slice(0, 20000),
        interactionType: 'EXPLANATION',
        tokensUsed: response.usage.totalTokens,
      },
    });
    interactionId = interaction.id;
  }
  
  console.log(`🤖 AI [${role}] via ${provider} - ${response.usage.totalTokens} tokens (~$${estimatedCost.toFixed(4)})`);
  
  return {
    content: response.content,
    role,
    provider,
    promptVersion,
    usage: {
      ...response.usage,
      estimatedCost,
    },
    interactionId,
  };
}

/**
 * Parse JSON response from AI
 */
export function parseAIResponse<T>(response: AIResponse): T {
  try {
    return JSON.parse(response.content) as T;
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    throw new Error('Invalid AI response format');
  }
}
