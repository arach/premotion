import { getDb, insertJob, findActiveJob, findByIdempotencyKey, getJob } from './db';
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

function isValidCompositionId(compositionId: string): boolean {
  return /^[A-Za-z0-9\-\u4E00-\u9FFF]+$/u.test(compositionId);
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

  if (!isValidCompositionId(compositionId)) {
    return {
      error: 'compositionId can only contain letters, numbers, CJK characters, and hyphens',
      status: 400,
    };
  }

  if (!prompt) {
    return { error: 'prompt is required', status: 400 };
  }

  const validKinds = ['generate', 'revise', 'revise-brief', 'revise-render', 'prepare', 'render'];
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

export async function retryJob(originalJobId: string) {
  ensureJobsRuntime();

  const original = getJob(originalJobId);
  if (!original) {
    return { error: 'job_not_found', status: 404 };
  }
  if (original.status !== 'failed') {
    return { error: `cannot retry job in status "${original.status}"`, status: 400 };
  }

  const active = findActiveJob(original.compositionId, original.kind);
  if (active) {
    return { data: jobToCreateResponse(active), status: 200 };
  }

  const jobId = generateJobId();
  const record = insertJob({
    jobId,
    compositionId: original.compositionId,
    kind: original.kind,
    prompt: original.prompt,
    inputs: original.inputs,
    params: original.params,
    idempotencyKey: null,
  });

  return { data: jobToCreateResponse(record), status: 201 };
}
