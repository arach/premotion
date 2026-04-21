import { NextResponse } from 'next/server';
import { getAllJobs } from '@/services/jobs/db';
import { ensureJobsRuntime } from '@/services/jobs/init';

export async function GET() {
  ensureJobsRuntime();
  const jobs = getAllJobs();
  return NextResponse.json(jobs);
}
