import { NextResponse } from 'next/server';
import { unlink } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

const PUBLIC = join(process.cwd(), 'public');
const OUT = join(process.cwd(), 'out');

const ALLOWED_ROOTS = [PUBLIC, OUT];

export async function POST(req: Request) {
  const { videoUrl } = await req.json();
  if (!videoUrl || typeof videoUrl !== 'string') {
    return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
  }

  // videoUrl is relative — could be "demos/foo.mp4" (under public) or "../out/foo.mp4"
  let absPath: string;
  if (videoUrl.startsWith('../out/') || videoUrl.startsWith('out/')) {
    absPath = resolve(OUT, videoUrl.replace(/^(\.\.\/)?out\//, ''));
  } else {
    absPath = resolve(PUBLIC, videoUrl);
  }

  const allowed = ALLOWED_ROOTS.some(root => {
    const rel = relative(root, absPath);
    return !rel.startsWith('..') && !rel.startsWith('/');
  });

  if (!allowed) {
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
  }

  try {
    await unlink(absPath);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
