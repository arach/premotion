import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ProviderConfig {
  format: 'anthropic' | 'openai';
  baseUrl: string;
  apiKey: string;
  model: string;
  name: string;
}

const CONFIG_PATH = join(process.cwd(), '.data', 'provider.json');

const DEFAULTS: ProviderConfig = {
  format: 'anthropic',
  baseUrl: '',
  apiKey: '',
  model: '',
  name: '',
};

export function readProviderConfig(): ProviderConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    // Fall back to env vars (backwards compatible with .env.local setup)
    const baseUrl = process.env.ANTHROPIC_BASE_URL ?? '';
    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    const model = process.env.LLM_MODEL ?? '';
    if (apiKey) {
      return {
        format: 'anthropic',
        baseUrl,
        apiKey,
        model,
        name: baseUrl.includes('minimax') ? 'MiniMax' : baseUrl.includes('anthropic.com') ? 'Anthropic' : 'Custom',
      };
    }
    return DEFAULTS;
  }
}

export function writeProviderConfig(config: ProviderConfig): void {
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function isProviderConfigured(): boolean {
  const config = readProviderConfig();
  return !!config.apiKey && !!config.model;
}

export function redactConfig(config: ProviderConfig): ProviderConfig & { hasKey: boolean } {
  return {
    ...config,
    apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}…${config.apiKey.slice(-4)}` : '',
    hasKey: !!config.apiKey,
  };
}
