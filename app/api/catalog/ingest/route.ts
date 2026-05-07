import { NextResponse } from 'next/server';
import { join, basename } from 'node:path';
import { copyFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEMOS = join(process.cwd(), 'public', 'demos');

async function rebuildCatalog() {
  try {
    await execFileAsync('bun', ['run', 'scripts/build-catalog.ts'], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
  } catch (err) {
    console.warn('[catalog] Rebuild after ingest failed:', err);
  }
}

export async function POST(req: Request) {
  await mkdir(DEMOS, { recursive: true });

  const contentType = req.headers.get('content-type') ?? '';

  let filename: string;
  let getBytes: (() => Promise<Uint8Array>) | null = null;
  let sourcePath: string | null = null;

  if (contentType.includes('application/json')) {
    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    try { await stat(path); } catch {
      return NextResponse.json({ error: `Not found: ${path}` }, { status: 404 });
    }
    filename = basename(path);
    sourcePath = path;
  } else {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    filename = file.name;
    getBytes = async () => new Uint8Array(await file.arrayBuffer());
  }

  const dest = join(DEMOS, filename);
  try {
    await stat(dest);
    return NextResponse.json({
      ok: true,
      filename,
      path: `demos/${filename}`,
      existing: true,
    });
  } catch {
    // File does not exist yet.
  }

  if (sourcePath) {
    await copyFile(sourcePath, dest);
  } else {
    await writeFile(dest, await getBytes!());
  }

  const info = await stat(dest);
  await rebuildCatalog();

  return NextResponse.json({
    ok: true,
    filename,
    path: `demos/${filename}`,
    sizeMB: Math.round((info.size / (1024 * 1024)) * 100) / 100,
  });
}
