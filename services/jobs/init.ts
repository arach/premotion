import { getDb, insertJob, findActiveJob, findByIdempotencyKey } from './db';
import { startWorker } from './worker';
import type { CreateJobRequest, JobRecord, CreateJobResponse } from './types';

let workerStarted = false;

export function ensureJobsRuntime() {
  getDb();
  if (!workerStarted) {
    startWorker();
    workerStarted = true;
  }
}

function generateJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function jobToCreateResponse(job: JobRecord): CreateJobResponse {
  return {
    compositionId: job.compositionId,
    jobId: job.jobId,
    kind: job.kind,
    status: job.status,
    createdAt: job.createdAt,
  };
}

export async function createJob(compositionId: string, body: CreateJobRequest) {
  ensureJobsRuntime();
  const { kind = 'generate', prompt, inputs, params, idempotencyKey } = body;

  if (!prompt) {
    return { error: 'prompt is required', status: 400 };
  }

  const validKinds = ['generate', 'revise', 'prepare', 'render'];
  if (!validKinds.includes(kind)) {
    return { error: `kind must be one of: ${validKinds.join(', ')}`, status: 400 };
  }

  if (idempotencyKey) {
    const existing = findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { data: jobToCreateResponse(existing), status: 200 };
    }
  }

  const active = findActiveJob(compositionId, kind as any);
  if (active) {
    return { data: jobToCreateResponse(active), status: 200 };
  }

  const jobId = generateJobId();
  const record = insertJob({
    jobId,
    compositionId,
    kind: kind as any,
    prompt,
    inputs: inputs ?? null,
    params: params ?? null,
    idempotencyKey: idempotencyKey ?? null,
  });

  return { data: jobToCreateResponse(record), status: 201 };
}
