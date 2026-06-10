import type { ProviderAdapter } from '../types/index.js';

interface ProviderModule {
  provider: ProviderAdapter;
}

const registry: Record<string, () => Promise<ProviderModule>> = {
  openai: () => import('./openai.js'),
  anthropic: () => import('./anthropic.js'),
  google: () => import('./google.js'),
};

export function getProvider(name: string): ProviderAdapter {
  const loader = registry[name];
  if (!loader) {
    throw new Error(`Unsupported provider: ${name}. Supported: ${Object.keys(registry).join(', ')}`);
  }

  let mod: ProviderModule | null = null;

  const handler: ProviderAdapter = {
    run: async (model: string, prompt: string) => {
      if (!mod) {
        mod = await loader();
      }
      return mod.provider.run(model, prompt);
    },
  };

  return handler;
}

export function getSupportedProviders(): string[] {
  return Object.keys(registry);
}
