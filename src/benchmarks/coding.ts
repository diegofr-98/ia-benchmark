import type { BenchmarkResult, ProviderAdapter } from '../types/index.js';

interface Question {
  prompt: string;
  test: (code: string) => boolean;
}

const questions: Question[] = [
  {
    prompt: `Write a JavaScript function that checks if a string is a palindrome (reads the same forwards and backwards). Ignore spaces, punctuation, and case.

Return ONLY the function, no explanation.`,
    test: (code) => {
      try {
        const fn = eval(`(${code})`) as (s: string) => boolean;
        return fn('racecar') === true && fn('A man a plan a canal Panama') === true && fn('hello') === false;
      } catch {
        return false;
      }
    },
  },
  {
    prompt: `Write a JavaScript function that takes an array of integers and returns the two numbers that sum to a target. Return them as an array [a, b]. If none exist, return null.

Return ONLY the function, no explanation.`,
    test: (code) => {
      try {
        const fn = eval(`(${code})`) as (arr: number[], target: number) => number[] | null;
        const r = fn([2, 7, 11, 15], 9);
        return JSON.stringify(r) === '[2,7]';
      } catch {
        return false;
      }
    },
  },
  {
    prompt: `Write a JavaScript function that fetches data from a URL and returns the JSON response using async/await.

Return ONLY the function, no explanation.`,
    test: (code) => {
      return code.includes('async') && code.includes('await') && code.includes('fetch');
    },
  },
  {
    prompt: `Write a JavaScript function that flattens a nested array (any depth) into a single-level array.

Return ONLY the function, no explanation.`,
    test: (code) => {
      try {
        const fn = eval(`(${code})`) as (arr: unknown[]) => unknown[];
        const r = fn([1, [2, [3, [4]], 5]]);
        return JSON.stringify(r) === '[1,2,3,4,5]';
      } catch {
        return false;
      }
    },
  },
  {
    prompt: `Write a JavaScript function that implements a debounce utility. It should take a function and a delay in ms, and return a debounced version.

Return ONLY the function, no explanation.`,
    test: (code) => {
      return code.includes('clearTimeout') && code.includes('setTimeout') && code.includes('apply');
    },
  },
];

export const name = 'coding';
export const category = 'coding';
export const description = 'Evaluates code generation ability';

export async function run(provider: ProviderAdapter, model: string): Promise<BenchmarkResult> {
  const results: { score: number; ttft: number; throughput: number; tokens: number; cost: number }[] = [];

  for (const q of questions) {
    const response = await provider.run(model, q.prompt);
    const passed = q.test(response.text);
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
