export type JobKind = 'generate' | 'prepare' | 'render';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export interface CreateJobRequest {
  kind: JobKind;
  prompt: string;
  inputs?: {
    clips?: string[];
    audio?: string[];
    [key: string]: unknown;
  };
  params?: {
    aspectRatio?: string;
    durationSec?: number;
    [key: string]: unknown;
  };
  idempotencyKey?: string;
}

export interface JobRecord {
  jobId: string;
  compositionId: string;
  kind: JobKind;
  status: JobStatus;
  prompt: string;
  inputs: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  agentState: string | null;
  progress: number | null;
  lastMessage: string | null;
  heartbeatAt: string | null;
  result: JobResult | null;
  error: JobError | null;
  activity: ActivityEntry[];
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobResult {
  outputUrls: string[];
  metadata?: Record<string, unknown>;
}

export interface JobError {
  message: string;
}

export interface ActivityEntry {
  stage: string;
  message: string;
  detail?: string;
  timestamp: string;
}

export interface CreateJobResponse {
  compositionId: string;
  jobId: string;
  kind: JobKind;
  status: JobStatus;
  createdAt: string;
}
