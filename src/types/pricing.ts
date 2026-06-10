export interface ModelPricing {
  input: number;
  output: number;
}

export interface PricingResult {
  map: Record<string, ModelPricing>;
  lastUpdated?: string;
  raw?: unknown;
}
