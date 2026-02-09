import OpenAI from 'openai';
import { env } from '../../../config/env.js';

const client = env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: 'openai';
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

/**
 * OpenAI adapter for GPT-4o
 * Used for: Planner, Examiner, Reviewer (structured outputs)
 */
export async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  options: LLMOptions = {}
): Promise<LLMResponse> {
  if (!client) {
    throw new Error('OpenAI API key not configured');
  }

  const model = options.model || 'gpt-4o';
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 4096;

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: options.responseFormat === 'json' 
      ? { type: 'json_object' } 
      : undefined,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const choice = response.choices[0];
  
  return {
    content: choice.message.content || '',
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
    model: response.model,
    provider: 'openai',
  };
}

/**
 * Call OpenAI with retry logic
 */
export async function callOpenAIWithRetry(
  systemPrompt: string,
  userMessage: string,
  options: LLMOptions = {},
  maxRetries: number = 3
): Promise<LLMResponse> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callOpenAI(systemPrompt, userMessage, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`OpenAI call failed (attempt ${i + 1}/${maxRetries}):`, error);
      
      // Wait before retry with exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('OpenAI call failed after retries');
}

/**
 * Check if OpenAI is available
 */
export function isOpenAIAvailable(): boolean {
  return client !== null;
}

/**
 * Estimate token count for a string (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
