import { orchestrate, parseAIResponse } from '../orchestrator.service.js';

export interface TutorResponse {
  explanation: string;
  examples: string[];
  followUpQuestion: string;
}

/**
 * Tutor AI Service
 * Explains concepts with examples and asks follow-up questions
 */
export async function explainConcept(
  userId: string,
  contentId: string,
  conceptId: string,
  sessionId?: string,
  additionalContext?: string
): Promise<TutorResponse> {
  const userMessage = additionalContext 
    ? `Please explain this concept. Additional context: ${additionalContext}`
    : 'Please explain this concept to me.';
  
  const response = await orchestrate(userId, {
    role: 'tutor',
    contentId,
    conceptId,
    sessionId,
    userMessage,
  });
  
  // Tutor returns text, parse it into structured format
  return parseTutorResponse(response.content);
}

/**
 * Answer a follow-up question from the user
 */
export async function answerQuestion(
  userId: string,
  contentId: string,
  conceptId: string,
  question: string,
  sessionId?: string
): Promise<TutorResponse> {
  const response = await orchestrate(userId, {
    role: 'tutor',
    contentId,
    conceptId,
    sessionId,
    userMessage: question,
  });
  
  return parseTutorResponse(response.content);
}

/**
 * Parse tutor's text response into structured format
 */
function parseTutorResponse(content: string): TutorResponse {
  // Extract examples (lines starting with - or *)
  const exampleMatches = content.match(/^[\-\*]\s+.+$/gm) || [];
  const examples = exampleMatches.map(e => e.replace(/^[\-\*]\s+/, '').trim());
  
  // Extract follow-up question (last sentence ending with ?)
  const sentences = content.split(/(?<=[.!?])\s+/);
  const questionSentences = sentences.filter(s => s.trim().endsWith('?'));
  const followUpQuestion = questionSentences.length > 0 
    ? questionSentences[questionSentences.length - 1].trim()
    : 'Can you explain this concept in your own words?';
  
  // Clean explanation (remove the question if it's at the end)
  let explanation = content;
  if (followUpQuestion && content.includes(followUpQuestion)) {
    explanation = content.replace(followUpQuestion, '').trim();
  }
  
  return {
    explanation,
    examples: examples.length > 0 ? examples : ['See the explanation above for examples.'],
    followUpQuestion,
  };
}

/**
 * Get a simpler explanation of the same concept
 */
export async function simplifyExplanation(
  userId: string,
  contentId: string,
  conceptId: string,
  previousExplanation: string,
  sessionId?: string
): Promise<TutorResponse> {
  const userMessage = `I didn't quite understand the previous explanation. Can you explain it more simply? 
Previous explanation: ${previousExplanation.slice(0, 500)}...`;
  
  const response = await orchestrate(userId, {
    role: 'tutor',
    contentId,
    conceptId,
    sessionId,
    userMessage,
  });
  
  return parseTutorResponse(response.content);
}
