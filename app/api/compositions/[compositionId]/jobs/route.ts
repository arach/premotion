import { NextResponse } from 'next/server';
import { createJob, ensureJobsRuntime } from '@/services/jobs/init';
import { getJobsForComposition } from '@/services/jobs/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ compositionId: string }> },
) {
  const { compositionId } = await params;
  const body = await request.json();
  const result = await createJob(compositionId, body);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: result.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ compositionId: string }> },
) {
  const { compositionId } = await params;
  ensureJobsRuntime();
  const jobs = getJobsForComposition(compositionId);
  return NextResponse.json(jobs);
}
