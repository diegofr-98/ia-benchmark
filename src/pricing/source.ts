import type { ModelPricing, PricingResult } from '../types/index.js';

export abstract class PricingSource {
  abstract get name(): string;

  get attribution(): { text: string; url: string } | null {
    return null;
  }

  abstract fetchPricing(): Promise<PricingResult>;

  normalizeModelId(id: string): string {
    return id
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9.-]/g, '');
  }

  buildMap(
    models: { provider: string; id: string; pricing: { inputPerM: number; outputPerM: number } }[],
  ): Record<string, ModelPricing> {
    const map: Record<string, ModelPricing> = {};
    for (const m of models) {
      const key = `${m.provider}:${this.normalizeModelId(m.id)}`;
      map[key] = {
        input: m.pricing.inputPerM,
        output: m.pricing.outputPerM,
      };
    }
    return map;
  }
}
