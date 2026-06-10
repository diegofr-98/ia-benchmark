import Anthropic from '@anthropic-ai/sdk';
import type { ProviderAdapter, ProviderRunResult } from '../types/index.js';
import { estimateTokens, measureStream } from '../utils/streaming.js';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

async function* streamGenerator(model: string, prompt: string): AsyncGenerator<{ text: string }> {
  const anthropic = getClient();
  const stream = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      const delta = chunk.delta as { text?: string };
      if (delta.text) {
        yield { text: delta.text };
      }
    }
  }
}

async function run(model: string, prompt: string): Promise<ProviderRunResult> {
  const result = await measureStream(() => streamGenerator(model, prompt));
  const promptTokens = estimateTokens(prompt);
  return {
    ...result,
    promptTokens,
    completionTokens: result.tokens,
  };
}

export const provider: ProviderAdapter = { run };
