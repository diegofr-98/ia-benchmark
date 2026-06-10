# AI Benchmark CLI

CLI tool to run LLM benchmarks and compare performance, speed, and cost across multiple providers.

## Installation

```bash
git clone <repo>
cd ai-benchmark
npm install
```

## Basic usage

```bash
# Single model, all benchmarks
npx tsx src/index.ts openai:gpt-4o --all

# Single model, specific benchmark
npx tsx src/index.ts openai:gpt-4o -b reasoning

# Compare multiple models
npx tsx src/index.ts openai:gpt-4o anthropic:claude-sonnet-4.6 google:gemini-2.0-flash --all

# Export results
npx tsx src/index.ts openai:gpt-4o --all --json results.json --csv results.csv -v
```

You can also compile and run:

```bash
npm run build
node dist/index.js openai:gpt-4o --all
```

## Output: results table

### Single-model mode

Shows a single model's performance across all benchmarks:

```
+-------------+--------+-------+---------+----------+----------+
| Benchmark   | Score  | TTFT  | Tok/s   | Tokens   | Cost     |
+-------------+--------+-------+---------+----------+----------+
| reasoning   | 85/100 | 120ms | 45.2    | 500      | $0.0020  |
| knowledge   | 92/100 | 95ms  | 52.1    | 420      | $0.0018  |
| coding      | 78/100 | 150ms | 38.7    | 680      | $0.0028  |
| math        | 88/100 | 110ms | 48.3    | 380      | $0.0015  |
| instruction | 95/100 | 100ms | 50.0    | 450      | $0.0019  |
| safety      | 82/100 | 130ms | 42.5    | 520      | $0.0022  |
+-------------+--------+-------+---------+----------+----------+
| AVG         | 87/100 | 118ms | 46.1    | 492      | $0.0020  |
+-------------+--------+-------+---------+----------+----------+
```

### Multi-model mode (ranking)

Compares multiple models side by side and shows the winner for each benchmark:

```
+-------------+--------------+------------------+---------------------+----------------+
| Benchmark   | openai:gpt-5 | anthropic:claude | google:gemini-2.0   | Winner         |
+-------------+--------------+------------------+---------------------+----------------+
| reasoning   | 85/100       | 90/100           | 82/100              | claude-4       |
| knowledge   | 92/100       | 88/100           | 90/100              | gpt-5.5        |
| coding      | 78/100       | 82/100           | 75/100              | claude-4       |
| math        | 88/100       | 85/100           | 91/100              | gemini-2.0     |
| instruction | 95/100       | 92/100           | 88/100              | gpt-5.5        |
| safety      | 82/100       | 86/100           | 79/100              | claude-4       |
+-------------+--------------+------------------+---------------------+----------------+
| AVG Score   | 86.7         | 87.2             | 84.2                | claude-4       |
| AVG Cost    | $0.0020      | $0.0028          | $0.0015             |                |
| AVG TTFT    | 118ms        | 105ms            | 130ms               |                |
| AVG Tok/s   | 46.1         | 42.8             | 50.3                |                |
+-------------+--------------+------------------+---------------------+----------------+
```

<img width="1481" height="685" alt="imagen" src="https://github.com/user-attachments/assets/0a57fa0e-a96d-421f-9f0e-305a8eddcbfd" />


### Column descriptions

| Column | Description |
|---|---|
| **Benchmark** | Name of the executed benchmark |
| **Score** | Model score on that benchmark (0-100). Varies by benchmark type: exact match, code tests, LLM-as-judge, etc. |
| **TTFT** | *Time To First Token*. Milliseconds from request sent to first response token received. Measured via streaming. |
| **Tok/s** | *Throughput*. Tokens generated per second throughout the response. |
| **Tokens** | Total tokens generated in the benchmark (sum of all questions). |
| **Cost** | Estimated cost in USD. Calculated as `(promptTokens × inputPrice + completionTokens × outputPrice) / 1_000_000`. Prices fetched from the AI Pricing Guru API. |
| **Winner** | (Multi-model only) Model with the highest Score on that benchmark. |
| **AVG** | Average of all metrics for the model. |

## Variables de entorno

Each provider requires an API key:

| Variable | Proveedor |
|---|---|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) |
| `GEMINI_API_KEY` | Google (Gemini) |

## CLI options

```
Usage: node index.js <provider:model> [provider:model...] [options]

Arguments:
  provider:model        Model in provider:name format (e.g. openai:gpt-4o)

Options:
  -a, --all             Run all benchmarks
  -b, --benchmark-type  Benchmark type to run (name or category)
      --json <file>     Export results to JSON
      --csv <file>      Export results to CSV
  -v, --verbose         Verbose mode
```

## Benchmarks incluidos

| Benchmark | Category | Description |
|---|---|---|
| `reasoning` | reasoning | Logic and deduction problems |
| `knowledge` | knowledge | General knowledge questions |
| `coding` | programming | Code generation with tests |
| `math` | mathematics | Math problems |
| `instruction` | instructions | Instruction following |
| `safety` | safety | Malicious prompt detection |

## Adding a benchmark

Create a file in `src/benchmarks/` that exports `name`, `category`, `description`, and a `run` function:

```ts
// src/benchmarks/my-benchmark.ts
import type { ProviderAdapter, BenchmarkResult } from '../types/index.js';

export const name = 'my-benchmark';
export const category = 'custom';
export const description = 'My custom benchmark';

export async function run(provider: ProviderAdapter, model: string): Promise<BenchmarkResult> {
  const response = await provider.run(model, 'Write a poem');
  return {
    score: response.text.includes('poem') ? 100 : 0,
    ttft: response.ttft,
    throughput: response.throughput,
    tokens: response.tokens,
    cost: 0,
  };
}
```

It is loaded automatically at runtime.

## Adding a provider

Create a file in `src/providers/` that exports a `ProviderAdapter`, then register it in `src/providers/index.ts`:

```ts
// src/providers/my-provider.ts
import type { ProviderAdapter, ProviderRunResult } from '../types/index.js';

async function run(model: string, prompt: string): Promise<ProviderRunResult> {
  // Implement streaming API call
  const { text, ttft, tokens, throughput } = await myStreaming(model, prompt);
  return { text, ttft, tokens, throughput, promptTokens: 0, completionTokens: tokens };
}

export const provider: ProviderAdapter = { run };
```

## Adding a pricing source

Create a class extending `PricingSource` in `src/pricing/`, then add it to the `SOURCES` array in `src/pricing/registry.ts`:

```ts
// src/pricing/my-source.ts
import { PricingSource } from './source.js';

export class MySource extends PricingSource {
  get name() { return 'My Source'; }
  async fetchPricing() { /* implement */ }
}
```

`CacheWrapper` automatically adds disk caching to any source.

## Pricing

Prices are fetched from [AI Pricing Guru](https://www.aipricing.guru/) (free public API, 112+ models, daily updates). Results are cached in `.pricing-cache.json` for 24 hours. If the API is unavailable, a hardcoded pricing table is used as fallback.

```
src/pricing/
├── index.ts           ← Public API
├── source.ts          ← Abstract base class (Strategy)
├── ai-pricing-guru.ts ← Remote source
├── hardcoded.ts       ← Local fallback
├── cache-wrapper.ts   ← Cache decorator
└── registry.ts        ← Registry and selection
```
