import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';
import type { Benchmark, BenchmarkProgressCallback, BenchmarkResult, ProviderAdapter } from '../types/index.js';

// Shared prompt state for non-TTY (piped) mode
let pipedLines: string[] | null = null;
let pipedIndex = 0;

/** Initialize prompt state by pre-reading all stdin lines in piped mode. */
export async function initPipedPrompt(): Promise<void> {
  if (!input.isTTY && pipedLines === null) {
    const rl = readline.createInterface({ input });
    const lines: string[] = [];
    for await (const line of rl) {
      lines.push(line);
    }
    pipedLines = lines;
  }
}

/**
 * Prompt the user for input. In TTY mode uses readline interactively.
 * In piped mode returns the next pre-read line and writes the query to stderr.
 */
export async function promptUser(query: string): Promise<string> {
  if (pipedLines !== null) {
    process.stderr.write(query);
    return pipedLines[pipedIndex++] ?? '';
  }
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(query);
  rl.close();
  return answer;
}

export interface TestCase {
  args: string;
  expected: unknown;
}

export interface CustomQuestionJSON {
  prompt: string;
  answer?: string;
  rubric?: 'exact' | 'contains';
  check?: string;
  eval?: string;
  test_cases?: TestCase[];
  regex?: string;
}

export interface CustomBenchmarkJSON {
  name: string;
  description: string;
  type: string;
  questions: CustomQuestionJSON[];
}

function getBenchmarksDir(): string {
  return path.join(process.cwd(), 'custom-benchmarks');
}

async function ensureBenchmarksDir(): Promise<void> {
  const dir = getBenchmarksDir();
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadCustomBenchmarks(): Promise<Benchmark[]> {
  const dir = getBenchmarksDir();
  try {
    await access(dir);
  } catch {
    return [];
  }

  const files = await readdir(dir);
  const benchmarks: Benchmark[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = await readFile(path.join(dir, file), 'utf-8');
      const json = JSON.parse(content) as CustomBenchmarkJSON;
      if (json.name && json.questions?.length) {
        benchmarks.push(convertToBenchmark(json));
      }
    } catch {
      // skip invalid files
    }
  }

  return benchmarks;
}

export async function listCustomBenchmarks(): Promise<CustomBenchmarkJSON[]> {
  const dir = getBenchmarksDir();
  try {
    await access(dir);
  } catch {
    return [];
  }

  const files = await readdir(dir);
  const list: CustomBenchmarkJSON[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = await readFile(path.join(dir, file), 'utf-8');
      const json = JSON.parse(content) as CustomBenchmarkJSON;
      if (json.name) {
        list.push(json);
      }
    } catch {
      // skip invalid
    }
  }

  return list;
}

function convertToBenchmark(json: CustomBenchmarkJSON): Benchmark {
  return {
    name: json.name,
    category: json.type || 'custom',
    description: json.description,
    run: async (
      provider: ProviderAdapter,
      model: string,
      onProgress?: BenchmarkProgressCallback,
    ): Promise<BenchmarkResult> => {
      const results: { score: number; ttft: number; throughput: number; tokens: number; cost: number }[] = [];

      for (const [i, q] of json.questions.entries()) {
        const response = await provider.run(model, q.prompt);
        const correct = scoreQuestion(response.text, q);

        results.push({
          score: correct ? 1 : 0,
          ttft: response.ttft,
          throughput: response.throughput,
          tokens: response.tokens,
          cost: 0,
        });

        onProgress?.({
          questionIndex: i + 1,
          totalQuestions: json.questions.length,
          correct,
          ttft: response.ttft,
          tokens: response.tokens,
          throughput: response.throughput,
          responseSnippet: response.text.trim(),
        });
      }

      const totalScore = results.reduce((s, r) => s + r.score, 0);
      const score = Math.round((totalScore / json.questions.length) * 100);
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
    },
  };
}

function scoreQuestion(response: string, q: CustomQuestionJSON): boolean {
  const text = response.trim();

  if (q.answer !== undefined && q.rubric !== undefined) {
    const t = text.toLowerCase();
    const expected = q.answer.toLowerCase();
    if (q.rubric === 'exact') {
      return t === expected || t.includes(expected);
    }
    if (q.rubric === 'contains') {
      return t.includes(expected);
    }
    return false;
  }

  if (q.check !== undefined) {
    try {
      const trimmed = q.check.trim();
      const body =
        trimmed.startsWith('return ') || trimmed.startsWith('{') || trimmed.startsWith('if')
          ? q.check
          : `return (${q.check})`;
      const fn = new Function('text', body) as (text: string) => boolean;
      return fn(text);
    } catch {
      return false;
    }
  }

  if (q.eval !== undefined) {
    try {
      const fn = new Function('code', q.eval) as (code: string) => boolean;
      return fn(text);
    } catch {
      return false;
    }
  }

  if (q.test_cases !== undefined && q.test_cases.length > 0) {
    try {
      const fn = eval(`(${text})`) as (...args: unknown[]) => unknown;
      return q.test_cases.every((tc) => {
        const args = JSON.parse(tc.args) as unknown[];
        const result = fn(...args);
        return deepEqual(result, tc.expected);
      });
    } catch {
      return false;
    }
  }

  if (q.regex !== undefined) {
    try {
      return new RegExp(q.regex).test(text);
    } catch {
      return false;
    }
  }

  return false;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && a !== null && b !== null) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

export async function createBenchmarkWizard(): Promise<void> {
  await ensureBenchmarksDir();

  console.log('\nCreate a new benchmark\n');

  const name = await promptUser('Benchmark name: ');
  const description = await promptUser('Description: ');
  const typeRaw = await promptUser('Type/category (default: custom): ');
  const type = typeRaw || 'custom';

  const questions: CustomQuestionJSON[] = [];
  let addMore = true;

  while (addMore) {
    console.log(`\n--- Question ${questions.length + 1} ---`);
    const qPrompt = await promptUser('Prompt: ');

    const methodRaw = await promptUser('Grading method (answer / check / eval / test_cases / regex) [answer]: ');
    const method = methodRaw || 'answer';

    if (method === 'answer') {
      const answer = await promptUser('Expected answer: ');
      const rubricRaw = await promptUser('Rubric (exact / contains) [exact]: ');
      const rubric = (rubricRaw || 'exact') as 'exact' | 'contains';
      questions.push({ prompt: qPrompt, answer, rubric });
    } else if (method === 'check') {
      const check = await promptUser('Check function (text) => return ... : ');
      questions.push({ prompt: qPrompt, check });
    } else if (method === 'eval') {
      const evalStr = await promptUser('Eval function (code) => return ... : ');
      questions.push({ prompt: qPrompt, eval: evalStr });
    } else if (method === 'test_cases') {
      const testCases: TestCase[] = [];
      let addCase = true;
      while (addCase) {
        const args = await promptUser(`  Test case ${testCases.length + 1} args (e.g. [1,2]): `);
        const expectedRaw = await promptUser(`  Test case ${testCases.length + 1} expected: `);
        let expected: unknown;
        try {
          expected = JSON.parse(expectedRaw);
        } catch {
          expected = expectedRaw;
        }
        testCases.push({ args, expected });
        const moreCase = await promptUser('  Add another test case? (Y/n): ');
        addCase = moreCase.toLowerCase() !== 'n';
      }
      questions.push({ prompt: qPrompt, test_cases: testCases });
    } else if (method === 'regex') {
      const regex = await promptUser('Regex pattern: ');
      questions.push({ prompt: qPrompt, regex });
    }

    const moreRaw = await promptUser('\nAdd another question? (Y/n): ');
    addMore = moreRaw.toLowerCase() !== 'n';
  }

  const benchmark: CustomBenchmarkJSON = { name, description, type, questions };
  const filePath = path.join(getBenchmarksDir(), `${name}.json`);
  await writeFile(filePath, JSON.stringify(benchmark, null, 2), 'utf-8');
  console.log(`\n✓ Benchmark saved to ${filePath}`);
}
