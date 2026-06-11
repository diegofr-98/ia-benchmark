import type { BenchmarkProgressCallback, BenchmarkResult, ProviderAdapter } from '../types/index.js';

interface Question {
  prompt: string;
  answer: string;
  rubric: 'exact' | 'contains';
}

const questions: Question[] = [
  {
    prompt: 'Solve: 2 + 2 * 2\nAnswer with just the number.',
    answer: '6',
    rubric: 'exact',
  },
  {
    prompt: 'What is the square root of 144?\nAnswer with just the number.',
    answer: '12',
    rubric: 'exact',
  },
  {
    prompt: 'If f(x) = 2x^2 + 3x - 5, what is f(3)?\nAnswer with just the number.',
    answer: '22',
    rubric: 'exact',
  },
  {
    prompt: 'How many zeros does the function f(x) = x^2 - 5x + 6 have?\nAnswer with just the number.',
    answer: '2',
    rubric: 'exact',
  },
  {
    prompt: 'What is the derivative of f(x) = 3x^4 + 2x^3 - x + 7?\nGive your answer as a polynomial.',
    answer: '12x^3+6x^2-1',
    rubric: 'contains',
  },
  {
    prompt:
      'A train leaves Station A at 60 mph. Another train leaves Station B at 90 mph. The stations are 300 miles apart. If they travel toward each other, how long until they meet?\nGive your answer in hours as a decimal.',
    answer: '2',
    rubric: 'contains',
  },
  {
    prompt: 'What is 15! (15 factorial)?\nAnswer with just the number.',
    answer: '1307674368000',
    rubric: 'exact',
  },
];

export const name = 'math';
export const category = 'math';
export const description = 'Evaluates mathematical reasoning and computation';

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

export async function run(
  provider: ProviderAdapter,
  model: string,
  onProgress?: BenchmarkProgressCallback,
): Promise<BenchmarkResult> {
  const results: { score: number; ttft: number; throughput: number; tokens: number; cost: number }[] = [];

  for (const [i, q] of questions.entries()) {
    const response = await provider.run(model, q.prompt);
    const correct = !!scoreResponse(response.text, q);
    results.push({
      score: correct ? 1 : 0,
      ttft: response.ttft,
      throughput: response.throughput,
      tokens: response.tokens,
      cost: 0,
    });
    onProgress?.({
      questionIndex: i + 1,
      totalQuestions: questions.length,
      correct,
      ttft: response.ttft,
      tokens: response.tokens,
      throughput: response.throughput,
      responseSnippet: response.text.trim(),
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
