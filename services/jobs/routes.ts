import { Queue } from 'bunqueue/client';
import { join } from 'node:path';
import {
  insertJob,
  getJob,
  getAllJobs,
  getJobForComposition,
  getJobsForComposition,
  findActiveJob,
  findByIdempotencyKey,
} from './db';
import type { CreateJobRequest, JobRecord, CreateJobResponse } from './types';

const DATA_PATH = join(import.meta.dir, '../../.data/bunqueue.sqlite');
const queue = new Queue('composition-jobs', { embedded: true, dataPath: DATA_PATH });

function generateJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function jobToResponse(job: JobRecord) {
  return {
    compositionId: job.compositionId,
    jobId: job.jobId,
    kind: job.kind,
    status: job.status,
    prompt: job.prompt,
    inputs: job.inputs,
    params: job.params,
    agentState: job.agentState,
    progress: job.progress,
    lastMessage: job.lastMessage,
    heartbeatAt: job.heartbeatAt,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // POST /compositions/:compositionId/jobs
  const createMatch = path.match(/^\/compositions\/([^/]+)\/jobs\/?$/);
  if (createMatch && method === 'POST') {
    return createJob(createMatch[1], await req.json());
  }

  // GET /compositions/:compositionId/jobs
  if (createMatch && method === 'GET') {
    return listJobs(createMatch[1]);
  }

  // GET /compositions/:compositionId/jobs/:jobId
  const compJobMatch = path.match(/^\/compositions\/([^/]+)\/jobs\/([^/]+)\/?$/);
  if (compJobMatch && method === 'GET') {
    return getCompositionJob(compJobMatch[1], compJobMatch[2]);
  }

  // GET /jobs (list all)
  if (path === '/jobs' && method === 'GET') {
    return listAllJobs();
  }

  // GET /jobs/:jobId
  const jobMatch = path.match(/^\/jobs\/([^/]+)\/?$/);
  if (jobMatch && method === 'GET') {
    return getJobById(jobMatch[1]);
  }

  // Health
  if (path === '/health' && method === 'GET') {
    return json({ ok: true, service: 'composition-jobs' });
  }

  return json({ error: 'not_found' }, 404);
}

async function createJob(compositionId: string, body: CreateJobRequest): Promise<Response> {
  const { kind = 'generate', prompt, inputs, params, idempotencyKey } = body;

  if (!prompt) {
    return json({ error: 'prompt is required' }, 400);
  }

  const validKinds = ['generate', 'prepare', 'render'];
  if (!validKinds.includes(kind)) {
    return json({ error: `kind must be one of: ${validKinds.join(', ')}` }, 400);
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return json(jobToCreateResponse(existing), 200);
    }
  }

  // Dedup: at most one active job per compositionId + kind
  const active = findActiveJob(compositionId, kind as any);
  if (active) {
    return json(jobToCreateResponse(active), 200);
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

  // Enqueue for worker processing
  await queue.add(kind, {
    jobId,
    compositionId,
    kind,
    prompt,
    inputs: inputs ?? null,
    params: params ?? null,
  });

  return json(jobToCreateResponse(record), 201);
}

function listAllJobs(): Response {
  const jobs = getAllJobs();
  return json(jobs.map(jobToResponse));
}

function listJobs(compositionId: string): Response {
  const jobs = getJobsForComposition(compositionId);
  return json(jobs.map(jobToResponse));
}

function getCompositionJob(compositionId: string, jobId: string): Response {
  const job = getJobForComposition(compositionId, jobId);
  if (!job) return json({ error: 'not_found' }, 404);
  return json(jobToResponse(job));
}

function getJobById(jobId: string): Response {
  const job = getJob(jobId);
  if (!job) return json({ error: 'not_found' }, 404);
  return json(jobToResponse(job));
}

function jobToCreateResponse(job: JobRecord): CreateJobResponse {
  return {
    compositionId: job.compositionId,
    jobId: job.jobId,
    kind: job.kind,
    status: job.status,
    createdAt: job.createdAt,
  };
}
