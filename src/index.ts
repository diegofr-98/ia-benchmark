#!/usr/bin/env node

import pc from 'picocolors';

import { filterBenchmarks, loadBenchmarks } from './benchmarks/index.js';
import { parseArgs } from './cli/parser.js';
import { exportCSV, exportJSON } from './output/exporters.js';
import { renderResults } from './output/table.js';
import { calculateCost, initPricing } from './pricing/index.js';
import { getProvider } from './providers/index.js';

async function main(): Promise<void> {
  const args = parseArgs();

  console.log(pc.dim('\nInitializing pricing...'));
  await initPricing();

  console.log(pc.dim('\nLoading benchmarks...'));
  const allBenchmarks = await loadBenchmarks();
  const benchmarks = filterBenchmarks(allBenchmarks, args.benchmarkType);

  if (benchmarks.length === 0) {
    console.error(pc.red(`No benchmarks found for "${args.benchmarkType}".`));
    console.error(pc.red(`Available benchmarks: ${allBenchmarks.map((b) => b.name).join(', ')}`));
    process.exit(1);
  }

  console.log(pc.bold(`\nRunning ${benchmarks.length} benchmark(s) on ${args.models.length} model(s)...`));

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
      console.log(pc.cyan(`\nModel: ${modelKey}`));
    }

    let provider: ReturnType<typeof getProvider>;
    try {
      provider = getProvider(providerName);
    } catch (err) {
      console.error(pc.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }

    const benchmarkPromises = benchmarks.map(async (bm) => {
      console.log(`\n  ${pc.cyan(bm.name)} ${pc.dim(bm.description)}`);

      try {
        const result = await bm.run(provider, modelName, (ev) => {
          const icon = ev.correct ? pc.green('✓') : pc.red('✗');
          const snippet = ev.responseSnippet.length > 50 ? `${ev.responseSnippet.slice(0, 50)}…` : ev.responseSnippet;
          console.log(
            `    ${pc.dim(`Q${ev.questionIndex}/${ev.totalQuestions}`)} ${icon}  ` +
              `${pc.bold(`score=${ev.correct ? 1 : 0}`)}  ` +
              `${pc.yellow(`${ev.ttft}ms`)} ttft  ` +
              `${pc.yellow(`${ev.tokens}`)} tokens  ` +
              `${pc.yellow(`${ev.throughput}`)} tok/s  ` +
              `${pc.dim(`respuesta="${snippet}"`)}`,
          );
        });
        result.cost = calculateCost(
          providerName,
          modelName,
          result.promptTokens || 0,
          result.completionTokens || result.tokens || 0,
        );
        results.runs[bm.name][modelKey] = result;
        const scoreColor = result.score >= 80 ? pc.green : result.score >= 50 ? pc.yellow : pc.red;
        console.log(
          `  ${pc.green('✓')} ${pc.cyan(bm.name)}: ` +
            `${scoreColor(pc.bold(`score=${result.score}/100`))}  ` +
            `${pc.dim(`${result.ttft}ms`)}  ` +
            `${pc.yellow(`$${result.cost.toFixed(4)}`)} cost`,
        );
      } catch (err) {
        console.error(`  ${pc.red('✗')} ${pc.cyan(bm.name)}: ${pc.red((err as Error).message)}`);
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
  console.log(pc.bold(`\nTotal estimated cost: ${pc.yellow(`$${totalCost.toFixed(4)}`)}`));
}

main().catch((err) => {
  console.error(pc.red(`Error: ${(err as Error).message}`));
  process.exit(1);
});
