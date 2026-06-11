import Table from 'cli-table3';
import pc from 'picocolors';
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

function scoreColor(score: number): (s: string) => string {
  if (score >= 80) return pc.green;
  if (score >= 50) return pc.yellow;
  return pc.red;
}

function ttftColor(ms: number): (s: string) => string {
  if (ms < 2000) return pc.green;
  if (ms < 5000) return pc.yellow;
  return pc.red;
}

function costColor(cost: number): (s: string) => string {
  if (cost < 0.01) return pc.green;
  if (cost < 0.05) return pc.yellow;
  return pc.red;
}

export function renderResults(results: ResultsData): string {
  const isMulti = results.models.length > 1;

  if (isMulti) {
    return renderMultiModel(results.benchmarks, results.models, results.runs);
  }
  return renderSingleModel(results.benchmarks, results.models[0], results.runs);
}

function renderSingleModel(benchmarks: Pick<Benchmark, 'name'>[], model: string, runs: RunMap): string {
  const table = new Table({
    head: ['Benchmark', 'Score', 'TTFT', 'Tok/s', 'Tokens', 'Cost'],
    style: { head: ['cyan'], border: ['gray'] },
    chars: {
      top: '=',
      'top-mid': '+',
      'top-left': '+',
      'top-right': '+',
      bottom: '=',
      'bottom-mid': '+',
      'bottom-left': '+',
      'bottom-right': '+',
      left: '|',
      'left-mid': '+',
      mid: '-',
      'mid-mid': '+',
      right: '|',
      'right-mid': '+',
      middle: '|',
    },
  });

  let totalScore = 0;
  let totalTtft = 0;
  let totalThroughput = 0;
  let totalTokens = 0;
  let totalCost = 0;
  let count = 0;

  for (const bm of benchmarks) {
    const run = runs[bm.name]?.[model];
    if (!run) continue;

    table.push([
      bm.name,
      run.score != null ? scoreColor(run.score)(`${run.score}/100`) : pc.dim('N/A'),
      run.ttft != null ? ttftColor(run.ttft)(`${run.ttft}ms`) : pc.dim('N/A'),
      run.throughput != null ? pc.cyan(String(run.throughput)) : pc.dim('N/A'),
      run.tokens != null ? String(run.tokens) : pc.dim('N/A'),
      run.cost != null ? costColor(run.cost)(`$${run.cost.toFixed(4)}`) : pc.dim('N/A'),
    ]);

    totalScore += run.score || 0;
    totalTtft += run.ttft || 0;
    totalThroughput += run.throughput || 0;
    totalTokens += run.tokens || 0;
    totalCost += run.cost || 0;
    count++;
  }

  if (count > 0) {
    const avgScore = Math.round(totalScore / count);
    table.push([
      pc.bold('AVG'),
      pc.bold(scoreColor(avgScore)(`${avgScore}/100`)),
      pc.bold(ttftColor(Math.round(totalTtft / count))(`${Math.round(totalTtft / count)}ms`)),
      pc.bold(pc.cyan(`${(totalThroughput / count).toFixed(1)}`)),
      pc.bold(`${Math.round(totalTokens / count)}`),
      pc.bold(costColor(totalCost / count)(`${(totalCost / count).toFixed(4)}`)),
    ]);
  }

  return table.toString();
}

function renderMultiModel(benchmarks: Pick<Benchmark, 'name'>[], models: string[], runs: RunMap): string {
  const head = ['Benchmark', ...models, 'Winner'];
  const table = new Table({
    head,
    style: { head: ['cyan'], border: ['gray'] },
    chars: {
      top: '=',
      'top-mid': '+',
      'top-left': '+',
      'top-right': '+',
      bottom: '=',
      'bottom-mid': '+',
      'bottom-left': '+',
      'bottom-right': '+',
      left: '|',
      'left-mid': '+',
      mid: '-',
      'mid-mid': '+',
      right: '|',
      'right-mid': '+',
      middle: '|',
    },
  });

  const modelScores: Record<string, number[]> = {};
  const modelCosts: Record<string, number[]> = {};
  const modelTtfts: Record<string, number[]> = {};
  const modelThroughputs: Record<string, number[]> = {};
  for (const m of models) {
    modelScores[m] = [];
    modelCosts[m] = [];
    modelTtfts[m] = [];
    modelThroughputs[m] = [];
  }

  for (const bm of benchmarks) {
    const row: (string | number)[] = [bm.name];
    let bestScore = -1;
    let winner = '-';

    for (const m of models) {
      const run = runs[bm.name]?.[m];
      if (!run) {
        row.push(pc.dim('N/A'));
        continue;
      }

      const score = run.score ?? 0;
      row.push(scoreColor(score)(`${score}/100`));

      if (score > bestScore) {
        bestScore = score;
        winner = m;
      }

      modelScores[m].push(score);
      if (run.cost != null) modelCosts[m].push(run.cost);
      if (run.ttft != null) modelTtfts[m].push(run.ttft);
      if (run.throughput != null) modelThroughputs[m].push(run.throughput);
    }

    row.push(pc.bold(winner));
    table.push(row);
  }

  const avgRow: (string | number)[] = [pc.bold('AVG Score')];
  let bestAvgScore = -1;
  let overallWinner = '-';
  for (const m of models) {
    const scores = modelScores[m];
    if (scores.length === 0) {
      avgRow.push(pc.dim('N/A'));
      continue;
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    avgRow.push(pc.bold(scoreColor(avg)(avg.toFixed(1))));
    if (avg > bestAvgScore) {
      bestAvgScore = avg;
      overallWinner = m;
    }
  }
  avgRow.push(pc.bold(pc.green(overallWinner)));
  table.push(avgRow);

  const costRow: (string | number)[] = [pc.bold('AVG Cost')];
  for (const m of models) {
    const costs = modelCosts[m];
    if (costs.length === 0) {
      costRow.push(pc.dim('N/A'));
      continue;
    }
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    costRow.push(costColor(avg)(`$${avg.toFixed(4)}`));
  }
  costRow.push('');
  table.push(costRow);

  const ttftRow: (string | number)[] = [pc.bold('AVG TTFT')];
  for (const m of models) {
    const ttfts = modelTtfts[m];
    if (ttfts.length === 0) {
      ttftRow.push(pc.dim('N/A'));
      continue;
    }
    const avg = ttfts.reduce((a, b) => a + b, 0) / ttfts.length;
    ttftRow.push(ttftColor(avg)(`${avg.toFixed(0)}ms`));
  }
  ttftRow.push('');
  table.push(ttftRow);

  const tpRow: (string | number)[] = [pc.bold('AVG Tok/s')];
  for (const m of models) {
    const tps = modelThroughputs[m];
    if (tps.length === 0) {
      tpRow.push(pc.dim('N/A'));
      continue;
    }
    const avg = tps.reduce((a, b) => a + b, 0) / tps.length;
    tpRow.push(pc.cyan(avg.toFixed(1)));
  }
  tpRow.push('');
  table.push(tpRow);

  return table.toString();
}
