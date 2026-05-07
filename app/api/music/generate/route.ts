import { NextResponse } from 'next/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { readProviderConfig, type ProviderConfig } from '@/lib/provider';
import type { AudioAsset } from '@/lib/types';

export const runtime = 'nodejs';

interface MusicGenerateRequest {
  sourceAsset?: Partial<AudioAsset>;
  feedback?: string;
  prompt?: string;
  lyrics?: string;
  model?: string;
  instrumental?: boolean;
  generateLyrics?: boolean;
  lyricsMode?: 'write_full_song' | 'edit';
  lyricsPrompt?: string;
  lyricsResult?: Record<string, any>;
  title?: string;
}

function getMiniMaxApiKey(config: ProviderConfig): string {
  const looksLikeMiniMax =
    config.name.toLowerCase().includes('minimax') ||
    config.baseUrl.toLowerCase().includes('minimax') ||
    config.model.toLowerCase().includes('minimax');

  if (looksLikeMiniMax && config.apiKey) return config.apiKey;
  return process.env.MINIMAX_API_KEY ?? '';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'music';
}

function sanitizeMiniMaxResponse(data: any): Record<string, unknown> {
  const audioHex = data?.data?.audio;
  const clean = {
    ...data,
    data: {
      ...(data?.data ?? {}),
      audio: undefined,
      audioBytes: typeof audioHex === 'string' ? Math.floor(audioHex.length / 2) : undefined,
    },
  };
  return JSON.parse(JSON.stringify(clean));
}

async function generateLyrics(opts: {
  apiKey: string;
  mode: 'write_full_song' | 'edit';
  prompt: string;
  lyrics?: string;
  title?: string;
}): Promise<Record<string, any>> {
  const payload: Record<string, unknown> = {
    mode: opts.mode,
    prompt: opts.prompt.slice(0, 2000),
  };
  if (opts.mode === 'edit' && opts.lyrics?.trim()) {
    payload.lyrics = opts.lyrics.slice(0, 3500);
  }
  if (opts.title?.trim()) {
    payload.title = opts.title.trim();
  }

  const res = await fetch('https://api.minimax.io/v1/lyrics_generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json() as any;
  const statusCode = data?.base_resp?.status_code;
  if (!res.ok || statusCode !== 0) {
    const statusMsg = data?.base_resp?.status_msg || res.statusText;
    throw new Error(`MiniMax lyrics generation failed: ${statusMsg}`);
  }

  return {
    ...data,
    request: {
      ...payload,
      authorization: 'Bearer [redacted]',
    },
  };
}

function rebuildCatalog(): void {
  execSync('bun run scripts/build-catalog.ts', {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60 * 1000,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as MusicGenerateRequest;
    const source = body.sourceAsset ?? {};
    const feedback = body.feedback?.trim() ?? '';
    const model = body.model || source.model || 'music-2.6';
    const sourcePrompt = body.prompt || source.prompt || 'Product demo soundtrack';
    const prompt = [
      sourcePrompt,
      feedback ? `Revision feedback: ${feedback}` : '',
      feedback ? 'Create a revised version that addresses the feedback while preserving the useful musical identity of the source track.' : '',
    ].filter(Boolean).join('\n\n').slice(0, 2000);
    let lyrics = (body.lyrics ?? source.lyrics ?? '').slice(0, 3500);
    const instrumental = body.instrumental ?? source.instrumental ?? false;

    const providerConfig = readProviderConfig();
    const apiKey = getMiniMaxApiKey(providerConfig);
    if (!apiKey) {
      return NextResponse.json({ error: 'MiniMax API key is not configured' }, { status: 400 });
    }

    let lyricsGeneration = body.lyricsResult;
    if (!instrumental && body.generateLyrics) {
      const mode = body.lyricsMode || (lyrics.trim() ? 'edit' : 'write_full_song');
      const lyricsPrompt = (body.lyricsPrompt || [
        feedback ? `Revise the lyrics using this feedback: ${feedback}` : '',
        prompt,
      ].filter(Boolean).join('\n\n')).slice(0, 2000);
      lyricsGeneration = await generateLyrics({
        apiKey,
        mode,
        prompt: lyricsPrompt,
        lyrics,
        title: body.title || source.id,
      });
      if (typeof lyricsGeneration.lyrics === 'string') {
        lyrics = lyricsGeneration.lyrics.slice(0, 3500);
      }
    }

    const audioSetting = {
      sample_rate: 44100,
      bitrate: 256000,
      format: 'mp3',
    };
    const payload: Record<string, unknown> = {
      model,
      prompt,
      stream: false,
      output_format: 'hex',
      is_instrumental: instrumental,
      audio_setting: audioSetting,
    };

    if (!instrumental && lyrics.trim()) {
      payload.lyrics = lyrics;
    } else if (!instrumental) {
      payload.lyrics_optimizer = true;
    }

    const res = await fetch('https://api.minimax.io/v1/music_generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json() as any;
    const statusCode = data?.base_resp?.status_code;
    if (!res.ok || statusCode !== 0) {
      const statusMsg = data?.base_resp?.status_msg || res.statusText;
      return NextResponse.json({ error: `MiniMax music generation failed: ${statusMsg}`, result: sanitizeMiniMaxResponse(data) }, { status: 502 });
    }

    const audioHex = data?.data?.audio;
    if (!audioHex || typeof audioHex !== 'string') {
      return NextResponse.json({ error: 'MiniMax music generation returned no audio', result: sanitizeMiniMaxResponse(data) }, { status: 502 });
    }

    const baseId = slugify(source.compositionId || source.id || 'music');
    const trackId = `${baseId}-rev-${Date.now().toString(36)}`;
    const outputDir = join(process.cwd(), 'public', 'tracks', 'generated');
    mkdirSync(outputDir, { recursive: true });
    const audioPath = join(outputDir, `${trackId}.mp3`);
    const sidecarPath = join(outputDir, `${trackId}.json`);
    writeFileSync(audioPath, Buffer.from(audioHex, 'hex'));

    const sidecar = {
      id: trackId,
      generated: true,
      provider: 'MiniMax',
      model,
      parentTrackId: source.id,
      revisionOf: source.path,
      compositionId: source.compositionId,
      feedback,
      prompt,
      originalPrompt: source.prompt,
      lyrics,
      instrumental,
      songTitle: lyricsGeneration?.song_title,
      styleTags: lyricsGeneration?.style_tags,
      lyricsGeneration,
      createdAt: new Date().toISOString(),
      request: {
        ...payload,
        authorization: 'Bearer [redacted]',
      },
      result: sanitizeMiniMaxResponse(data),
    };
    writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));

    rebuildCatalog();

    return NextResponse.json({
      id: trackId,
      path: `tracks/generated/${trackId}.mp3`,
      sidecar,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
