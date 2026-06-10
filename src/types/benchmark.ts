export interface BenchmarkQuestion {
  prompt: string;
  answer?: string;
  rubric?: 'exact' | 'contains';
  test?: (code: string) => boolean;
  check?: (text: string) => boolean;
}

export interface BenchmarkResult {
  score: number;
  ttft: number;
  throughput: number;
  tokens: number;
  cost: number;
  details?: unknown[];
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface Benchmark {
  name: string;
  category: string;
  description: string;
  run: (provider: import('../types/provider').ProviderAdapter, model: string) => Promise<BenchmarkResult>;
}
