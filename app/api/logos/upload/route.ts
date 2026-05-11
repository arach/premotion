import { NextResponse } from 'next/server';
import { join } from 'node:path';
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PUBLIC = join(process.cwd(), 'public');
const LOGOS_INBOX = join(PUBLIC, 'inbox', 'logos');
const LOGOS_COMPS = join(process.cwd(), '.compositions', 'logos');

async function rebuildCatalog() {
  try {
    await execFileAsync('bun', ['run', 'scripts/build-catalog.ts'], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
  } catch (err) {
    console.warn('[logos] catalog rebuild failed:', err);
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'logo';
}

function newLogoId(seed: string | null): string {
  const stamp = Date.now().toString(36);
  const base = seed ? slugify(seed) : 'logo';
  return `lg-${base}-${stamp}`;
}

interface UploadResult {
  id: string;
  source: { kind: 'svg' | 'png' | 'prompt-only'; path?: string; prompt?: string };
  title?: string;
  existing?: boolean;
}

export async function POST(req: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  await mkdir(LOGOS_INBOX, { recursive: true });

  const contentType = req.headers.get('content-type') ?? '';

  // ── Prompt-only mode: JSON body { prompt, title? } ──
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const id = newLogoId(title ?? prompt.slice(0, 24));
    const sidecarDir = join(LOGOS_COMPS, id);
    await mkdir(sidecarDir, { recursive: true });
    await writeFile(
      join(sidecarDir, 'sidecar.json'),
      JSON.stringify({ prompt, lastPrompt: prompt, title }, null, 2),
    );
    await rebuildCatalog();
    return NextResponse.json({
      id,
      source: { kind: 'prompt-only', prompt },
      title,
    });
  }

  // ── File mode: multipart/form-data with `file` + optional `prompt`/`title` ──
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (ext !== 'svg' && ext !== 'png') {
    return NextResponse.json({ error: 'Only SVG and PNG are accepted' }, { status: 400 });
  }

  const promptField = form.get('prompt');
  const titleField = form.get('title');
  const prompt = typeof promptField === 'string' ? promptField.trim() : undefined;
  const title = typeof titleField === 'string' ? titleField.trim() || undefined : undefined;

  const id = newLogoId(file.name);
  const destPath = join(LOGOS_INBOX, `${id}.${ext}`);
  try {
    await stat(destPath);
    return NextResponse.json({
      id,
      source: { kind: ext as 'svg' | 'png', path: `/inbox/logos/${id}.${ext}` },
      title,
      existing: true,
    });
  } catch {
    // expected — new upload
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(destPath, bytes);

  if (prompt || title) {
    const sidecarDir = join(LOGOS_COMPS, id);
    await mkdir(sidecarDir, { recursive: true });
    await writeFile(
      join(sidecarDir, 'sidecar.json'),
      JSON.stringify({ prompt, lastPrompt: prompt, title }, null, 2),
    );
  }

  await rebuildCatalog();
  return NextResponse.json({
    id,
    source: { kind: ext as 'svg' | 'png', path: `/inbox/logos/${id}.${ext}` },
    title,
  });
}
