import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { readProviderConfig } from './provider';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface IdeateResult {
  title: string;
  genre: string;
  mood: string;
  bpm: string;
  instruments: string;
  musicPrompt: string;
  lyrics: string;
}

// ---------------------------------------------------------------------------
// Task registry — add tasks here, no new routes needed
// ---------------------------------------------------------------------------

export interface TaskDef {
  system: string;
  maxTokens?: number;
  jsonOutput?: boolean;
}

export const TASKS: Record<string, TaskDef> = {
  'music-ideate': {
    system: `You are a music creative director. Given a rough vibe, concept, or reference, generate a detailed brief for an AI music generator.

Respond with valid JSON only, no markdown fences:
{
  "title": "concise track name",
  "genre": "genre + subgenre",
  "mood": "mood and energy description",
  "bpm": "BPM range e.g. 90–100",
  "instruments": "comma-separated key instruments",
  "musicPrompt": "2–3 sentence detailed prompt for the music generator — cover genre, instrumentation, tempo, dynamics, and arc",
  "lyrics": "complete song lyrics using [Intro] [Verse 1] [Chorus] [Verse 2] [Bridge] [Outro] section tags"
}`,
    maxTokens: 2048,
    jsonOutput: true,
  },

  'beat-ideas': {
    system: `You are a music producer. Given a brief, return 3 distinct beat concepts as a JSON array.

Respond with valid JSON only:
[
  { "name": "concept name", "genre": "genre", "bpm": number, "key": "key + scale", "vibe": "one-line description", "instruments": ["list"] }
]`,
    maxTokens: 1024,
    jsonOutput: true,
  },

  'lyrics-from-prompt': {
    system: `You are a lyricist. Write a complete song with [Intro] [Verse 1] [Chorus] [Verse 2] [Bridge] [Outro] sections.

Respond with valid JSON only:
{ "title": "song title", "style_tags": "genre/style tags", "lyrics": "full lyrics with section tags" }`,
    maxTokens: 2048,
    jsonOutput: true,
  },
};

// ---------------------------------------------------------------------------
// LLM dispatch
// ---------------------------------------------------------------------------

export async function callInference(
  providerHint: string,
  task: TaskDef,
  userPrompt: string,
  context?: string,
): Promise<unknown> {
  const config = readProviderConfig();
  if (!config.apiKey || !config.model) {
    throw new Error('LLM provider not configured. Set it up in Settings.');
  }

  const systemPrompt = context
    ? `${task.system}\n\nAdditional context:\n${context}`
    : task.system;

  // 'auto' or anything unrecognized falls through to the configured format
  const format =
    providerHint === 'anthropic' ? 'anthropic'
    : providerHint === 'openai' ? 'openai'
    : config.format;

  if (format === 'anthropic') {
    const client = new Anthropic({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });
    const msg = await client.messages.create({
      model: config.model,
      max_tokens: task.maxTokens ?? 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    if (task.jsonOutput) {
      const match = text.match(/[\[{][\s\S]*[\]}]/);
      return JSON.parse(match ? match[0] : text);
    }
    return { text };
  } else {
    const client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(task.jsonOutput ? { response_format: { type: 'json_object' as const } } : {}),
    });
    const content = completion.choices[0].message.content ?? '{}';
    if (task.jsonOutput) return JSON.parse(content);
    return { text: content };
  }
}
