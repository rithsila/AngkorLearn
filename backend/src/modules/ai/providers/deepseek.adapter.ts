import OpenAI from 'openai';
import { env } from '../../../config/env.js';
import { callOpenAIWithRetry, LLMResponse, LLMOptions } from './openai.adapter.js';

// DeepSeek uses OpenAI-compatible API
const client = env.DEEPSEEK_API_KEY 
  ? new OpenAI({ 
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    })
  : null;

export interface DeepSeekResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: 'deepseek';
}

/**
 * DeepSeek adapter for V3
 * Used for: Tutor, Coach (conversational, cost-effective)
 */
export async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options: LLMOptions = {}
): Promise<DeepSeekResponse> {
  if (!client) {
    throw new Error('DeepSeek API key not configured');
  }

  const model = options.model || 'deepseek-chat';
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 4096;

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
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
    provider: 'deepseek',
  };
}

/**
 * Call DeepSeek with fallback to OpenAI
 */
export async function callDeepSeekWithFallback(
  systemPrompt: string,
  userMessage: string,
  options: LLMOptions = {}
): Promise<LLMResponse | DeepSeekResponse> {
  // Try DeepSeek first
  if (client) {
    try {
      return await callDeepSeek(systemPrompt, userMessage, options);
    } catch (error) {
      console.warn('DeepSeek call failed, falling back to OpenAI:', error);
    }
  }
  
  // Fallback to OpenAI
  console.log('Using OpenAI as fallback for DeepSeek');
  return await callOpenAIWithRetry(systemPrompt, userMessage, options);
}

/**
 * Check if DeepSeek is available
 */
export function isDeepSeekAvailable(): boolean {
  return client !== null;
}
