import { orchestrate, parseAIResponse } from '../orchestrator.service.js';

export interface ExaminerEvaluation {
  overallScore: number;  // 0-100
  confidence: number;    // 0-1
  scores: {
    accuracy: number;
    completeness: number;
    understanding: number;
    application: number;
  };
  strengths: string[];
  gaps: string[];
  feedback: string;
  suggestedFollowUp: string;
  readyToAdvance: boolean;
}

/**
 * Examiner AI Service
 * Evaluates user explanations and identifies knowledge gaps
 */
export async function evaluateExplanation(
  userId: string,
  contentId: string,
  conceptId: string,
  userExplanation: string,
  sessionId?: string
): Promise<ExaminerEvaluation> {
  const response = await orchestrate(userId, {
    role: 'examiner',
    contentId,
    conceptId,
    sessionId,
    userMessage: userExplanation,
  });
  
  // Parse the JSON response from examiner
  try {
    const parsed = parseAIResponse<ExaminerEvaluation>(response);
    return normalizeEvaluation(parsed);
  } catch {
    // If parsing fails, return a default evaluation
    return createDefaultEvaluation(userExplanation);
  }
}

/**
 * Normalize evaluation scores to expected ranges
 */
function normalizeEvaluation(evaluation: ExaminerEvaluation): ExaminerEvaluation {
  return {
    ...evaluation,
    overallScore: clamp(evaluation.overallScore, 0, 100),
    confidence: evaluation.overallScore / 100, // Convert to 0-1
    scores: {
      accuracy: clamp(evaluation.scores?.accuracy || 50, 0, 100),
      completeness: clamp(evaluation.scores?.completeness || 50, 0, 100),
      understanding: clamp(evaluation.scores?.understanding || 50, 0, 100),
      application: clamp(evaluation.scores?.application || 50, 0, 100),
    },
    strengths: evaluation.strengths || [],
    gaps: evaluation.gaps || [],
    feedback: evaluation.feedback || 'Thank you for your explanation.',
    suggestedFollowUp: evaluation.suggestedFollowUp || 'Can you elaborate on any specific aspect?',
    readyToAdvance: evaluation.overallScore >= 70,
  };
}

/**
 * Create a default evaluation when parsing fails
 */
function createDefaultEvaluation(userExplanation: string): ExaminerEvaluation {
  // Basic heuristic based on explanation length and structure
  const wordCount = userExplanation.split(/\s+/).length;
  const hasExamples = /for example|such as|like|instance/i.test(userExplanation);
  const hasStructure = userExplanation.includes('\n') || wordCount > 50;
  
  let score = 50;
  if (wordCount > 30) score += 10;
  if (wordCount > 100) score += 10;
  if (hasExamples) score += 15;
  if (hasStructure) score += 10;
  
  score = clamp(score, 0, 100);
  
  return {
    overallScore: score,
    confidence: score / 100,
    scores: {
      accuracy: score,
      completeness: score - 5,
      understanding: score + 5,
      application: hasExamples ? score + 10 : score - 10,
    },
    strengths: wordCount > 50 ? ['Detailed explanation'] : ['Attempted explanation'],
    gaps: wordCount < 30 ? ['Could provide more detail'] : [],
    feedback: score >= 70 
      ? 'Good explanation! You demonstrate understanding of the key concepts.'
      : 'Your explanation shows some understanding, but could be more detailed.',
    suggestedFollowUp: 'Can you provide a specific example of how this applies?',
    readyToAdvance: score >= 70,
  };
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a specific question to probe understanding
 */
export async function generateProbeQuestion(
  userId: string,
  contentId: string,
  conceptId: string,
  previousEvaluation: ExaminerEvaluation,
  sessionId?: string
): Promise<string> {
  const gaps = previousEvaluation.gaps.join(', ');
  
  const response = await orchestrate(userId, {
    role: 'examiner',
    contentId,
    conceptId,
    sessionId,
    userMessage: `Based on these knowledge gaps: ${gaps}. Generate one specific question to probe the user's understanding.`,
  });
  
  // Extract question from response
  const questions = response.content.match(/[^.!?]*\?/g);
  return questions?.[0] || previousEvaluation.suggestedFollowUp;
}
