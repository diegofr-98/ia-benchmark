import type { ModelPricing } from '../types/index.js';
import { PricingSource } from './source.js';

const PRICING: Record<string, Record<string, ModelPricing>> = {
  openai: {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    o1: { input: 15.0, output: 60.0 },
    'o1-mini': { input: 3.0, output: 12.0 },
    'gpt-5.5': { input: 5.0, output: 30.0 },
    'gpt-5': { input: 1.25, output: 10.0 },
    'gpt-5-mini': { input: 0.25, output: 2.0 },
    'gpt-5-nano': { input: 0.05, output: 0.4 },
    o3: { input: 2.0, output: 8.0 },
    'o3-mini': { input: 1.1, output: 4.4 },
    'o4-mini': { input: 1.1, output: 4.4 },
    'gpt-4.1': { input: 2.0, output: 8.0 },
    'gpt-4.1-mini': { input: 0.4, output: 1.6 },
    'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  },
  anthropic: {
    'claude-3-opus': { input: 15.0, output: 75.0 },
    'claude-3-sonnet': { input: 3.0, output: 15.0 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
    'claude-3.5-haiku': { input: 0.8, output: 4.0 },
    'claude-4': { input: 15.0, output: 75.0 },
    'claude-4-sonnet': { input: 3.0, output: 15.0 },
    'claude-opus-4': { input: 15.0, output: 75.0 },
    'claude-opus-4.5': { input: 5.0, output: 25.0 },
    'claude-opus-4.6': { input: 5.0, output: 25.0 },
    'claude-opus-4.7': { input: 5.0, output: 25.0 },
    'claude-opus-4.8': { input: 5.0, output: 25.0 },
    'claude-sonnet-4': { input: 3.0, output: 15.0 },
    'claude-sonnet-4.5': { input: 3.0, output: 15.0 },
    'claude-sonnet-4.6': { input: 3.0, output: 15.0 },
    'claude-haiku-4.5': { input: 1.0, output: 5.0 },
  },
  google: {
    'gemini-1.5-pro': { input: 3.5, output: 10.5 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
    'gemini-2.0-pro': { input: 3.5, output: 10.5 },
    'gemini-2.0-flash': { input: 0.1, output: 0.4 },
    'gemini-2.0-flash-lite': { input: 0.075, output: 0.3 },
    'gemini-2.5-pro': { input: 1.25, output: 10.0 },
    'gemini-2.5-flash': { input: 0.3, output: 2.5 },
    'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
    'gemini-3-pro': { input: 2.0, output: 12.0 },
    'gemini-3-flash': { input: 0.5, output: 3.0 },
    'gemini-3.5-flash': { input: 1.5, output: 9.0 },
  },
};

export class HardcodedSource extends PricingSource {
  override get name(): string {
    return 'Hardcoded fallback';
  }

  override async fetchPricing() {
    const map: Record<string, { input: number; output: number }> = {};
    for (const [provider, models] of Object.entries(PRICING)) {
      for (const [modelId, pricing] of Object.entries(models)) {
        const key = `${provider}:${this.normalizeModelId(modelId)}`;
        map[key] = { input: pricing.input, output: pricing.output };
      }
    }

    return {
      map,
      lastUpdated: new Date().toISOString(),
    };
  }
}
