import type { ModelPricing } from '../types/index.js';
import { AIPricingGuruSource } from './ai-pricing-guru.js';
import { CacheWrapper } from './cache-wrapper.js';
import { HardcodedSource } from './hardcoded.js';

interface PricingSourceInstance {
  readonly name: string;
  readonly attribution: { text: string; url: string } | null;
  fetchPricing(): Promise<{ map: Record<string, ModelPricing>; lastUpdated?: string }>;
}

const SOURCES: PricingSourceInstance[] = [new CacheWrapper(new AIPricingGuruSource()), new HardcodedSource()];

let pricingMap: Record<string, ModelPricing> = {};
let lastUpdated: string | null = null;

export async function initPricing(): Promise<void> {
  for (const source of SOURCES) {
    try {
      const result = await source.fetchPricing();

      if (result && result.map && Object.keys(result.map).length > 0) {
        pricingMap = result.map;
        lastUpdated = result.lastUpdated ?? null;

        const srcName = source.name;
        const modelCount = Object.keys(pricingMap).length;
        console.log(`  Prices loaded: ${srcName} (${modelCount} models)`);

        if (result.lastUpdated) {
          console.log(`  Last updated: ${new Date(result.lastUpdated).toLocaleDateString()}`);
        }

        const attr = source.attribution;
        if (attr) {
          console.log(`  Source: ${attr.text} (${attr.url})`);
        }

        return;
      }
    } catch (err) {
      console.warn(`  ⚠ Source "${source.name}" failed: ${(err as Error).message}`);
    }
  }

  console.warn('  ⚠ Could not load pricing from any source.');
}

export function getPricingFromMap(provider: string, model: string): ModelPricing | null {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = model.toLowerCase().replace(/[\s_]+/g, '-');

  const exactKey = `${normalizedProvider}:${normalizedModel}`;
  if (pricingMap[exactKey]) return pricingMap[exactKey];

  const withoutProvider = normalizedModel.replace(/^(openai|anthropic|google)[:-]/, '');
  const altKey = `${normalizedProvider}:${withoutProvider}`;
  if (altKey !== exactKey && pricingMap[altKey]) return pricingMap[altKey];

  for (const [key, value] of Object.entries(pricingMap)) {
    if (
      key.startsWith(`${normalizedProvider}:`) &&
      key.includes(normalizedModel.replace(`${normalizedProvider}:`, ''))
    ) {
      return value;
    }
    if (key.startsWith(`${normalizedProvider}:`) && normalizedModel.includes(key.split(':')[1])) {
      return value;
    }
  }

  return null;
}
