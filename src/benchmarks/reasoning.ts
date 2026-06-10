import type { BenchmarkResult, ProviderAdapter } from '../types/index.js';

interface Question {
  prompt: string;
  answer: string;
  rubric: 'exact' | 'contains';
}

const questions: Question[] = [
  {
    prompt: `If all Zargs are Zorbs, and some Zorbs are Zings, which of the following must be true?
A) All Zings are Zargs
B) Some Zargs are Zings
C) All Zorbs are Zargs
D) None of the above

Reason step by step and give your answer as a single letter (A, B, C, or D).`,
    answer: 'D',
    rubric: 'exact',
  },
  {
    prompt: `There are three boxes: one contains only apples, one contains only oranges, and one contains both apples and oranges. All boxes are mislabeled. You pick one fruit from one box without looking inside. How many fruits do you need to pick to determine the correct labels for all boxes? Explain your reasoning.

Give your final answer as a single number.`,
    answer: '1',
    rubric: 'exact',
  },
  {
    prompt: `A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?

Think step by step and give your final answer as a dollar amount (e.g., $0.05).`,
    answer: '$0.05',
    rubric: 'contains',
  },
  {
    prompt: `If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?

Give your answer as a number followed by "minutes" (e.g., "5 minutes").`,
    answer: '5 minutes',
    rubric: 'contains',
  },
  {
    prompt: `Alice is looking at Bob. Bob is looking at Carol. Alice is married, Carol is unmarried. Is a married person looking at an unmarried person?
A) Yes
B) No
C) Cannot be determined

Give your answer as a single letter.`,
    answer: 'A',
    rubric: 'exact',
  },
  {
    prompt: `You have a 3-gallon jug and a 5-gallon jug. How can you measure exactly 4 gallons of water?

Describe the steps clearly.`,
    answer: 'fill 5 gallon',
    rubric: 'contains',
  },
];

export const name = 'reasoning';
export const category = 'reasoning';
export const description = 'Evaluates logical reasoning and deduction ability';

function scoreResponse(response: string, question: Question): number {
  const text = response.trim().toLowerCase();
  const expected = question.answer.toLowerCase();

  if (question.rubric === 'exact') {
    return text.includes(expected) || text === expected ? 1 : 0;
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
