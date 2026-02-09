import { AIRole, getRoleMetadata } from './prompt.service.js';
import { callOpenAIWithRetry, LLMOptions, LLMResponse, isOpenAIAvailable } from './providers/openai.adapter.js';
import { callDeepSeekWithFallback, DeepSeekResponse, isDeepSeekAvailable } from './providers/deepseek.adapter.js';

export type LLMProvider = 'openai' | 'deepseek';

/**
 * Route an AI role to the appropriate LLM provider
 */
export function getProviderForRole(role: AIRole): LLMProvider {
  const metadata = getRoleMetadata(role);
  return metadata.provider;
}

/**
 * Get the response format for a role
 */
export function getResponseFormatForRole(role: AIRole): 'json' | 'text' {
  const metadata = getRoleMetadata(role);
  return metadata.outputFormat;
}

/**
 * Check provider availability
 */
export function getAvailableProviders(): { openai: boolean; deepseek: boolean } {
  return {
    openai: isOpenAIAvailable(),
    deepseek: isDeepSeekAvailable(),
  };
}

/**
 * Call the appropriate LLM provider based on role
 */
export async function routeToProvider(
  role: AIRole,
  systemPrompt: string,
  userMessage: string,
  options: Partial<LLMOptions> = {}
): Promise<LLMResponse | DeepSeekResponse> {
  const provider = getProviderForRole(role);
  const responseFormat = getResponseFormatForRole(role);
  
  const llmOptions: LLMOptions = {
    ...options,
    responseFormat,
  };

  if (provider === 'deepseek') {
    return await callDeepSeekWithFallback(systemPrompt, userMessage, llmOptions);
  } else {
    return await callOpenAIWithRetry(systemPrompt, userMessage, llmOptions);
  }
}

/**
 * Get cost estimate for tokens (approximate)
 */
export function estimateCost(
  provider: LLMProvider,
  promptTokens: number,
  completionTokens: number
): number {
  // Approximate costs per 1K tokens (as of early 2024)
  const costs: Record<LLMProvider, { input: number; output: number }> = {
    openai: { input: 0.005, output: 0.015 }, // GPT-4o
    deepseek: { input: 0.0001, output: 0.0002 }, // DeepSeek V3
  };
  
  const { input, output } = costs[provider];
  return (promptTokens / 1000 * input) + (completionTokens / 1000 * output);
}
