import { PricingSource } from './source.js';

const API_URL = 'https://www.aipricing.guru/api/pricing.json';

interface ApiModel {
  id: string;
  name: string;
  provider: string;
  pricing: {
    inputPerM: number;
    cachedInputPerM?: number;
    outputPerM: number;
  };
}

interface ApiResponse {
  lastUpdated?: string;
  updated?: string;
  models: ApiModel[];
}

export class AIPricingGuruSource extends PricingSource {
  override get name(): string {
    return 'AI Pricing Guru';
  }

  override get attribution() {
    return {
      text: 'AI Pricing Guru',
      url: 'https://www.aipricing.guru/pricing/',
    };
  }

  override async fetchPricing() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(API_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as ApiResponse;

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Unexpected response format');
      }

      return {
        map: this.buildMap(data.models),
        lastUpdated: data.lastUpdated ?? data.updated,
        raw: data,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
