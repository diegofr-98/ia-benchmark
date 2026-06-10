export interface ProviderStreamResult {
  text: string;
  ttft: number;
  totalTime: number;
  tokens: number;
  throughput: number;
}

export interface ProviderRunResult extends ProviderStreamResult {
  promptTokens: number;
  completionTokens: number;
}

export interface ProviderAdapter {
  run: (model: string, prompt: string) => Promise<ProviderRunResult>;
}
