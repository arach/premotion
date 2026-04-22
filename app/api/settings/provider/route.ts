import { NextResponse } from 'next/server';
import { readProviderConfig, writeProviderConfig, redactConfig } from '@/lib/provider';
import type { ProviderConfig } from '@/lib/provider';

export async function GET() {
  const config = readProviderConfig();
  return NextResponse.json(redactConfig(config));
}

export async function PUT(request: Request) {
  const body = await request.json() as Partial<ProviderConfig>;

  const current = readProviderConfig();

  const updated: ProviderConfig = {
    format: body.format ?? current.format,
    baseUrl: body.baseUrl ?? current.baseUrl,
    apiKey: body.apiKey !== undefined ? body.apiKey : current.apiKey,
    model: body.model ?? current.model,
    name: body.name ?? current.name,
  };

  if (!['anthropic', 'openai'].includes(updated.format)) {
    return NextResponse.json({ error: 'format must be "anthropic" or "openai"' }, { status: 400 });
  }

  writeProviderConfig(updated);
  return NextResponse.json(redactConfig(updated));
}
