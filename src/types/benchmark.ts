export interface BenchmarkQuestion {
  prompt: string;
  answer?: string;
  rubric?: 'exact' | 'contains';
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

export type BenchmarkProgressCallback = (event: {
  questionIndex: number;
  totalQuestions: number;
  correct: boolean;
  ttft: number;
  tokens: number;
  throughput: number;
  responseSnippet: string;
}) => void;

export interface Benchmark {
  name: string;
  category: string;
  description: string;
  run: (
    provider: import('../types/provider').ProviderAdapter,
    model: string,
    onProgress?: BenchmarkProgressCallback,
  ) => Promise<BenchmarkResult>;
}
