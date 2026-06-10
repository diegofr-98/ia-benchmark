import OpenAI from 'openai';
import type { ProviderAdapter, ProviderRunResult } from '../types/index.js';
import { estimateTokens, measureStream } from '../utils/streaming.js';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    client = new OpenAI({ apiKey });
  }
  return client;
}

async function* streamGenerator(model: string, prompt: string): AsyncGenerator<{ text: string }> {
  const openai = getClient();
  const stream = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content || '';
    if (text) yield { text };
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
