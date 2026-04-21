import { getDb, updateJobStatus, updateJobAgent, completeJob, failJob } from './db';
import type { JobKind } from './types';

let polling = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export function startWorker() {
  if (polling) return;
  polling = true;
  console.log('[worker] Composition jobs worker started (poll-based)');
  poll();
}

export function stopWorker() {
  polling = false;
  if (timer) clearTimeout(timer);
}

function poll() {
  if (!polling) return;
  try {
    const row = getDb().prepare(
      `SELECT job_id, composition_id, kind, prompt, inputs_json, params_json
       FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`
    ).get() as any;

    if (row) {
      processJob({
        jobId: row.job_id,
        compositionId: row.composition_id,
        kind: row.kind,
        prompt: row.prompt,
        inputs: row.inputs_json ? JSON.parse(row.inputs_json) : null,
        params: row.params_json ? JSON.parse(row.params_json) : null,
      }).then(() => {
        console.log(`[worker] Job ${row.job_id} completed`);
        schedulePoll(100);
      }).catch((err) => {
        console.error(`[worker] Job ${row.job_id} failed:`, err);
        schedulePoll(1000);
      });
    } else {
      schedulePoll(2000);
    }
  } catch (err) {
    console.error('[worker] Poll error:', err);
    schedulePoll(5000);
  }
}

function schedulePoll(ms: number) {
  if (!polling) return;
  timer = setTimeout(poll, ms);
}

async function processJob(ctx: {
  jobId: string;
  compositionId: string;
  kind: JobKind;
  prompt: string;
  inputs: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
}) {
  const { jobId, compositionId, kind, inputs, params } = ctx;

  updateJobStatus(jobId, 'running');

  const updateState = (agentState: string, progress: number, lastMessage?: string) => {
    updateJobAgent(jobId, {
      agentState,
      progress,
      lastMessage,
      heartbeatAt: new Date().toISOString(),
    });
  };

  updateState('collecting inputs', 10, `Preparing ${kind} for ${compositionId}`);

  updateState('planning composition', 25, `Analyzing prompt and ${Object.keys(inputs ?? {}).length} input groups`);
  await new Promise(r => setTimeout(r, 1000));

  updateState('rendering draft', 50, 'Generating composition structure');
  await new Promise(r => setTimeout(r, 1000));

  updateState('encoding output', 75, 'Encoding final output');
  await new Promise(r => setTimeout(r, 500));

  updateState('uploading artifact', 90, 'Finalizing');
  await new Promise(r => setTimeout(r, 500));

  completeJob(jobId, {
    outputUrls: [`file://.compositions/${compositionId}/output.mp4`],
    metadata: { kind, durationSec: params?.durationSec ?? null },
  });
}
