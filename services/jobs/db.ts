import Database from 'better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { JobRecord, JobStatus, JobKind } from './types';

const DB_PATH = join(process.cwd(), '.data/jobs.sqlite');

let db: InstanceType<typeof Database>;

export function getDb() {
  if (!db) {
    mkdirSync(join(process.cwd(), '.data'), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    migrate();
  }
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      job_id TEXT PRIMARY KEY,
      composition_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      prompt TEXT NOT NULL,
      inputs_json TEXT,
      params_json TEXT,
      agent_state TEXT,
      progress INTEGER,
      last_message TEXT,
      heartbeat_at TEXT,
      result_json TEXT,
      error_json TEXT,
      idempotency_key TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_composition ON jobs(composition_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_comp_kind_status ON jobs(composition_id, kind, status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_updated ON jobs(updated_at)`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL`);
}

export function insertJob(record: {
  jobId: string;
  compositionId: string;
  kind: JobKind;
  prompt: string;
  inputs: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  idempotencyKey: string | null;
}): JobRecord {
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO jobs (job_id, composition_id, kind, status, prompt, inputs_json, params_json, idempotency_key, created_at, updated_at)
     VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`
  ).run(
    record.jobId,
    record.compositionId,
    record.kind,
    record.prompt,
    record.inputs ? JSON.stringify(record.inputs) : null,
    record.params ? JSON.stringify(record.params) : null,
    record.idempotencyKey,
    now,
    now,
  );
  return getJob(record.jobId)!;
}

export function getJob(jobId: string): JobRecord | null {
  const row = getDb().prepare('SELECT * FROM jobs WHERE job_id = ?').get(jobId) as any;
  return row ? rowToRecord(row) : null;
}

export function getJobForComposition(compositionId: string, jobId: string): JobRecord | null {
  const row = getDb().prepare('SELECT * FROM jobs WHERE job_id = ? AND composition_id = ?').get(jobId, compositionId) as any;
  return row ? rowToRecord(row) : null;
}

export function getAllJobs(): JobRecord[] {
  const rows = getDb().prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as any[];
  return rows.map(rowToRecord);
}

export function getJobsForComposition(compositionId: string): JobRecord[] {
  const rows = getDb().prepare('SELECT * FROM jobs WHERE composition_id = ? ORDER BY created_at DESC').all(compositionId) as any[];
  return rows.map(rowToRecord);
}

export function findActiveJob(compositionId: string, kind: JobKind): JobRecord | null {
  const row = getDb().prepare(
    `SELECT * FROM jobs WHERE composition_id = ? AND kind = ? AND status IN ('queued', 'running') LIMIT 1`
  ).get(compositionId, kind) as any;
  return row ? rowToRecord(row) : null;
}

export function findByIdempotencyKey(key: string): JobRecord | null {
  const row = getDb().prepare('SELECT * FROM jobs WHERE idempotency_key = ?').get(key) as any;
  return row ? rowToRecord(row) : null;
}

export function updateJobStatus(jobId: string, status: JobStatus) {
  const now = new Date().toISOString();
  getDb().prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE job_id = ?').run(status, now, jobId);
}

export function updateJobAgent(jobId: string, fields: {
  agentState?: string;
  progress?: number;
  lastMessage?: string;
  heartbeatAt?: string;
}) {
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const vals: any[] = [now];

  if (fields.agentState !== undefined) { sets.push('agent_state = ?'); vals.push(fields.agentState); }
  if (fields.progress !== undefined) { sets.push('progress = ?'); vals.push(fields.progress); }
  if (fields.lastMessage !== undefined) { sets.push('last_message = ?'); vals.push(fields.lastMessage); }
  if (fields.heartbeatAt !== undefined) { sets.push('heartbeat_at = ?'); vals.push(fields.heartbeatAt); }

  vals.push(jobId);
  getDb().prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE job_id = ?`).run(...vals);
}

export function completeJob(jobId: string, result: Record<string, unknown>) {
  const now = new Date().toISOString();
  getDb().prepare(
    'UPDATE jobs SET status = ?, progress = 100, result_json = ?, updated_at = ? WHERE job_id = ?'
  ).run('completed', JSON.stringify(result), now, jobId);
}

export function failJob(jobId: string, error: { message: string }) {
  const now = new Date().toISOString();
  getDb().prepare(
    'UPDATE jobs SET status = ?, error_json = ?, updated_at = ? WHERE job_id = ?'
  ).run('failed', JSON.stringify(error), now, jobId);
}

function rowToRecord(row: any): JobRecord {
  return {
    jobId: row.job_id,
    compositionId: row.composition_id,
    kind: row.kind,
    status: row.status,
    prompt: row.prompt,
    inputs: row.inputs_json ? JSON.parse(row.inputs_json) : null,
    params: row.params_json ? JSON.parse(row.params_json) : null,
    agentState: row.agent_state,
    progress: row.progress,
    lastMessage: row.last_message,
    heartbeatAt: row.heartbeat_at,
    result: row.result_json ? JSON.parse(row.result_json) : null,
    error: row.error_json ? JSON.parse(row.error_json) : null,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
