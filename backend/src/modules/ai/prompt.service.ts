import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// AI Role types
export type AIRole = 'planner' | 'tutor' | 'examiner' | 'coach' | 'reviewer';

// Context variables that can be injected into prompts
export interface PromptContext {
  // Content context
  contentTitle?: string;
  contentDescription?: string;
  contentSections?: string;
  
  // Concept context
  conceptTitle?: string;
  conceptDescription?: string;
  
  // User context
  userMessage?: string;
  completedConcepts?: string;
  previousStruggles?: string;
  
  // Session context
  sessionState?: string;
  sessionHistory?: string;
  currentConceptStatus?: string;
  recentEvaluation?: string;
  timeSpent?: number;
  
  // RAG context
  relevantSections?: string;
  
  // Custom variables
  [key: string]: string | number | undefined;
}

// Get the prompts directory path
function getPromptsDir(): string {
  // Works both in development (src) and production (dist)
  return join(process.cwd(), 'prompts');
}

/**
 * Get all available versions for a role
 */
export function getAvailableVersions(role: AIRole): string[] {
  const roleDir = join(getPromptsDir(), role);
  
  if (!existsSync(roleDir)) {
    return [];
  }
  
  const files = readdirSync(roleDir);
  return files
    .filter(f => f.endsWith('.txt'))
    .map(f => f.replace('.txt', ''))
    .sort((a, b) => {
      const numA = parseInt(a.replace('v', ''));
      const numB = parseInt(b.replace('v', ''));
      return numB - numA; // Descending order (latest first)
    });
}

/**
 * Get the latest version for a role
 */
export function getLatestVersion(role: AIRole): string {
  const versions = getAvailableVersions(role);
  return versions[0] || 'v1';
}

/**
 * Load a prompt template from the filesystem
 */
export function loadPromptTemplate(role: AIRole, version?: string): string {
  const promptsDir = getPromptsDir();
  const targetVersion = version || getLatestVersion(role);
  const promptPath = join(promptsDir, role, `${targetVersion}.txt`);
  
  if (!existsSync(promptPath)) {
    // Fallback to latest version if specified version doesn't exist
    const latestVersion = getLatestVersion(role);
    const fallbackPath = join(promptsDir, role, `${latestVersion}.txt`);
    
    if (!existsSync(fallbackPath)) {
      throw new Error(`Prompt not found for role: ${role}`);
    }
    
    console.warn(`⚠️ Prompt ${role}/${targetVersion} not found, using ${latestVersion}`);
    return readFileSync(fallbackPath, 'utf-8');
  }
  
  return readFileSync(promptPath, 'utf-8');
}

/**
 * Inject context variables into a prompt template
 * Replaces {{variableName}} with actual values
 */
export function injectContext(template: string, context: PromptContext): string {
  let result = template;
  
  for (const [key, value] of Object.entries(context)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const replacement = value !== undefined ? String(value) : '';
    result = result.replace(placeholder, replacement);
  }
  
  // Remove any remaining unmatched placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
  return result;
}

/**
 * Build a complete prompt for an AI role with context
 */
export function buildPrompt(
  role: AIRole,
  context: PromptContext,
  version?: string
): { prompt: string; version: string } {
  const actualVersion = version || getLatestVersion(role);
  const template = loadPromptTemplate(role, actualVersion);
  const prompt = injectContext(template, context);
  
  return {
    prompt,
    version: actualVersion,
  };
}

/**
 * Get role metadata
 */
export function getRoleMetadata(role: AIRole): {
  name: string;
  provider: 'openai' | 'deepseek';
  outputFormat: 'json' | 'text';
} {
  const metadata: Record<AIRole, { name: string; provider: 'openai' | 'deepseek'; outputFormat: 'json' | 'text' }> = {
    planner: { name: 'Planner', provider: 'openai', outputFormat: 'json' },
    tutor: { name: 'Tutor', provider: 'deepseek', outputFormat: 'text' },
    examiner: { name: 'Examiner', provider: 'openai', outputFormat: 'json' },
    coach: { name: 'Coach', provider: 'deepseek', outputFormat: 'json' },
    reviewer: { name: 'Reviewer', provider: 'openai', outputFormat: 'json' },
  };
  
  return metadata[role];
}

/**
 * List all available roles with their metadata
 */
export function listRoles(): Array<{
  id: AIRole;
  name: string;
  provider: 'openai' | 'deepseek';
  versions: string[];
}> {
  const roles: AIRole[] = ['planner', 'tutor', 'examiner', 'coach', 'reviewer'];
  
  return roles.map(role => ({
    id: role,
    ...getRoleMetadata(role),
    versions: getAvailableVersions(role),
  }));
}
