import type { BenchmarkResult, ProviderAdapter } from '../types/index.js';

interface Question {
  prompt: string;
  answer: string;
  rubric: 'exact' | 'contains';
}

const questions: Question[] = [
  {
    prompt: 'What is the capital of Australia?\nAnswer with just the city name.',
    answer: 'Canberra',
    rubric: 'exact',
  },
  {
    prompt: 'What is the chemical symbol for gold?\nAnswer with just the symbol.',
    answer: 'Au',
    rubric: 'exact',
  },
  {
    prompt: 'In what year did the Berlin Wall fall?\nAnswer with just the year.',
    answer: '1989',
    rubric: 'exact',
  },
  {
    prompt: 'Who wrote the novel "One Hundred Years of Solitude"?\nAnswer with the full name.',
    answer: 'Gabriel Garcia Marquez',
    rubric: 'contains',
  },
  {
    prompt: 'What is the largest planet in our solar system?\nAnswer with the planet name.',
    answer: 'Jupiter',
    rubric: 'exact',
  },
  {
    prompt:
      'What is the speed of light in a vacuum, in meters per second?\nAnswer with just the number in scientific notation (e.g., 3e8).',
    answer: '3e8',
    rubric: 'contains',
  },
  {
    prompt: 'Which element has the atomic number 1?\nAnswer with just the element name.',
    answer: 'Hydrogen',
    rubric: 'contains',
  },
];

export const name = 'knowledge';
export const category = 'knowledge';
export const description = 'Evaluates general knowledge and factual recall';

function scoreResponse(response: string, question: Question): number {
  const text = response.trim().toLowerCase();
  const expected = question.answer.toLowerCase();

  if (question.rubric === 'exact') {
    return text === expected || text.includes(expected) ? 1 : 0;
  }
  if (question.rubric === 'contains') {
    return text.includes(expected) ? 1 : 0;
  }
  return 0;
}

export async function run(provider: ProviderAdapter, model: string): Promise<BenchmarkResult> {
  const results: { score: number; ttft: number; throughput: number; tokens: number; cost: number }[] = [];

  for (const q of questions) {
    const response = await provider.run(model, q.prompt);
    const correct = scoreResponse(response.text, q);
    results.push({
      score: correct ? 1 : 0,
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
