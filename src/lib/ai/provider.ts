/**
 * AI Provider abstraction layer.
 * Default: DeepSeek (OpenAI-compatible).
 * All model calls go through this unified interface.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompleteOptions {
  system?: string;
  messages: ChatMessage[];
  model?: string;
  json?: boolean;
  maxTokens?: number;
}

export interface CompleteResult {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function complete(opts: CompleteOptions): Promise<CompleteResult> {
  // Phase 0: placeholder — returns mock response
  // Phase 2+: will use OpenAI SDK with DeepSeek base URL
  console.log('[ai/provider] complete() called — placeholder mode');
  return {
    content: JSON.stringify({ message: 'AI provider placeholder — Phase 2 will connect DeepSeek' }),
    model: 'placeholder',
  };
}
