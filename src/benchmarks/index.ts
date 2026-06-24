import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Benchmark } from '../types/index.js';
import { loadCustomBenchmarks } from './custom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadBenchmarks(): Promise<Benchmark[]> {
  const files = await readdir(__dirname);
  const benchmarks: Benchmark[] = [];

  const currentExt = path.extname(__filename);

  for (const file of files) {
    if (file.startsWith('index.')) continue;
    if (file.startsWith('custom.')) continue;
    if (path.extname(file) !== currentExt) continue;

    const mod = await import(pathToFileURL(path.join(__dirname, file)).href);

    if (mod.name && typeof mod.run === 'function') {
      benchmarks.push(mod as Benchmark);
    }
  }

  const custom = await loadCustomBenchmarks();
  benchmarks.push(...custom);

  return benchmarks;
}

export function filterBenchmarks(benchmarks: Benchmark[], type: string): Benchmark[] {
  if (!type || type === 'all') return benchmarks;
  return benchmarks.filter((b) => b.name === type || b.category === type);
}
