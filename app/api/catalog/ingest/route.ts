import { NextResponse } from 'next/server';
import { join, basename } from 'node:path';
import { copyFile, writeFile, stat, mkdir } from 'node:fs/promises';

const INBOX = join(process.cwd(), 'public', 'inbox');

export async function POST(req: Request) {
  await mkdir(INBOX, { recursive: true });

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

  const dest = join(INBOX, filename);
  try {
    await stat(dest);
    return NextResponse.json({ error: `${filename} already in inbox` }, { status: 409 });
  } catch {}

  if (sourcePath) {
    await copyFile(sourcePath, dest);
  } else {
    await writeFile(dest, await getBytes!());
  }

  const info = await stat(dest);
  return NextResponse.json({
    ok: true,
    filename,
    sizeMB: Math.round((info.size / (1024 * 1024)) * 100) / 100,
  });
}
