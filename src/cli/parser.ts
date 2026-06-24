export interface ParsedArgs {
  models: { provider: string; model: string }[];
  benchmarkType: string;
  json?: string;
  csv?: string;
  verbose: boolean;
  benchmarkList: boolean;
  createBenchmark: boolean;
}

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface YargsArgv {
  all?: boolean;
  'benchmark-type'?: string;
  'benchmark-list'?: boolean;
  'create-benchmark'?: boolean;
  json?: string;
  csv?: string;
  verbose?: boolean;
  _: (string | number)[];
  $0: string;
}

export function parseArgs(): ParsedArgs {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: node index.js <provider:model> [provider:model...] [options]')
    .example('node index.js openai:gpt-5.5 --all', 'Run all benchmarks for a model')
    .example('node index.js openai:gpt-5.5 -b reasoning', 'Run a specific benchmark')
    .example('node index.js openai:gpt-5.5 anthropic:claude-4 --all', 'Compare multiple models')
    .option('all', {
      alias: 'a',
      type: 'boolean' as const,
      description: 'Run all benchmarks',
    })
    .option('benchmark-type', {
      alias: 'b',
      type: 'string' as const,
      description: 'Benchmark type to run (name or category)',
    })
    .option('benchmark-list', {
      alias: 'L',
      type: 'boolean' as const,
      description: 'List custom benchmarks',
    })
    .option('create-benchmark', {
      alias: 'C',
      type: 'boolean' as const,
      description: 'Create a new benchmark interactively',
    })
    .option('json', {
      type: 'string' as const,
      description: 'Export results to JSON',
    })
    .option('csv', {
      type: 'string' as const,
      description: 'Export results to CSV',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean' as const,
      description: 'Verbose mode',
    })
    .check((argv: YargsArgv) => {
      if (argv['benchmark-list'] || argv['create-benchmark']) {
        return true;
      }
      if (argv._.length === 0) {
        throw new Error('Specify at least one model in provider:model format');
      }
      for (const arg of argv._) {
        if (typeof arg !== 'string' || !arg.includes(':')) {
          throw new Error(`Invalid format: "${arg}". Use provider:model (e.g. openai:gpt-5.5)`);
        }
      }
      if (!argv.all && !argv['benchmark-type']) {
        throw new Error('Specify --all or --benchmark-type');
      }
      return true;
    })
    .parse() as YargsArgv;

  const benchmarkType = argv.all ? 'all' : (argv['benchmark-type'] ?? 'all');

  return {
    models: argv._.map((arg) => {
      const [provider, ...rest] = String(arg).split(':');
      return { provider: provider.toLowerCase(), model: rest.join(':') };
    }),
    benchmarkType,
    json: argv.json,
    csv: argv.csv,
    verbose: argv.verbose ?? false,
    benchmarkList: argv['benchmark-list'] ?? false,
    createBenchmark: argv['create-benchmark'] ?? false,
  };
}
