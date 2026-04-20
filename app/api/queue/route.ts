import { NextResponse } from 'next/server';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const QUEUE_DIR = join(process.cwd(), '.queue');

export async function POST(req: Request) {
  const body = await req.json();
  const { name, sources, prompt, createdAt } = body;

  if (!sources?.length || !prompt) {
    return NextResponse.json({ error: 'Missing sources or prompt' }, { status: 400 });
  }

  await mkdir(QUEUE_DIR, { recursive: true });

  const id = name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : `project-${Date.now()}`;

  const manifest = {
    id,
    name: name || id,
    sources,
    prompt,
    status: 'queued',
    createdAt: createdAt || new Date().toISOString(),
  };

  await writeFile(join(QUEUE_DIR, `${id}.json`), JSON.stringify(manifest, null, 2));

  return NextResponse.json({ id, status: 'queued' });
}

export async function GET() {
  await mkdir(QUEUE_DIR, { recursive: true });
  const files = await readdir(QUEUE_DIR);
  const jobs = await Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(async f => {
        const content = await import('node:fs/promises').then(fs => fs.readFile(join(QUEUE_DIR, f), 'utf-8'));
        return JSON.parse(content);
      })
  );
  jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ jobs });
}
