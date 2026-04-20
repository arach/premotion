import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const QUEUE_DIR = join(process.cwd(), '.queue');

export async function POST(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const manifestPath = join(QUEUE_DIR, `${id}.json`);

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (manifest.status !== 'queued') {
    return NextResponse.json({ error: 'Job already processed' }, { status: 400 });
  }

  manifest.status = 'processing';
  manifest.startedAt = new Date().toISOString();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  // Kick off the agent asynchronously
  const agentPrompt = buildAgentPrompt(manifest);
  execAsync(`scout @premotion "${agentPrompt.replace(/"/g, '\\"')}"`)
    .then(async () => {
      manifest.status = 'done';
      manifest.completedAt = new Date().toISOString();
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    })
    .catch(async (err) => {
      manifest.status = 'failed';
      manifest.error = err.message;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    });

  return NextResponse.json({ id, status: 'processing' });
}

function buildAgentPrompt(manifest: any): string {
  const sources = manifest.sources.join(', ');
  return [
    `Process video project "${manifest.name}".`,
    `Source files: ${sources}`,
    `Instructions: ${manifest.prompt}`,
  ].join(' ');
}
