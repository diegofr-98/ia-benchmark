import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PricingResult } from '../types/index.js';
import { PricingSource } from './source.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(__dirname, '../../.pricing-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheData extends PricingResult {
  _cachedAt: string;
}

export class CacheWrapper extends PricingSource {
  private source: PricingSource;

  constructor(source: PricingSource) {
    super();
    this.source = source;
  }

  get name(): string {
    return `${this.source.name} (cached)`;
  }

  get attribution(): { text: string; url: string } | null {
    return this.source.attribution;
  }

  async fetchPricing(): Promise<PricingResult> {
    const cached = await this.readCache();
    if (cached) return cached;

    try {
      const fresh = await this.source.fetchPricing();
      await this.writeCache(fresh);
      return fresh;
    } catch (err) {
      const stale = await this.readCache(true);
      if (stale) {
        console.warn(`  ⚠ ${this.source.name} unavailable. Using cache.`);
        return stale;
      }
      throw err;
    }
  }

  private async readCache(ignoreTTL = false): Promise<PricingResult | null> {
    try {
      if (!existsSync(CACHE_FILE)) return null;

      const raw = await readFile(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw) as CacheData;

      if (!ignoreTTL) {
        const cachedAt = new Date(data._cachedAt).getTime();
        if (Number.isNaN(cachedAt) || Date.now() - cachedAt > CACHE_TTL_MS) return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  private async writeCache(data: PricingResult): Promise<void> {
    try {
      const payload = {
        ...data,
        _cachedAt: new Date().toISOString(),
      };
      await writeFile(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      /* no critical */
    }
  }
}
