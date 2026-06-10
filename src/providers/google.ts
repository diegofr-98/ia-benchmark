import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ProviderAdapter, ProviderRunResult } from '../types/index.js';
import { estimateTokens, measureStream } from '../utils/streaming.js';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

async function* streamGenerator(model: string, prompt: string): AsyncGenerator<{ text: string }> {
  const client = getClient();
  const geminiModel = client.getGenerativeModel({ model });
  const result = await geminiModel.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
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
