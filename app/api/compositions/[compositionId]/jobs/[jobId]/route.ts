import { NextResponse } from 'next/server';
import { getJobForComposition } from '@/services/jobs/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ compositionId: string; jobId: string }> },
) {
  const { compositionId, jobId } = await params;
  const job = getJobForComposition(compositionId, jobId);
  if (!job) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(job);
}
