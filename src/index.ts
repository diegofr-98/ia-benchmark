#!/usr/bin/env node

import { filterBenchmarks, loadBenchmarks } from './benchmarks/index.js';
import { parseArgs } from './cli/parser.js';
import { exportCSV, exportJSON } from './output/exporters.js';
import { renderResults } from './output/table.js';
import { calculateCost, initPricing } from './pricing/index.js';
import { getProvider } from './providers/index.js';

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('\n Initializing pricing...');
  await initPricing();

  console.log('\n Loading benchmarks...');
  const allBenchmarks = await loadBenchmarks();
  const benchmarks = filterBenchmarks(allBenchmarks, args.benchmarkType);

  if (benchmarks.length === 0) {
    console.error(`No benchmarks found for "${args.benchmarkType}".`);
    console.error(`Available benchmarks: ${allBenchmarks.map((b) => b.name).join(', ')}`);
    process.exit(1);
  }

  console.log(` Running ${benchmarks.length} benchmark(s) on ${args.models.length} model(s)...\n`);

  const results = {
    models: args.models.map((s) => `${s.provider}:${s.model}`),
    benchmarks: benchmarks.map((b) => ({ name: b.name, category: b.category, description: b.description })),
    runs: {} as Record<
      string,
      Record<string, { score: number; ttft: number; throughput: number; tokens: number; cost: number; error?: string }>
    >,
  };

  for (const bm of benchmarks) {
    results.runs[bm.name] = {};
  }

  for (const spec of args.models) {
    const { provider: providerName, model: modelName } = spec;
    const modelKey = `${providerName}:${modelName}`;

    if (args.verbose) {
      console.log(`\n Model: ${modelKey}`);
    }

    let provider;
    try {
      provider = getProvider(providerName);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }

    const benchmarkPromises = benchmarks.map(async (bm) => {
      if (args.verbose) {
        console.log(`  → ${bm.name}...`);
      }

      try {
        const result = await bm.run(provider, modelName);
        result.cost = calculateCost(
          providerName,
          modelName,
          result.promptTokens || 0,
          result.completionTokens || result.tokens || 0,
        );
        results.runs[bm.name][modelKey] = result;

        if (args.verbose) {
          console.log(`  ✓ ${bm.name}: score=${result.score}, ttft=${result.ttft}ms, cost=$${result.cost.toFixed(4)}`);
        }
      } catch (err) {
        console.error(`  ✗ ${bm.name}: Error - ${(err as Error).message}`);
        results.runs[bm.name][modelKey] = {
          score: 0,
          ttft: 0,
          throughput: 0,
          tokens: 0,
          cost: 0,
          error: (err as Error).message,
        };
      }
    });

    await Promise.all(benchmarkPromises);
  }

  console.log(`\n${renderResults(results)}\n`);

  if (args.json) {
    await exportJSON(results, args.json);
  }

  if (args.csv) {
    await exportCSV(results, args.csv);
  }

  const totalCost = Object.values(results.runs).reduce((sum, modelRuns) => {
    return sum + Object.values(modelRuns).reduce((s, r) => s + (r.cost || 0), 0);
  }, 0);
  console.log(` Total estimated cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error('Error:', (err as Error).message);
  process.exit(1);
});
