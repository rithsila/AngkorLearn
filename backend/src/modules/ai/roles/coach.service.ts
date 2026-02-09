import { orchestrate, parseAIResponse } from '../orchestrator.service.js';
import { ExaminerEvaluation } from './examiner.service.js';

export type CoachAction = 'proceed' | 'review' | 'practice' | 'complete';

export interface CoachDecision {
  nextAction: CoachAction;
  reason: string;
  message: string;
  conceptToFocus?: string;
  suggestions: string[];
  encouragement: string;
}

/**
 * Coach AI Service
 * Decides next learning action based on evaluation results
 */
export async function decideNextAction(
  userId: string,
  contentId: string,
  conceptId: string,
  evaluation: ExaminerEvaluation,
  sessionId?: string,
  isLastConcept: boolean = false
): Promise<CoachDecision> {
  const userMessage = `
Student evaluation results:
- Overall Score: ${evaluation.overallScore}%
- Confidence: ${evaluation.confidence}
- Strengths: ${evaluation.strengths.join(', ')}
- Gaps: ${evaluation.gaps.join(', ')}
- Feedback: ${evaluation.feedback}
${isLastConcept ? '- This is the final concept in the learning map.' : ''}

Decide the next step for this student.`;

  const response = await orchestrate(userId, {
    role: 'coach',
    contentId,
    conceptId,
    sessionId,
    userMessage,
  });
  
  // Parse the JSON response from coach
  try {
    const parsed = parseAIResponse<CoachDecision>(response);
    return normalizeDecision(parsed, evaluation, isLastConcept);
  } catch {
    // If parsing fails, make decision based on score
    return makeDefaultDecision(evaluation, isLastConcept);
  }
}

/**
 * Normalize coach decision
 */
function normalizeDecision(
  decision: CoachDecision, 
  evaluation: ExaminerEvaluation,
  isLastConcept: boolean
): CoachDecision {
  let action = decision.nextAction?.toLowerCase() as CoachAction;
  
  // Map various action names to our standard actions
  if (['advance', 'continue', 'next'].includes(action)) {
    action = isLastConcept ? 'complete' : 'proceed';
  }
  if (['revisit', 're-explain'].includes(action)) {
    action = 'review';
  }
  if (['evaluate', 'try_again', 'tryagain'].includes(action)) {
    action = 'practice';
  }
  
  // Validate action
  if (!['proceed', 'review', 'practice', 'complete'].includes(action)) {
    action = evaluation.overallScore >= 70 
      ? (isLastConcept ? 'complete' : 'proceed') 
      : 'review';
  }
  
  return {
    nextAction: action,
    reason: decision.reason || getDefaultReason(action, evaluation),
    message: decision.message || getDefaultMessage(action, evaluation),
    conceptToFocus: decision.conceptToFocus,
    suggestions: decision.suggestions || [],
    encouragement: decision.encouragement || getDefaultEncouragement(evaluation),
  };
}

/**
 * Make a decision based on evaluation score when AI parsing fails
 */
function makeDefaultDecision(
  evaluation: ExaminerEvaluation,
  isLastConcept: boolean
): CoachDecision {
  const score = evaluation.overallScore;
  
  if (score >= 85) {
    return {
      nextAction: isLastConcept ? 'complete' : 'proceed',
      reason: 'Excellent understanding demonstrated',
      message: isLastConcept 
        ? 'Congratulations! You\'ve mastered all concepts in this content.'
        : 'Great work! You\'re ready to move on to the next concept.',
      suggestions: isLastConcept 
        ? ['Review your notes', 'Apply what you learned'] 
        : ['Keep up the momentum'],
      encouragement: 'You\'re doing exceptionally well!',
    };
  }
  
  if (score >= 70) {
    return {
      nextAction: isLastConcept ? 'complete' : 'proceed',
      reason: 'Good understanding with minor gaps',
      message: 'You have a solid grasp of this concept. Let\'s continue forward.',
      suggestions: ['Review the areas mentioned in feedback later'],
      encouragement: 'Good progress! You\'re on the right track.',
    };
  }
  
  if (score >= 50) {
    return {
      nextAction: 'practice',
      reason: 'Understanding needs more practice',
      message: 'Let\'s practice a bit more to strengthen your understanding.',
      suggestions: evaluation.gaps,
      encouragement: 'You\'re making progress. A little more practice will help solidify these concepts.',
    };
  }
  
  return {
    nextAction: 'review',
    reason: 'Concept needs re-explanation',
    message: 'Let\'s revisit this concept with a different approach.',
    suggestions: ['Focus on the core ideas first', ...evaluation.gaps],
    encouragement: 'Learning takes time. Let\'s try again with a clearer explanation.',
  };
}

function getDefaultReason(action: CoachAction, evaluation: ExaminerEvaluation): string {
  switch (action) {
    case 'proceed': return `Strong understanding (${evaluation.overallScore}%)`;
    case 'review': return `Needs more explanation (${evaluation.overallScore}%)`;
    case 'practice': return `Would benefit from practice (${evaluation.overallScore}%)`;
    case 'complete': return 'All concepts mastered';
  }
}

function getDefaultMessage(action: CoachAction, evaluation: ExaminerEvaluation): string {
  switch (action) {
    case 'proceed': return 'Great job! Let\'s move to the next concept.';
    case 'review': return 'Let\'s revisit this concept to strengthen understanding.';
    case 'practice': return 'Let\'s practice with some application exercises.';
    case 'complete': return 'Congratulations! You\'ve completed this learning session.';
  }
}

function getDefaultEncouragement(evaluation: ExaminerEvaluation): string {
  if (evaluation.overallScore >= 80) return 'Excellent work! Keep it up!';
  if (evaluation.overallScore >= 60) return 'You\'re making good progress!';
  return 'Every step forward is progress. Keep going!';
}

/**
 * Generate a practice task based on the concept
 */
export async function generatePracticeTask(
  userId: string,
  contentId: string,
  conceptId: string,
  sessionId?: string
): Promise<string> {
  const response = await orchestrate(userId, {
    role: 'coach',
    contentId,
    conceptId,
    sessionId,
    userMessage: 'Generate a practical application task for this concept that the student can work on.',
  });
  
  return response.content;
}
