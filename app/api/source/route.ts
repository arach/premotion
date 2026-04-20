import { NextResponse } from 'next/server';
import { join, relative } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const ROOT = process.cwd();
const ALLOWED_DIRS = ['src', 'lib', 'catalog'];

function validatePath(filePath: string): { resolved: string; rel: string } | NextResponse {
  const resolved = join(ROOT, filePath);
  const rel = relative(ROOT, resolved);
  if (rel.startsWith('..') || rel.startsWith('/')) {
    return NextResponse.json({ error: 'Path traversal' }, { status: 403 });
  }
  const allowed = ALLOWED_DIRS.some(d => rel.startsWith(d + '/') || rel === d);
  if (!allowed) {
    return NextResponse.json({ error: 'Path not in allowed directories' }, { status: 403 });
  }
  return { resolved, rel };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const filePath = url.searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'Missing path param' }, { status: 400 });

  const result = validatePath(filePath);
  if (result instanceof NextResponse) return result;

  try {
    const content = await readFile(result.resolved, 'utf-8');
    return NextResponse.json({ path: result.rel, content });
  } catch {
    return NextResponse.json({ error: `Not found: ${result.rel}` }, { status: 404 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { path: filePath, content } = body;
  if (!filePath || typeof content !== 'string') {
    return NextResponse.json({ error: 'Missing path or content' }, { status: 400 });
  }

  const result = validatePath(filePath);
  if (result instanceof NextResponse) return result;

  try {
    await writeFile(result.resolved, content, 'utf-8');
    return NextResponse.json({ path: result.rel, saved: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
