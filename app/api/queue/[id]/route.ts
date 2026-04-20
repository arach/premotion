import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const QUEUE_DIR = join(process.cwd(), '.queue');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const content = await readFile(join(QUEUE_DIR, `${id}.json`), 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
}
