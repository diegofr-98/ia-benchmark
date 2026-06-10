import type { BenchmarkResult, ProviderAdapter } from '../types/index.js';

interface Question {
  prompt: string;
  check: (text: string) => boolean;
}

const questions: Question[] = [
  {
    prompt: `Please respond with EXACTLY the word "BANANA" in all caps, followed by the number of the current year. Nothing else. No punctuation. Just the word and the number separated by a space.`,
    check: (text) => {
      const t = text.trim().toUpperCase();
      return t.startsWith('BANANA') && /\d{4}/.test(t);
    },
  },
  {
    prompt: `List exactly three reasons why the sky is blue. Format each reason on a new line starting with a dash and a space ("- "). Do not include any other text.`,
    check: (text) => {
      const lines = text
        .trim()
        .split('\n')
        .filter((l) => l.trim());
      return lines.length === 3 && lines.every((l) => l.trim().startsWith('-'));
    },
  },
  {
    prompt: `Translate the following sentence to Spanish: "The quick brown fox jumps over the lazy dog."
Respond with ONLY the Spanish translation, no quotes, no additional text.`,
    check: (text) => {
      const t = text.toLowerCase().trim();
      return t.includes('rápido') || t.includes('rapido') || t.includes('zorro') || t.includes('perro');
    },
  },
  {
    prompt: `Write a short poem of exactly 4 lines about programming. Each line must be on its own line. Do not include a title or any additional text.`,
    check: (text) => {
      const lines = text
        .trim()
        .split('\n')
        .filter((l) => l.trim());
      return lines.length === 4;
    },
  },
  {
    prompt: `I want you to classify the following sentiment as POSITIVE, NEGATIVE, or NEUTRAL. Respond with ONLY one of those three words in uppercase.

Text: "The product is amazing and exceeded all my expectations!"`,
    check: (text) => {
      const t = text.trim().toUpperCase();
      return t === 'POSITIVE' || t.includes('POSITIVE');
    },
  },
  {
    prompt: `Summarize the following text in EXACTLY one sentence:

"Artificial intelligence has transformed many industries. From healthcare to finance, AI systems are being used to automate tasks, analyze data, and make predictions. However, there are also concerns about job displacement and ethical implications."`,
    check: (text) => {
      const sentences = text
        .trim()
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0);
      return sentences.length <= 2;
    },
  },
];

export const name = 'instruction';
export const category = 'instruction';
export const description = 'Evaluates ability to follow complex instructions precisely';

export async function run(provider: ProviderAdapter, model: string): Promise<BenchmarkResult> {
  const results: { score: number; ttft: number; throughput: number; tokens: number; cost: number }[] = [];

  for (const q of questions) {
    const response = await provider.run(model, q.prompt);
    const passed = q.check(response.text);
    results.push({
      score: passed ? 1 : 0,
      ttft: response.ttft,
      throughput: response.throughput,
      tokens: response.tokens,
      cost: 0,
    });
  }

  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const score = Math.round((totalScore / questions.length) * 100);
  const avgTtft = Math.round(results.reduce((s, r) => s + r.ttft, 0) / results.length);
  const avgThroughput = results.reduce((s, r) => s + r.throughput, 0) / results.length;
  const totalTokens = results.reduce((s, r) => s + r.tokens, 0);
  const totalCost = results.reduce((s, r) => s + (r.cost || 0), 0);

  return {
    score,
    ttft: avgTtft,
    throughput: Math.round(avgThroughput * 10) / 10,
    tokens: totalTokens,
    cost: totalCost,
    details: results,
  };
}
