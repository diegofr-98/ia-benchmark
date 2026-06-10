import type { ModelPricing } from '../types/index.js';
import { HardcodedSource } from './hardcoded.js';
import { getPricingFromMap, initPricing as initRegistry } from './registry.js';

const hardcodedFallback = new HardcodedSource();
let hardcodedMap: Record<string, ModelPricing> = {};

export async function initPricing(): Promise<void> {
  await initRegistry();

  const fb = await hardcodedFallback.fetchPricing();
  hardcodedMap = fb.map;
}

export function getPricing(provider: string, model: string): ModelPricing {
  const fromMap = getPricingFromMap(provider, model);
  if (fromMap) return fromMap;

  const normalizedModel = model.toLowerCase().replace(/[\s_]+/g, '-');
  const key = `${provider.toLowerCase()}:${normalizedModel}`;
  const fb = hardcodedMap[key];

  if (fb) return fb;

  return { input: 0, output: 0 };
}

export function calculateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
  const { input, output } = getPricing(provider, model);
  const inputCost = (promptTokens / 1_000_000) * input;
  const outputCost = (completionTokens / 1_000_000) * output;
  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.0000';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
