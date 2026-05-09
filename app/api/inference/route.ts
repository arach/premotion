import { NextResponse } from 'next/server';
import { callInference, TASKS, type TaskDef } from '@/lib/inference';

export const runtime = 'nodejs';

interface InferenceRequest {
  // Named task from the registry, or supply system + jsonOutput inline
  task?: string;
  system?: string;
  jsonOutput?: boolean;
  maxTokens?: number;
  // Provider: 'anthropic' | 'openai' | 'auto' (default: 'auto')
  provider?: string;
  prompt: string;
  context?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as InferenceRequest;

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    let task: TaskDef;

    if (body.task) {
      const registered = TASKS[body.task];
      if (!registered) {
        return NextResponse.json(
          { error: `Unknown task "${body.task}". Available: ${Object.keys(TASKS).join(', ')}` },
          { status: 400 },
        );
      }
      task = registered;
    } else if (body.system) {
      task = {
        system: body.system,
        maxTokens: body.maxTokens,
        jsonOutput: body.jsonOutput ?? false,
      };
    } else {
      return NextResponse.json(
        { error: 'Either task or system is required' },
        { status: 400 },
      );
    }

    const result = await callInference(
      body.provider ?? 'auto',
      task,
      body.prompt.trim(),
      body.context,
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
