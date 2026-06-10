import { writeFile } from 'node:fs/promises';
import { stringify } from 'csv-stringify/sync';
import type { Benchmark, BenchmarkResult } from '../types/index.js';

interface RunMap {
  [benchmarkName: string]: {
    [modelKey: string]: BenchmarkResult;
  };
}

interface ResultsData {
  models: string[];
  benchmarks: Pick<Benchmark, 'name' | 'category' | 'description'>[];
  runs: RunMap;
}

export async function exportJSON(results: ResultsData, filePath: string): Promise<void> {
  const data = {
    generatedAt: new Date().toISOString(),
    models: results.models,
    benchmarks: results.benchmarks.map((b) => ({ name: b.name, category: b.category, description: b.description })),
    runs: results.runs,
  };
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Results exported to ${filePath}`);
}

export async function exportCSV(results: ResultsData, filePath: string): Promise<void> {
  const records: Record<string, string | number>[] = [];

  for (const bm of results.benchmarks) {
    for (const model of results.models) {
      const run = results.runs[bm.name]?.[model];
      if (!run) continue;

      records.push({
        benchmark: bm.name,
        model,
        score: run.score ?? '',
        ttft_ms: run.ttft ?? '',
        throughput_tok_s: run.throughput ?? '',
        tokens: run.tokens ?? '',
        cost: run.cost != null ? Number(run.cost.toFixed(6)) : '',
      });
    }
  }

  const csv = stringify(records, { header: true });
  await writeFile(filePath, csv, 'utf-8');
  console.log(`Results exported to ${filePath}`);
}
