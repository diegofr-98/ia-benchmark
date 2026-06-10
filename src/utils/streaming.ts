import { performance } from 'node:perf_hooks';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface StreamChunk {
  text: string;
}

type StreamGenerator = () => AsyncGenerator<StreamChunk>;

export interface StreamMeasurement {
  text: string;
  ttft: number;
  totalTime: number;
  tokens: number;
  throughput: number;
}

export async function measureStream(streamFn: StreamGenerator): Promise<StreamMeasurement> {
  const startTime = performance.now();
  let ttft: number | null = null;
  let fullText = '';
  let firstChunk = true;

  for await (const chunk of streamFn()) {
    if (firstChunk) {
      ttft = performance.now() - startTime;
      firstChunk = false;
    }
    if (chunk.text) {
      fullText += chunk.text;
    }
  }

  const totalTime = performance.now() - startTime;
  const tokens = estimateTokens(fullText);
  const throughput = totalTime > 0 ? tokens / (totalTime / 1000) : 0;

  return {
    text: fullText,
    ttft: Math.round(ttft ?? totalTime),
    totalTime: Math.round(totalTime),
    tokens,
    throughput: Math.round(throughput * 10) / 10,
  };
}
