import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Benchmark } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadBenchmarks(): Promise<Benchmark[]> {
  const files = await readdir(__dirname);
  const benchmarks: Benchmark[] = [];

  for (const file of files) {
    if (file === 'index.ts' || file === 'index.js' || (!file.endsWith('.ts') && !file.endsWith('.js'))) continue;
    const mod = await import(path.join(__dirname, file));
    if (mod.name && typeof mod.run === 'function') {
      benchmarks.push(mod as Benchmark);
    }
  }

  return benchmarks;
}

export function filterBenchmarks(benchmarks: Benchmark[], type: string): Benchmark[] {
  if (!type || type === 'all') return benchmarks;
  return benchmarks.filter((b) => b.name === type || b.category === type);
}
