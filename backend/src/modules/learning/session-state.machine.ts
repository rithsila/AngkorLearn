/**
 * Session State Machine for Learning Sessions
 * 
 * States:
 * - init: Session started, waiting to begin
 * - explain: Tutor explaining the current concept
 * - user_explain: User explaining their understanding
 * - evaluate: Examiner evaluating user's explanation
 * - decide_next: Coach deciding next action
 * - complete: Session finished
 * - paused: Session temporarily paused
 */

export type SessionState = 
  | 'init'
  | 'explain'
  | 'user_explain'
  | 'evaluate'
  | 'decide_next'
  | 'complete'
  | 'paused';

export type SessionAction =
  | 'start'
  | 'explain_complete'
  | 'user_responded'
  | 'evaluation_complete'
  | 'proceed'
  | 'review'
  | 'practice'
  | 'pause'
  | 'resume'
  | 'complete';

export interface StateTransition {
  from: SessionState;
  action: SessionAction;
  to: SessionState;
}

// Valid state transitions
const transitions: StateTransition[] = [
  // Starting the session
  { from: 'init', action: 'start', to: 'explain' },
  
  // After tutor explains
  { from: 'explain', action: 'explain_complete', to: 'user_explain' },
  
  // After user responds
  { from: 'user_explain', action: 'user_responded', to: 'evaluate' },
  
  // After evaluation
  { from: 'evaluate', action: 'evaluation_complete', to: 'decide_next' },
  
  // Coach decisions
  { from: 'decide_next', action: 'proceed', to: 'explain' },  // Move to next concept
  { from: 'decide_next', action: 'review', to: 'explain' },   // Re-explain current
  { from: 'decide_next', action: 'practice', to: 'user_explain' }, // More practice
  { from: 'decide_next', action: 'complete', to: 'complete' }, // Session done
  
  // Pause from any active state
  { from: 'explain', action: 'pause', to: 'paused' },
  { from: 'user_explain', action: 'pause', to: 'paused' },
  { from: 'evaluate', action: 'pause', to: 'paused' },
  { from: 'decide_next', action: 'pause', to: 'paused' },
  
  // Resume goes back to explain (safest state)
  { from: 'paused', action: 'resume', to: 'explain' },
];

/**
 * Get the next state given current state and action
 */
export function getNextState(currentState: SessionState, action: SessionAction): SessionState | null {
  const transition = transitions.find(
    t => t.from === currentState && t.action === action
  );
  return transition?.to ?? null;
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(currentState: SessionState, action: SessionAction): boolean {
  return getNextState(currentState, action) !== null;
}

/**
 * Get all valid actions for a given state
 */
export function getValidActions(currentState: SessionState): SessionAction[] {
  return transitions
    .filter(t => t.from === currentState)
    .map(t => t.action);
}

/**
 * Check if state is terminal (no further transitions except pause/resume)
 */
export function isTerminalState(state: SessionState): boolean {
  return state === 'complete';
}

/**
 * Check if state is pauseable
 */
export function isPauseableState(state: SessionState): boolean {
  return ['explain', 'user_explain', 'evaluate', 'decide_next'].includes(state);
}

/**
 * Get the AI role responsible for the current state
 */
export function getResponsibleRole(state: SessionState): 'tutor' | 'examiner' | 'coach' | null {
  switch (state) {
    case 'init':
    case 'explain':
      return 'tutor';
    case 'evaluate':
      return 'examiner';
    case 'decide_next':
      return 'coach';
    default:
      return null;
  }
}
