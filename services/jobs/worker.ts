import { getDb, updateJobStatus, updateJobAgent, completeJob, failJob, appendActivity } from './db';
import type { JobKind } from './types';
import { readProviderConfig, type ProviderConfig } from '@/lib/provider';
import { analyzeVideo, createAnthropicVision, createMiniMaxMcpVision } from '../../scripts/lib/index';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { Buffer } from 'node:buffer';

// ── Types for the composition plan produced by the LLM ──────────

interface ClipPlan {
  /** Source file path (relative to public/) */
  src: string;
  /** Start time in the source file (seconds) */
  startFrom: number;
  /** Duration to use from this clip (seconds) */
  duration: number;
  /** Display label for this segment */
  label: string;
  /** Optional zoom/pan */
  zoom?: {
    scale: number;
    originX: number;
    originY: number;
    startAtSec: number;
  };
  /** 0-1 volume for this clip's native audio */
  videoVolume: number;
}

interface TextOverlayPlan {
  text: string;
  /** When this overlay appears (seconds from composition start) */
  startAt: number;
  /** How long it shows (seconds) */
  duration: number;
  position: 'center' | 'bottom-left' | 'bottom-center' | 'top-left' | 'top-center';
  style: 'title' | 'subtitle' | 'caption' | 'label';
}

interface AudioTrackPlan {
  /** Source file path (relative to public/) */
  src: string;
  /** Volume 0-1 */
  volume: number;
  /** When to start playing (seconds from composition start) */
  startAt: number;
  /** Fade in duration in seconds */
  fadeIn: number;
  /** Fade out duration in seconds */
  fadeOut: number;
  /** Whether this is background music vs. voiceover */
  role: 'music' | 'voiceover' | 'sfx';
}

interface SoundtrackRequest {
  enabled?: boolean;
  prompt?: string;
  lyrics?: string;
  lyricsResult?: Record<string, any>;
  instrumental?: boolean;
  showLyricCaptions?: boolean;
  model?: string;
  volume?: number;
  startAt?: number;
  fadeIn?: number;
  fadeOut?: number;
}

interface BrandPlan {
  name?: string;
  iconSrc?: string;
}

interface CompositionPlan {
  /** Human-readable title */
  title: string;
  /** Brief description of the edit */
  description: string;
  /** Output dimensions */
  width: number;
  height: number;
  /** Frames per second */
  fps: number;
  /** Total duration in seconds */
  durationSec: number;
  /** Intro style: 'tactical' | 'ascii' | 'glitch' | 'minimal' | 'none' */
  introStyle: string;
  /** Intro duration in seconds */
  introDurationSec: number;
  /** Outro duration in seconds */
  outroDurationSec: number;
  /** Transition between clips: 'fade' | 'slide' | 'cut' */
  transitionType: string;
  /** Transition duration in frames */
  transitionDurationFrames: number;
  /** Ordered list of clips on the timeline */
  clips: ClipPlan[];
  /** Text overlays */
  textOverlays: TextOverlayPlan[];
  /** Audio tracks (music, voiceover, sfx) */
  audioTracks: AudioTrackPlan[];
  /** Subtitle/tagline for intro/outro cards */
  subtitle: string;
  /** Tagline for outro */
  tagline: string;
  /** Optional brand identity for generated intro/outro cards */
  brand?: BrandPlan;
}

interface GeneratedSoundtrack {
  path: string;
  prompt: string;
  lyrics: string;
  model: string;
  volume: number;
}

interface InputAnalysisSummary {
  src: string;
  status: 'complete' | 'missing' | 'failed' | 'skipped';
  storyboardDir?: string;
  edlPath?: string;
  frameCount?: number;
  sceneCount?: number;
  durationSec?: number;
  activeTime?: number;
  idleTime?: number;
  transitionTime?: number;
  deadTimeCount?: number;
  error?: string;
  scenes?: Array<{
    start: number;
    end?: number;
    activity?: string;
    description: string;
    frameFile?: string;
    motionArea?: string;
    quadrants?: Record<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', number>;
  }>;
}

// ── LLM client ──────────────────────────────────────────────────

async function callLLM(opts: {
  system: string;
  userMessage: string;
  maxTokens: number;
}): Promise<{ text: string; inputTokens: number; outputTokens: number; model: string }> {
  const config = readProviderConfig();
  if (!config.apiKey) throw new Error('No API key configured — go to Settings to add a provider');
  if (!config.model) throw new Error('No model configured — go to Settings to choose a model');

  if (config.format === 'openai') {
    return callOpenAI(config, opts);
  }
  return callAnthropic(config, opts);
}

async function callAnthropic(
  config: ProviderConfig,
  opts: { system: string; userMessage: string; maxTokens: number },
) {
  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });
  const response = await client.messages.create({
    model: config.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: 'user', content: opts.userMessage }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
  return {
    text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    model: config.model,
  };
}

async function callOpenAI(
  config: ProviderConfig,
  opts: { system: string; userMessage: string; maxTokens: number },
) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
  });
  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: opts.maxTokens,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.userMessage },
    ],
  });
  return {
    text: response.choices[0]?.message?.content ?? '',
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    model: config.model,
  };
}

// ── Optional MiniMax Music soundtrack ───────────────────────────

const DEFAULT_SOUNDTRACK_PROMPT =
  'Japanese hip hop instrumental, modern Tokyo night drive, tight drums, warm bass, shamisen-inspired plucks, subtle cyber UI energy, confident product demo soundtrack';

const DEFAULT_SOUNDTRACK_LYRICS = `[Intro]
Mouse up, words wake

[Hook]
Te no naka de flow, click kara go
Kotoba ga hashiru, screen ni glow
Review, confirm, then enter the zone
Mouse dake de send, Lattices control`;

function getMiniMaxApiKey(config: ProviderConfig): string {
  const looksLikeMiniMax =
    config.name.toLowerCase().includes('minimax') ||
    config.baseUrl.toLowerCase().includes('minimax') ||
    config.model.toLowerCase().includes('minimax');

  if (looksLikeMiniMax && config.apiKey) return config.apiKey;
  return process.env.MINIMAX_API_KEY ?? '';
}

function normalizeSoundtrackRequest(params: Record<string, unknown> | null): SoundtrackRequest {
  const raw = params?.soundtrack;
  if (!raw || typeof raw !== 'object') return {};
  return raw as SoundtrackRequest;
}

function sanitizeMiniMaxResponse(data: any): Record<string, unknown> {
  const audioHex = data?.data?.audio;
  const clean = {
    ...data,
    data: {
      ...(data?.data ?? {}),
      audio: undefined,
      audioBytes: typeof audioHex === 'string' ? Math.floor(audioHex.length / 2) : undefined,
    },
  };
  return JSON.parse(JSON.stringify(clean));
}

async function generateMiniMaxSoundtrack(
  compositionId: string,
  request: SoundtrackRequest,
  providerConfig: ProviderConfig,
): Promise<GeneratedSoundtrack> {
  const apiKey = getMiniMaxApiKey(providerConfig);
  if (!apiKey) {
    throw new Error('MiniMax music requested, but no MiniMax API key is configured');
  }

  const model = request.model || 'music-2.6';
  const instrumental = request.instrumental ?? false;
  const prompt = (request.prompt || DEFAULT_SOUNDTRACK_PROMPT).slice(0, 2000);
  const lyrics = instrumental ? '' : (request.lyrics || DEFAULT_SOUNDTRACK_LYRICS).slice(0, 3500);

  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
    output_format: 'hex',
    is_instrumental: instrumental,
    audio_setting: {
      sample_rate: 44100,
      bitrate: 256000,
      format: 'mp3',
    },
  };

  if (!instrumental) {
    body.lyrics = lyrics;
  }

  const res = await fetch('https://api.minimax.io/v1/music_generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as any;
  const statusCode = data?.base_resp?.status_code;
  if (!res.ok || statusCode !== 0) {
    const statusMsg = data?.base_resp?.status_msg || res.statusText;
    throw new Error(`MiniMax music generation failed: ${statusMsg}`);
  }

  const audioHex = data?.data?.audio;
  if (!audioHex || typeof audioHex !== 'string') {
    throw new Error(`MiniMax music generation returned no audio`);
  }

  const outputDir = join(process.cwd(), 'public', 'tracks', 'generated');
  mkdirSync(outputDir, { recursive: true });
  const filename = `${compositionId}-${Date.now().toString(36)}.mp3`;
  const outputPath = join(outputDir, filename);
  writeFileSync(outputPath, Buffer.from(audioHex, 'hex'));
  writeFileSync(
    outputPath.replace(/\.[^.]+$/, '.json'),
    JSON.stringify({
      id: filename.replace(/\.[^.]+$/, ''),
      generated: true,
      provider: 'MiniMax',
      model,
      compositionId,
      prompt,
      lyrics,
      instrumental,
      songTitle: request.lyricsResult?.song_title,
      styleTags: request.lyricsResult?.style_tags,
      lyricsGeneration: request.lyricsResult,
      createdAt: new Date().toISOString(),
      request: {
        ...body,
        authorization: 'Bearer [redacted]',
      },
      result: sanitizeMiniMaxResponse(data),
    }, null, 2),
  );

  return {
    path: `tracks/generated/${filename}`,
    prompt,
    lyrics,
    model,
    volume: request.volume ?? 0.22,
  };
}

function lyricCaptionOverlays(lyrics: string, durationSec: number): TextOverlayPlan[] {
  const lines = lyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^\[[^\]]+\]$/i.test(line))
    .slice(0, 4);

  if (lines.length === 0) return [];

  const start = Math.max(4, Math.min(10, durationSec * 0.25));
  const spacing = Math.max(3, Math.min(5, (durationSec - start - 5) / Math.max(1, lines.length)));

  return lines.map((line, index) => ({
    text: line,
    startAt: start + index * spacing,
    duration: Math.min(3.2, spacing),
    position: index % 2 === 0 ? 'top-center' : 'bottom-center',
    style: 'caption',
  }));
}

// ── Input video analysis ───────────────────────────────────────

function sanitizeAnalysisId(inputPath: string): string {
  return basename(inputPath)
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '')
    .toLowerCase()
    .substring(0, 40);
}

function resolvePublicClip(src: string): string | null {
  const publicDir = resolve(process.cwd(), 'public');
  const normalized = src.replace(/^\/+/, '');
  const absPath = resolve(publicDir, normalized);
  if (absPath !== publicDir && !absPath.startsWith(`${publicDir}${sep}`)) return null;
  return absPath;
}

async function analyzeInputClip(src: string): Promise<InputAnalysisSummary> {
  const inputPath = resolvePublicClip(src);
  if (!inputPath || !existsSync(inputPath)) {
    return { src, status: 'missing', error: 'Source clip is not present under public/' };
  }

  const id = sanitizeAnalysisId(inputPath);
  const outDir = join(process.cwd(), 'public', 'demos', `storyboard-${id}`);
  const providerConfig = readProviderConfig();
  const canUseAnthropicVision =
    providerConfig.format === 'anthropic' &&
    !!providerConfig.apiKey &&
    !!providerConfig.model;
  const looksLikeMiniMax =
    providerConfig.name.toLowerCase().includes('minimax') ||
    providerConfig.baseUrl.toLowerCase().includes('minimax') ||
    providerConfig.model.toLowerCase().includes('minimax');
  const vision = canUseAnthropicVision
    ? looksLikeMiniMax
      ? createMiniMaxMcpVision({ apiKey: getMiniMaxApiKey(providerConfig) || providerConfig.apiKey })
      : createAnthropicVision({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseUrl,
      model: providerConfig.model,
      provider: providerConfig.name || 'Vision',
    })
    : undefined;
  let edl;
  try {
    edl = await analyzeVideo(inputPath, {
      outDir,
      skipVision: !vision,
      vision,
      analyzeAllFrames: !!vision,
    });
  } finally {
    await (vision as any)?.close?.();
  }

  return {
    src,
    status: 'complete',
    storyboardDir: edl.storyboardDir,
    edlPath: `public/demos/${edl.storyboardDir}/edl.json`,
    frameCount: edl.stats.totalSceneBreaks,
    sceneCount: edl.scenes.length,
    durationSec: edl.duration,
    activeTime: edl.stats.activeTime,
    idleTime: edl.stats.idleTime,
    transitionTime: edl.stats.transitionTime,
    deadTimeCount: edl.deadTime?.length ?? 0,
    scenes: edl.scenes.slice(0, 12).map((scene) => ({
      start: scene.start ?? 0,
      end: scene.end,
      activity: scene.activity,
      description: scene.description,
      frameFile: scene.frameFile,
      motionArea: scene.motionArea,
      quadrants: scene.quadrants,
    })),
  };
}

async function analyzeInputClips(clips: string[], jobId: string): Promise<InputAnalysisSummary[]> {
  const analyses: InputAnalysisSummary[] = [];

  for (const src of clips) {
    try {
      const result = await analyzeInputClip(src);
      analyses.push(result);

      if (result.status === 'complete') {
        appendActivity(jobId, {
          stage: 'analysis',
          message: `Analyzed ${basename(src)} — ${result.frameCount ?? 0} frames, ${result.sceneCount ?? 0} scenes`,
          detail: result.edlPath,
        });
      } else {
        appendActivity(jobId, {
          stage: 'analysis',
          message: `Skipped analysis for ${basename(src)} — ${result.status}`,
          detail: result.error,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      analyses.push({ src, status: 'failed', error: message });
      appendActivity(jobId, {
        stage: 'analysis',
        message: `Analysis failed for ${basename(src)}`,
        detail: message,
      });
    }
  }

  return analyses;
}

// ── System prompt for the composition planner ───────────────────

const SYSTEM_PROMPT = `You are a video composition planner for Remotion (React-based video framework).

Given a user's creative prompt, available source clips/audio, and output parameters, you produce a structured JSON composition plan.

## What you output

A single JSON object matching this TypeScript interface:

\`\`\`typescript
interface CompositionPlan {
  title: string;
  description: string;
  width: number;           // default 1920
  height: number;          // default 1080
  fps: number;             // default 30
  durationSec: number;     // total composition duration
  introStyle: "tactical" | "ascii" | "glitch" | "minimal" | "none";
  introDurationSec: number;
  outroDurationSec: number;
  transitionType: "fade" | "slide" | "cut";
  transitionDurationFrames: number;
  clips: Array<{
    src: string;           // path relative to public/
    startFrom: number;     // seconds into source
    duration: number;      // seconds to use
    label: string;
    zoom?: { scale: number; originX: number; originY: number; startAtSec: number; };
    videoVolume: number;   // 0-1
  }>;
  textOverlays: Array<{
    text: string;
    startAt: number;       // seconds from composition start
    duration: number;
    position: "center" | "bottom-left" | "bottom-center" | "top-left" | "top-center";
    style: "title" | "subtitle" | "caption" | "label";
  }>;
  audioTracks: Array<{
    src: string;           // path relative to public/
    volume: number;        // 0-1
    startAt: number;
    fadeIn: number;
    fadeOut: number;
    role: "music" | "voiceover" | "sfx";
  }>;
  subtitle: string;
  tagline: string;
  brand?: {
    name?: string;         // product/brand name, e.g. "Lattices"
    iconSrc?: string;      // path relative to public/, e.g. "brand/lattices-logo.png"
  };
}
\`\`\`

## Rules

1. Use ONLY the source files the user provides. Never invent file paths.
2. If no audio files are provided, set audioTracks to an empty array.
3. Clip startFrom + duration must not exceed reasonable bounds for the source file.
4. Total durationSec should equal introDurationSec + sum of clip durations (accounting for transitions) + outroDurationSec.
5. Keep text overlays tasteful — use them for scene labels, not walls of text.
6. For aspect ratio: "16:9" → 1920x1080, "1:1" → 1080x1080, "9:16" → 1080x1920.
7. Default to 30 fps unless the user specifies otherwise.
8. If the user asks for a "highlight reel" or "montage", pick the most visually interesting segments and keep each clip 5-10 seconds.
9. If the user asks for a "demo video", keep clips longer (15-60s) with minimal cuts.
10. Always include a brief description of your editing rationale in the description field.
11. When a brand input provides iconSrc, copy it into plan.brand.iconSrc and use that brand name in title/subtitle/tagline. Do not use Talkie assets unless the brief is explicitly about Talkie.
12. If the brief mentions a gesture, cursor path, or a screen quadrant, treat that as the primary subject. Use the processed input video analysis motionArea/quadrants to choose start times and zoom origins. For quadrant emphasis, center the zoom on the visible UI element inside that quadrant, not the mathematical corner of the whole frame. For bottom-right gesture emphasis, prefer zoom origins around originX 0.74-0.88 and originY 0.66-0.86, with a scale around 1.35-1.7 unless the shot remains legible at higher scale. Avoid blank screen areas, browser chrome, and the recording pill unless the brief explicitly asks for those controls.

## Revision jobs

When the job kind is "revise" or "revise-render", you'll receive the current Composition.tsx source and review notes or a confirmed revision brief.
Your job is to produce a new composition plan that addresses the feedback while preserving the parts that work.
Parse the existing TSX to understand the current clip selection, timing, and structure — then apply the reviewer's notes.
Common feedback types: FEEDBACK (general notes), ZOOM (add/adjust zoom on a region).

Respond with ONLY the JSON object, no markdown fences, no explanation.`;

// ── System prompt for the brief synthesizer (revise-brief) ─────

const BRIEF_SYSTEM_PROMPT = `You are reviewing a video composition with a human collaborator.

You'll receive the current Composition.tsx source plus timestamped or general review notes. Your job is to synthesize what the human wants, like you would in a chat session before making changes.

## What you output

A single JSON object matching this TypeScript interface:

\`\`\`typescript
interface RevisionBrief {
  intent: string;             // one short paragraph: what the user wants overall, in your own words
  plannedChanges: string[];   // scannable bullets of what you'd do, natural language
  questions: string[];        // ambiguities you'd ask before regenerating; empty if none
}
\`\`\`

## Tone

Write like a collaborator, not a planner. \`intent\` should sound like "You want me to ___ because ___." \`plannedChanges\` should be human-readable ("tighten the second clip from 6s to ~4s", "zoom into the search bar around 0:08"), not a spec. Use timestamps and clip labels from the source TSX so the human can verify you parsed it right.

## When to ask questions

If a note is ambiguous, references something not visible in the TSX, or could mean two different things, put it in \`questions\` instead of guessing. A non-empty \`questions\` list will pause the workflow until the reviewer resolves it.

Respond with ONLY the JSON object, no markdown fences, no explanation.`;

// ── Build the user message for the LLM ──────────────────────────

function buildUserMessage(ctx: {
  prompt: string;
  inputs: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  kind: JobKind;
  inputAnalyses?: InputAnalysisSummary[];
}): string {
  const parts: string[] = [];

  parts.push(`## Creative Brief\n${ctx.prompt}`);
  parts.push(`\n## Job Kind: ${ctx.kind}`);

  if (ctx.inputs) {
    const clips = (ctx.inputs.clips as string[] | undefined) ?? [];
    const audio = (ctx.inputs.audio as string[] | undefined) ?? [];
    if (clips.length > 0) {
      parts.push(`\n## Available Clips\n${clips.map(c => `- ${c}`).join('\n')}`);
    }
    if (audio.length > 0) {
      parts.push(`\n## Available Audio\n${audio.map(a => `- ${a}`).join('\n')}`);
    }

    if (ctx.kind === 'revise' || ctx.kind === 'revise-render') {
      const originalSource = ctx.inputs.originalSource as string | undefined;
      const reviewNotes = ctx.inputs.reviewNotes as string | undefined;
      const brief = ctx.inputs.brief as { intent?: string; plannedChanges?: string[] } | undefined;
      if (originalSource) {
        parts.push(`\n## Current Composition Source (TSX)\nRevise this composition based on the feedback below. Keep the same clips and structure unless the feedback says otherwise.\n\n\`\`\`tsx\n${originalSource}\n\`\`\``);
      }
      if (brief && (brief.intent || (brief.plannedChanges && brief.plannedChanges.length > 0))) {
        const lines: string[] = [];
        if (brief.intent) lines.push(brief.intent.trim());
        if (brief.plannedChanges && brief.plannedChanges.length > 0) {
          lines.push('');
          lines.push('Planned changes (already confirmed by the reviewer):');
          for (const change of brief.plannedChanges) lines.push(`- ${change}`);
        }
        parts.push(`\n## Revision Brief\n${lines.join('\n')}`);
      } else if (reviewNotes) {
        parts.push(`\n## Review Feedback\n${reviewNotes}`);
      }
    }

    const skipKeys = new Set(['clips', 'audio', 'originalSource', 'reviewNotes', 'brief']);
    const otherKeys = Object.keys(ctx.inputs).filter(k => !skipKeys.has(k));
    if (otherKeys.length > 0) {
      parts.push(`\n## Additional Inputs`);
      for (const key of otherKeys) {
        parts.push(`- ${key}: ${JSON.stringify(ctx.inputs[key])}`);
      }
    }
  }

  const completedAnalyses = (ctx.inputAnalyses ?? []).filter(a => a.status === 'complete');
  if (completedAnalyses.length > 0) {
    parts.push(`\n## Processed Input Video Analysis`);
    for (const analysis of completedAnalyses) {
      const stats = [
        `${analysis.frameCount ?? 0} storyboard frames`,
        `${analysis.sceneCount ?? 0} scenes`,
        `${analysis.activeTime ?? 0}s active`,
        `${analysis.idleTime ?? 0}s idle`,
        `${analysis.deadTimeCount ?? 0} dead-time spans`,
      ].join(', ');

      parts.push(`\n### ${analysis.src}\n- ${stats}\n- storyboard: ${analysis.storyboardDir}\n- edl: ${analysis.edlPath}`);

      if (analysis.scenes?.length) {
        parts.push(`- scene timeline:`);
        for (const scene of analysis.scenes) {
          const end = scene.end != null ? `-${Math.round(scene.end)}s` : '';
          const motion = scene.motionArea ? `, motion=${scene.motionArea}` : '';
          const frame = scene.frameFile ? `, frame=${scene.frameFile}` : '';
          const quadrants = scene.quadrants
            ? `, quadrants TL=${formatMotionValue(scene.quadrants.topLeft)} TR=${formatMotionValue(scene.quadrants.topRight)} BL=${formatMotionValue(scene.quadrants.bottomLeft)} BR=${formatMotionValue(scene.quadrants.bottomRight)}`
            : '';
          parts.push(`  - ${Math.round(scene.start)}s${end} [${scene.activity ?? 'unknown'}${motion}${frame}${quadrants}] ${scene.description}`);
        }
      }
    }
  }

  if (ctx.params) {
    parts.push(`\n## Parameters`);
    for (const [key, value] of Object.entries(ctx.params)) {
      parts.push(`- ${key}: ${JSON.stringify(value)}`);
    }
  }

  return parts.join('\n');
}

function formatMotionValue(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(5) : 'n/a';
}

// ── Parse + validate the LLM response ───────────────────────────

function parsePlan(raw: string, opts: { fallbackTitle?: string } = {}): CompositionPlan {
  // Strip markdown fences if the model wraps them
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  }

  const plan = JSON.parse(cleaned) as CompositionPlan;

  // Validate required fields. Be lenient on cosmetic fields so a model that
  // returns a structurally usable plan does not fail just because it omitted
  // a title or description.
  if (!plan.title || typeof plan.title !== 'string') {
    plan.title = opts.fallbackTitle || 'Untitled composition';
  }
  if (typeof plan.description !== 'string') {
    plan.description = '';
  }
  if (!plan.clips || !Array.isArray(plan.clips)) {
    throw new Error('Plan missing clips array');
  }
  if (typeof plan.durationSec !== 'number' || plan.durationSec <= 0) {
    const sumFromClips = plan.clips.reduce((acc, clip) => (
      acc + (typeof clip.duration === 'number' ? clip.duration : 0)
    ), 0);
    if (sumFromClips > 0) {
      plan.durationSec = sumFromClips;
    } else {
      throw new Error('Plan has invalid durationSec and no clip durations to derive from');
    }
  }

  // Apply defaults
  plan.width ??= 1920;
  plan.height ??= 1080;
  plan.fps ??= 30;
  plan.introStyle ??= 'tactical';
  plan.introDurationSec ??= 2;
  plan.outroDurationSec ??= 3;
  plan.transitionType ??= 'fade';
  plan.transitionDurationFrames ??= 15;
  plan.textOverlays ??= [];
  plan.audioTracks ??= [];
  plan.subtitle ??= '';
  plan.tagline ??= '';
  plan.brand ??= {};

  // Validate clips
  for (const clip of plan.clips) {
    if (!clip.src || typeof clip.src !== 'string') {
      throw new Error(`Clip missing src: ${JSON.stringify(clip)}`);
    }
    clip.startFrom ??= 0;
    clip.duration ??= 5;
    clip.label ??= '';
    clip.videoVolume ??= 0;
  }

  return plan;
}

// ── Generate Remotion composition TSX from the plan ─────────────

function generateCompositionTsx(plan: CompositionPlan, compositionId: string): string {
  const safeId = compositionId.replace(/[^a-zA-Z0-9]/g, '_');
  const componentName = `Composition_${safeId}`;

  const clipEntries = plan.clips.map((clip, i) => {
    const zoomPart = clip.zoom
      ? `zoom: { scale: ${clip.zoom.scale}, originX: ${clip.zoom.originX}, originY: ${clip.zoom.originY}, startAtSec: ${clip.zoom.startAtSec} },`
      : '';
    return `  {
    src: ${JSON.stringify(clip.src)},
    startFrom: ${clip.startFrom},
    duration: ${clip.duration},
    label: ${JSON.stringify(clip.label)},
    videoVolume: ${clip.videoVolume},
    ${zoomPart}
  }`;
  }).join(',\n');

  const audioEntries = plan.audioTracks.map(track => `  {
    src: ${JSON.stringify(track.src)},
    volume: ${track.volume},
    startAt: ${track.startAt},
    fadeIn: ${track.fadeIn},
    fadeOut: ${track.fadeOut},
    role: ${JSON.stringify(track.role)},
  }`).join(',\n');

  const overlayEntries = plan.textOverlays.map(overlay => `  {
    text: ${JSON.stringify(overlay.text)},
    startAt: ${overlay.startAt},
    duration: ${overlay.duration},
    position: ${JSON.stringify(overlay.position)},
    style: ${JSON.stringify(overlay.style)},
  }`).join(',\n');

  // Determine intro component import
  const introImportMap: Record<string, { component: string; importPath: string }> = {
    tactical: { component: 'TacticalIntro', importPath: '../../src/projects/demo-template/TacticalIntro' },
    ascii: { component: 'AsciiIntro', importPath: '../../src/intros/AsciiIntro' },
    glitch: { component: 'GlitchIntro', importPath: '../../src/intros/GlitchIntro' },
    minimal: { component: 'MinimalIntro', importPath: '../../src/intros/MinimalIntro' },
  };

  const intro = introImportMap[plan.introStyle] ?? introImportMap.tactical;
  const hasIntro = plan.introStyle !== 'none' && plan.introDurationSec > 0;
  const hasOutro = plan.outroDurationSec > 0;
  const brandName = plan.brand?.name || plan.title;
  const brandIconSrc = plan.brand?.iconSrc || "talkie-icon-1024.png";

  return `// @ts-nocheck
// Auto-generated composition for ${compositionId}
// ${plan.description}
// Generated: ${new Date().toISOString()}

import {
  AbsoluteFill,
  Sequence,
  Audio,
  OffthreadVideo,
  staticFile,
  interpolate,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";
${hasIntro ? `import { ${intro.component} } from "${intro.importPath}";\n` : ''}${hasOutro ? `import { TacticalOutro } from "../../src/projects/demo-template/TacticalOutro";\n` : ''}
// ── Plan constants ──────────────────────────────────────────────

const FPS = ${plan.fps};
const WIDTH = ${plan.width};
const HEIGHT = ${plan.height};
const DURATION_SEC = ${plan.durationSec};
const DURATION_FRAMES = Math.round(DURATION_SEC * FPS);
const INTRO_FRAMES = Math.round(${plan.introDurationSec} * FPS);
const OUTRO_FRAMES = Math.round(${plan.outroDurationSec} * FPS);
const TRANSITION_FRAMES = ${plan.transitionDurationFrames};

const CLIPS = [
${clipEntries}
];

const AUDIO_TRACKS = [
${audioEntries}
];

const TEXT_OVERLAYS = [
${overlayEntries}
];

// ── Clip component ──────────────────────────────────────────────

const ClipSegment: React.FC<{
  clip: typeof CLIPS[number];
  clipDurationFrames: number;
}> = ({ clip, clipDurationFrames }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Fade in/out for transitions
  const fadeIn = TRANSITION_FRAMES > 0
    ? interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
    : 1;
  const fadeOut = TRANSITION_FRAMES > 0
    ? interpolate(
      frame,
      [clipDurationFrames - TRANSITION_FRAMES, clipDurationFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )
    : 1;
  const opacity = fadeIn * fadeOut;

  // Zoom
  let scale = 1;
  let originX = 50;
  let originY = 50;
  if (clip.zoom) {
    const zoomStartFrame = Math.min(
      Math.max(0, clip.zoom.startAtSec * fps),
      Math.max(0, clipDurationFrames - 1)
    );
    const zoomEndFrame = Math.min(
      zoomStartFrame + 0.7 * fps,
      Math.max(0, clipDurationFrames - 1)
    );
    scale = zoomEndFrame > zoomStartFrame
      ? interpolate(
        frame,
        [zoomStartFrame, zoomEndFrame],
        [1, clip.zoom.scale],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
      : clip.zoom.scale;
    originX = clip.zoom.originX <= 1 ? clip.zoom.originX * 100 : clip.zoom.originX;
    originY = clip.zoom.originY <= 1 ? clip.zoom.originY * 100 : clip.zoom.originY;
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(clip.src)}
        startFrom={Math.round(clip.startFrom * fps)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: \`scale(\${scale})\`,
          transformOrigin: \`\${originX}% \${originY}%\`,
        }}
        volume={clip.videoVolume}
      />
      {clip.label && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 48,
            fontFamily: "SF Mono, Monaco, Consolas, monospace",
            color: "#e0e0e8",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.12em",
            opacity: interpolate(frame, [0.3 * fps, 0.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {clip.label}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── Text overlay component ──────────────────────────────────────

const TextOverlay: React.FC<{
  overlay: typeof TEXT_OVERLAYS[number];
}> = ({ overlay }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const totalFrames = overlay.duration * fps;
  const fadeOut = interpolate(frame, [totalFrames - 0.4 * fps, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const positionStyles: Record<string, React.CSSProperties> = {
    "center": { display: "flex", alignItems: "center", justifyContent: "center" },
    "bottom-left": { display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: 48 },
    "bottom-center": { display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 48 },
    "top-left": { display: "flex", alignItems: "flex-start", justifyContent: "flex-start", padding: 48 },
    "top-center": { display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48 },
  };

  const fontSizes: Record<string, number> = {
    title: 48, subtitle: 28, caption: 18, label: 14,
  };

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, ...positionStyles[overlay.position] }}>
      <div
        style={{
          fontFamily: "SF Mono, Monaco, Consolas, monospace",
          color: "#e0e0e8",
          fontSize: fontSizes[overlay.style] ?? 18,
          fontWeight: overlay.style === "title" ? 700 : 400,
          letterSpacing: "0.04em",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        {overlay.text}
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ────────────────────────────────────────────

export const ${componentName}: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  // Build clip timeline
  let cursor = INTRO_FRAMES;
  const clipTimeline = CLIPS.map((clip, i) => {
    const frames = Math.round(clip.duration * fps);
    const from = cursor;
    // Overlap clips by transition duration for cross-dissolve
    cursor += frames - (i < CLIPS.length - 1 ? TRANSITION_FRAMES : 0);
    return { clip, from, frames };
  });

  const outroStart = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
      {/* Audio tracks */}
      {AUDIO_TRACKS.map((track, i) => {
        const startFrame = Math.round(track.startAt * fps);
        return (
          <Sequence key={\`audio-\${i}\`} name={\`Audio-\${track.role}-\${i}\`} from={startFrame} durationInFrames={durationInFrames - startFrame}>
            <Audio
              src={staticFile(track.src)}
              volume={(f) => {
                const fadeInEnd = track.fadeIn * fps;
                const fadeOutStart = durationInFrames - startFrame - track.fadeOut * fps;
                if (f < fadeInEnd) return interpolate(f, [0, fadeInEnd], [0, track.volume]);
                if (f > fadeOutStart) return interpolate(f, [fadeOutStart, durationInFrames - startFrame], [track.volume, 0]);
                return track.volume;
              }}
            />
          </Sequence>
        );
      })}

${hasIntro ? `      {/* Intro */}
      <Sequence name="Intro" from={0} durationInFrames={INTRO_FRAMES}>
        <${intro.component}
          title={${JSON.stringify(brandName)}}
          subtitle={${JSON.stringify(plan.subtitle)}}
          iconSrc={${JSON.stringify(brandIconSrc)}}
        />
      </Sequence>
` : ''}
      {/* Content clips */}
      {clipTimeline.map(({ clip, from, frames }, i) => (
        <Sequence key={\`clip-\${i}\`} name={\`Clip-\${clip.label || i}\`} from={from} durationInFrames={frames}>
          <ClipSegment clip={clip} clipDurationFrames={frames} />
        </Sequence>
      ))}

      {/* Text overlays */}
      {TEXT_OVERLAYS.map((overlay, i) => (
        <Sequence
          key={\`overlay-\${i}\`}
          name={\`Text-\${i}\`}
          from={Math.round(overlay.startAt * fps)}
          durationInFrames={Math.round(overlay.duration * fps)}
        >
          <TextOverlay overlay={overlay} />
        </Sequence>
      ))}

${hasOutro ? `      {/* Outro */}
      <Sequence name="Outro" from={outroStart} durationInFrames={OUTRO_FRAMES}>
        <TacticalOutro
          title={${JSON.stringify(brandName)}}
          tagline={${JSON.stringify(plan.tagline)}}
          iconSrc={${JSON.stringify(brandIconSrc)}}
        />
      </Sequence>
` : ''}
    </AbsoluteFill>
  );
};

// Composition registration metadata
export const compositionMeta = {
  id: ${JSON.stringify(compositionId)},
  component: ${componentName},
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  durationInFrames: DURATION_FRAMES,
};
`;
}

// ── Render entry point generator ────────────────────────────────

function generateRenderEntry(compositionId: string): string {
  const safeId = compositionId.replace(/[^a-zA-Z0-9]/g, '_');
  const componentName = `Composition_${safeId}`;

  return `import { registerRoot } from "remotion";
import { Composition } from "remotion";
import { ${componentName}, compositionMeta } from "./Composition";

const Root: React.FC = () => (
  <Composition
    id={compositionMeta.id}
    component={compositionMeta.component}
    width={compositionMeta.width}
    height={compositionMeta.height}
    fps={compositionMeta.fps}
    durationInFrames={compositionMeta.durationInFrames}
  />
);

registerRoot(Root);
`;
}

function renderComposition(compositionId: string, outDir: string): string {
  const entryPoint = join(outDir, 'render-entry.tsx');
  const publicOutDir = join(process.cwd(), 'public', 'out');
  const outputPath = join(publicOutDir, `${compositionId}.mp4`);

  mkdirSync(publicOutDir, { recursive: true });

  const cmd = `npx remotion render "${entryPoint}" "${compositionId}" "${outputPath}" --log=error`;
  console.log(`[worker] Rendering: ${cmd}`);

  execSync(cmd, {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10 * 60 * 1000, // 10 min max
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  return outputPath;
}

function rebuildCatalog(): void {
  try {
    execSync('bun run scripts/build-catalog.ts', {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60 * 1000,
    });
    console.log('[worker] Catalog rebuilt');
  } catch (err: any) {
    console.warn('[worker] Catalog rebuild failed (non-fatal):', err.message);
  }
}

// ── Poll loop ───────────────────────────────────────────────────

let polling = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export function startWorker() {
  if (polling) return;
  polling = true;
  console.log('[worker] Composition jobs worker started (poll-based)');
  poll();
}

export function stopWorker() {
  polling = false;
  if (timer) clearTimeout(timer);
}

function poll() {
  if (!polling) return;
  try {
    const row = getDb().prepare(
      `SELECT job_id, composition_id, kind, prompt, inputs_json, params_json
       FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`
    ).get() as any;

    if (row) {
      processJob({
        jobId: row.job_id,
        compositionId: row.composition_id,
        kind: row.kind,
        prompt: row.prompt,
        inputs: row.inputs_json ? JSON.parse(row.inputs_json) : null,
        params: row.params_json ? JSON.parse(row.params_json) : null,
      }).then(() => {
        console.log(`[worker] Job ${row.job_id} completed`);
        schedulePoll(100);
      }).catch((err) => {
        console.error(`[worker] Job ${row.job_id} failed:`, err);
        schedulePoll(1000);
      });
    } else {
      schedulePoll(2000);
    }
  } catch (err) {
    console.error('[worker] Poll error:', err);
    schedulePoll(5000);
  }
}

function schedulePoll(ms: number) {
  if (!polling) return;
  timer = setTimeout(poll, ms);
}

// ── Main job processor ──────────────────────────────────────────

async function processJob(ctx: {
  jobId: string;
  compositionId: string;
  kind: JobKind;
  prompt: string;
  inputs: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
}) {
  const { jobId, compositionId, kind, prompt, inputs, params } = ctx;

  updateJobStatus(jobId, 'running');

  const updateState = (agentState: string, progress: number, lastMessage?: string) => {
    updateJobAgent(jobId, {
      agentState,
      progress,
      lastMessage,
      heartbeatAt: new Date().toISOString(),
    });
  };

  try {
    // Stage 1 of the two-stage revise flow: synthesize a human-readable
    // brief and stop before rendering, so the reviewer can confirm intent.
    if (kind === 'revise-brief') {
      await runBrief({ jobId, compositionId, inputs, updateState });
      return;
    }

    // Logo composition framework — separate pipeline that produces Hyperframe
    // HTML in .compositions/logos/<id>/ (mirrored into public/ for the iframe).
    if (kind === 'logo-brief') {
      await runLogoBrief({ jobId, compositionId, prompt, inputs: inputs as LogoJobInputs | null, updateState });
      return;
    }
    if (kind === 'logo-render') {
      await runLogoRender({ jobId, compositionId, prompt, inputs: inputs as LogoJobInputs | null, updateState });
      return;
    }

    // ── Stage 1: Collect inputs ─────────────────────────────
    updateState('collecting inputs', 5, `Reading ${kind} job for ${compositionId}`);

    const clips = (inputs?.clips as string[] | undefined) ?? [];
    const audio = (inputs?.audio as string[] | undefined) ?? [];
    const aspectRatio = (params?.aspectRatio as string | undefined) ?? '16:9';
    const durationSec = (params?.durationSec as number | undefined);
    const soundtrack = normalizeSoundtrackRequest(params);
    const shouldAnalyzeInputs = params?.analyzeInputs !== false;

    appendActivity(jobId, {
      stage: 'inputs',
      message: `${clips.length} clip${clips.length !== 1 ? 's' : ''}, ${audio.length} audio, aspect ${aspectRatio}${soundtrack.enabled ? ', soundtrack requested' : ''}`,
      detail: clips.join(', '),
    });

    console.log(`[worker] Job ${jobId}: ${clips.length} clips, ${audio.length} audio, aspect=${aspectRatio}`);

    let inputAnalyses: InputAnalysisSummary[] = [];
    if (clips.length > 0 && shouldAnalyzeInputs) {
      updateState('analyzing inputs', 10, `Extracting storyboard frames from ${clips.length} clip${clips.length !== 1 ? 's' : ''}`);
      appendActivity(jobId, {
        stage: 'analysis',
        message: `Running FFmpeg storyboard analysis for ${clips.length} input clip${clips.length !== 1 ? 's' : ''}`,
      });

      inputAnalyses = await analyzeInputClips(clips, jobId);

      if (inputAnalyses.some(a => a.status === 'complete')) {
        rebuildCatalog();
      }
    } else if (clips.length > 0) {
      inputAnalyses = clips.map(src => ({ src, status: 'skipped' as const, error: 'Input analysis disabled for this job' }));
      appendActivity(jobId, {
        stage: 'analysis',
        message: 'Input video analysis skipped by job parameters',
      });
    }

    // ── Stage 2: Call LLM to plan the composition ───────────
    updateState('planning composition', 15, `Sending prompt to LLM with ${clips.length} clips`);

    const userMessage = buildUserMessage({ prompt, inputs, params, kind, inputAnalyses });
    const providerConfig = readProviderConfig();

    appendActivity(jobId, {
      stage: 'llm',
      message: `Calling ${providerConfig.name || providerConfig.model} (${providerConfig.format}) for composition plan`,
    });

    console.log(`[worker] Job ${jobId}: calling ${providerConfig.model} via ${providerConfig.format} format`);

    const llmResult = await callLLM({
      system: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 4096,
    });

    if (!llmResult.text) {
      throw new Error('LLM returned no text content');
    }

    updateState('parsing plan', 40, 'Received composition plan from LLM');

    appendActivity(jobId, {
      stage: 'llm',
      message: `LLM responded (${llmResult.text.length} chars, ${llmResult.inputTokens} in / ${llmResult.outputTokens} out tokens)`,
    });

    // ── Stage 3: Parse and validate the plan ────────────────
    let plan: CompositionPlan;
    try {
      plan = parsePlan(llmResult.text, { fallbackTitle: compositionId });
    } catch (parseErr: any) {
      console.error(`[worker] Job ${jobId}: plan parse failed:`, parseErr.message);
      appendActivity(jobId, { stage: 'error', message: `Plan parse failed: ${parseErr.message}` });
      throw new Error(`Failed to parse composition plan: ${parseErr.message}`);
    }

    if (aspectRatio === '1:1') {
      plan.width = 1080; plan.height = 1080;
    } else if (aspectRatio === '9:16') {
      plan.width = 1080; plan.height = 1920;
    } else {
      plan.width = plan.width || 1920; plan.height = plan.height || 1080;
    }

    if (durationSec && durationSec > 0) {
      plan.durationSec = durationSec;
    }

    const suppliedAudio = new Set(audio);
    const plannerAudioCount = plan.audioTracks.length;
    plan.audioTracks = plan.audioTracks.filter(track => suppliedAudio.has(track.src));
    if (plannerAudioCount !== plan.audioTracks.length) {
      appendActivity(jobId, {
        stage: 'plan',
        message: `Removed ${plannerAudioCount - plan.audioTracks.length} planner audio track(s) that were not supplied assets`,
      });
    }

    if (soundtrack.enabled) {
      updateState('generating soundtrack', 50, 'Generating MiniMax Music 2.6 soundtrack');
      appendActivity(jobId, {
        stage: 'music',
        message: `Generating ${soundtrack.instrumental ? 'instrumental' : 'vocal'} soundtrack with ${soundtrack.model || 'music-2.6'}`,
        detail: soundtrack.prompt || DEFAULT_SOUNDTRACK_PROMPT,
      });

      const generated = await generateMiniMaxSoundtrack(compositionId, soundtrack, providerConfig);
      plan.audioTracks.push({
        src: generated.path,
        volume: generated.volume,
        startAt: soundtrack.startAt ?? 0,
        fadeIn: soundtrack.fadeIn ?? 1,
        fadeOut: soundtrack.fadeOut ?? 2,
        role: 'music',
      });

      if ((soundtrack.showLyricCaptions ?? true) && generated.lyrics) {
        plan.textOverlays.push(...lyricCaptionOverlays(generated.lyrics, plan.durationSec));
      }

      appendActivity(jobId, {
        stage: 'music',
        message: `Soundtrack generated to ${generated.path}`,
        detail: generated.lyrics || generated.prompt,
      });
    }

    appendActivity(jobId, {
      stage: 'plan',
      message: `"${plan.title}" — ${plan.clips.length} clips, ${plan.durationSec}s, ${plan.width}x${plan.height}@${plan.fps}fps`,
      detail: plan.description,
    });

    console.log(`[worker] Job ${jobId}: plan parsed — "${plan.title}", ${plan.clips.length} clips, ${plan.durationSec}s`);

    updateState('generating composition', 55, `Plan: "${plan.title}" — ${plan.clips.length} clips, ${plan.durationSec}s`);

    // ── Stage 4: Generate composition files ─────────────────
    const outDir = join(process.cwd(), '.compositions', compositionId);
    mkdirSync(outDir, { recursive: true });

    const planPath = join(outDir, 'composition.json');
    writeFileSync(planPath, JSON.stringify(plan, null, 2));

    updateState('writing composition', 70, 'Generating Remotion TSX component');

    const tsxContent = generateCompositionTsx(plan, compositionId);
    const tsxPath = join(outDir, 'Composition.tsx');
    writeFileSync(tsxPath, tsxContent);

    const meta = {
      compositionId, jobId, kind,
      createdAt: new Date().toISOString(),
      plan: {
        title: plan.title, description: plan.description,
        width: plan.width, height: plan.height,
        fps: plan.fps, durationSec: plan.durationSec,
        clipCount: plan.clips.length, audioTrackCount: plan.audioTracks.length,
      },
    };
    writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

    appendActivity(jobId, {
      stage: 'files',
      message: `Wrote composition.json, Composition.tsx, meta.json to .compositions/${compositionId}/`,
    });

    // ── Stage 5: Generate render entry point ───────────────
    updateState('preparing render', 60, 'Generating render entry point');

    const renderEntryContent = generateRenderEntry(compositionId);
    const renderEntryPath = join(outDir, 'render-entry.tsx');
    writeFileSync(renderEntryPath, renderEntryContent);

    appendActivity(jobId, {
      stage: 'render',
      message: `Render entry point written, starting Remotion render…`,
    });

    // ── Stage 6: Render the composition to .mp4 ────────────
    updateState('rendering video', 65, `Rendering ${plan.durationSec}s video at ${plan.width}x${plan.height}`);

    let outputPath: string;
    try {
      outputPath = renderComposition(compositionId, outDir);
    } catch (renderErr: any) {
      const stderr = renderErr.stderr?.toString?.()?.slice(-500) || renderErr.message;
      appendActivity(jobId, { stage: 'error', message: `Render failed: ${stderr}` });
      throw new Error(`Remotion render failed: ${stderr}`);
    }

    const outputExists = existsSync(outputPath);
    if (!outputExists) {
      throw new Error(`Render completed but output file not found: ${outputPath}`);
    }

    appendActivity(jobId, {
      stage: 'render',
      message: `Video rendered to out/${compositionId}.mp4`,
    });

    updateState('rebuilding catalog', 90, 'Adding rendered video to catalog');

    // ── Stage 7: Rebuild the catalog so it appears in Videos ──
    rebuildCatalog();

    appendActivity(jobId, {
      stage: 'done',
      message: `Video ready — out/${compositionId}.mp4 (${plan.clips.length} clips, ${plan.durationSec}s)`,
      detail: `out/${compositionId}.mp4`,
    });

    completeJob(jobId, {
      outputUrls: [
        `out/${compositionId}.mp4`,
        `.compositions/${compositionId}/Composition.tsx`,
        `.compositions/${compositionId}/composition.json`,
      ],
      metadata: {
        kind,
        title: plan.title,
        description: plan.description,
        durationSec: plan.durationSec,
        width: plan.width,
        height: plan.height,
        fps: plan.fps,
        clipCount: plan.clips.length,
        audioTrackCount: plan.audioTracks.length,
        introStyle: plan.introStyle,
        compositionDir: `.compositions/${compositionId}`,
        videoPath: `out/${compositionId}.mp4`,
        inputAnalyses,
      },
    });

  } catch (err: any) {
    console.error(`[worker] Job ${jobId} failed:`, err);
    appendActivity(jobId, { stage: 'error', message: err.message || String(err) });
    failJob(jobId, { message: err.message || String(err) });
    throw err;
  }
}

// ── Brief synthesis (revise-brief) ──────────────────────────────

interface RevisionBrief {
  sourceCompositionId: string;
  generatedAt: string;
  generatedBy: { provider: string; model: string };
  intent: string;
  plannedChanges: string[];
  questions: string[];
}

function parseBrief(raw: string): Pick<RevisionBrief, 'intent' | 'plannedChanges' | 'questions'> {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const obj = JSON.parse(text);
  return {
    intent: typeof obj.intent === 'string' ? obj.intent : '',
    plannedChanges: Array.isArray(obj.plannedChanges)
      ? obj.plannedChanges.filter((change: unknown): change is string => typeof change === 'string')
      : [],
    questions: Array.isArray(obj.questions)
      ? obj.questions.filter((question: unknown): question is string => typeof question === 'string')
      : [],
  };
}

async function runBrief(ctx: {
  jobId: string;
  compositionId: string;
  inputs: Record<string, unknown> | null;
  updateState: (agentState: string, progress: number, lastMessage?: string) => void;
}) {
  const { jobId, compositionId, inputs, updateState } = ctx;
  const sourceCompositionId = (inputs?.sourceCompositionId as string | undefined) ?? compositionId;
  const originalSource = (inputs?.originalSource as string | undefined) ?? '';
  const reviewNotes = (inputs?.reviewNotes as string | undefined) ?? '';

  if (!originalSource || !reviewNotes) {
    throw new Error('Brief requires both originalSource and reviewNotes inputs');
  }

  updateState('reading source + notes', 10, `Synthesizing brief for ${sourceCompositionId}`);
  appendActivity(jobId, {
    stage: 'inputs',
    message: `Reading TSX (${originalSource.length} chars) + ${reviewNotes.split('\n').length} note lines`,
  });

  const providerConfig = readProviderConfig();
  updateState('interpreting feedback', 30, `Calling ${providerConfig.name || providerConfig.model} for brief`);
  appendActivity(jobId, {
    stage: 'llm',
    message: `Calling ${providerConfig.name || providerConfig.model} (${providerConfig.format}) to interpret review notes`,
  });

  const userMessage = [
    `## Source Composition (${sourceCompositionId})`,
    '',
    '```tsx',
    originalSource,
    '```',
    '',
    '## Review Notes',
    reviewNotes,
  ].join('\n');

  const llmResult = await callLLM({
    system: BRIEF_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 2048,
  });

  if (!llmResult.text) throw new Error('LLM returned no text content');
  appendActivity(jobId, {
    stage: 'llm',
    message: `LLM responded (${llmResult.text.length} chars, ${llmResult.inputTokens} in / ${llmResult.outputTokens} out tokens)`,
  });

  updateState('parsing brief', 70, 'Parsing revision brief JSON');
  let parsed: Pick<RevisionBrief, 'intent' | 'plannedChanges' | 'questions'>;
  try {
    parsed = parseBrief(llmResult.text);
  } catch (parseErr: any) {
    appendActivity(jobId, { stage: 'error', message: `Brief parse failed: ${parseErr.message}` });
    throw new Error(`Failed to parse revision brief: ${parseErr.message}`);
  }

  const brief: RevisionBrief = {
    sourceCompositionId,
    generatedAt: new Date().toISOString(),
    generatedBy: { provider: providerConfig.format, model: providerConfig.model },
    intent: parsed.intent,
    plannedChanges: parsed.plannedChanges,
    questions: parsed.questions,
  };

  const outDir = join(process.cwd(), '.compositions', compositionId);
  mkdirSync(outDir, { recursive: true });
  const briefPath = join(outDir, 'revision-brief.json');
  writeFileSync(briefPath, JSON.stringify(brief, null, 2));

  appendActivity(jobId, {
    stage: 'plan',
    message: `Brief ready — ${brief.plannedChanges.length} planned change${brief.plannedChanges.length === 1 ? '' : 's'}${brief.questions.length > 0 ? `, ${brief.questions.length} question${brief.questions.length === 1 ? '' : 's'} blocking` : ''}`,
    detail: brief.intent,
  });

  appendActivity(jobId, {
    stage: 'done',
    message: brief.questions.length > 0
      ? `Brief written — awaiting answers to ${brief.questions.length} question${brief.questions.length === 1 ? '' : 's'} before regen`
      : 'Brief written — ready to regenerate',
    detail: `.compositions/${compositionId}/revision-brief.json`,
  });

  completeJob(jobId, {
    outputUrls: [`.compositions/${compositionId}/revision-brief.json`],
    metadata: {
      kind: 'revise-brief',
      sourceCompositionId,
      briefPath: `.compositions/${compositionId}/revision-brief.json`,
      intent: brief.intent,
      plannedChangeCount: brief.plannedChanges.length,
      questionCount: brief.questions.length,
      readyToRegen: brief.questions.length === 0,
      compositionDir: `.compositions/${compositionId}`,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Logo composition framework — handlers for logo-brief and logo-render
//
// Pipeline:
//   logo-brief:  read source (svg/png path or prompt only) + optional review
//                notes → ask the model for a motion plan in markdown →
//                write .compositions/logos/<id>/brief.md.
//   logo-render: read source + brief → ask the model for a Hyperframe HTML
//                document → write .compositions/logos/<id>/Composition.html.
//
// Inputs accepted on both kinds (passed as job.inputs):
//   - sourcePath?: string        absolute or public-relative path to SVG/PNG
//   - sourceSvg?: string         inline SVG content (alternative to sourcePath)
//   - prompt?: string            user description of desired motion
//   - reviewNotes?: string       exported notes from a prior render (revise)
//   - briefMarkdown?: string     pre-confirmed brief (logo-render skips brief)
//   - manifest?: object          (future) Hudson logo manifest
// ─────────────────────────────────────────────────────────────────────────

const LOGO_BRIEF_SYSTEM_PROMPT = `You are a motion-design director writing a tight brief for an animator.

INPUT
- A logo source: usually an SVG (sometimes a PNG, sometimes only a text description).
- A short user prompt describing desired motion. May be empty.
- Optional review notes from a previous take.

OUTPUT
Plain Markdown only. No JSON, no preamble.

Required structure:

# Motion Brief

## Intent
One paragraph (2–4 sentences) capturing the feel and purpose of the animation.

## Beats
A numbered list of 4–8 motion beats. Each beat names what moves, when (rough timing in seconds), and how (the gesture). Keep timings under 5s total unless the user asked for more.

## Cadence
Pace and tone — e.g. "patient and architectural", "sharp and confident", "playful with one comic beat". One short paragraph.

## Constraints
Bullet list of things to avoid (no spins, no parallax 3D unless asked, respect brand colors, etc.). Inherit constraints from review notes verbatim when present.

If the user prompt is missing or vague, propose a sensible default for the source — viewfinder-style frame draw-ins for a thin-line mark; reveal-then-settle for a wordmark; pulse-and-hold for a single shape.

Keep the entire brief under 300 words.`;

const LOGO_RENDER_SYSTEM_PROMPT = `You are writing a single self-contained Hyperframe HTML document that animates a logo.

REQUIREMENTS
- Output ONE complete HTML document. No commentary, no surrounding prose, no Markdown code fence.
- Start with <!DOCTYPE html> and end with </html>.
- All CSS, JS, and SVG inline. NO external resources except inline data URIs and inline fonts. NO <link rel="stylesheet">. NO <script src=>. (Inline <script> blocks are fine.)
- Canvas: 1920×1080. Set <html> and <body> to width: 1920px, height: 1080px, margin: 0, overflow: hidden.
- Animation runs once, finite duration, settles on a still frame. Default 3.5s total. Loop only if the brief asks.
- The animated logo should be visually centered. Use SVG paths/shapes for the mark and wordmark; do not embed raster images unless the source was PNG.
- When animating individual parts, target elements by id or data-part attribute — never by nth-of-type — so future re-renders of the source SVG stay compatible.
- Use CSS transforms, opacity, clip-path, stroke-dasharray, and requestAnimationFrame. GSAP is allowed but not required; if you use it, inline the smallest UMD build you need or use Web Animations API instead.
- Respect any colors and viewBox from the provided source SVG.

INPUT WILL CONTAIN
- A motion brief (markdown) describing intent, beats, cadence, constraints.
- The source: usually an inline SVG to base the animation on. Sometimes only a text description.

WRITE THE HTML.`;

interface LogoJobInputs {
  sourcePath?: string;
  sourceSvg?: string;
  prompt?: string;
  reviewNotes?: string;
  briefMarkdown?: string;
}

async function readLogoSource(inputs: LogoJobInputs | null): Promise<{ svg?: string; prompt?: string; filename?: string }> {
  const sourcePath = inputs?.sourcePath?.trim();
  const sourceSvg = inputs?.sourceSvg?.trim();
  const prompt = inputs?.prompt?.trim();

  if (sourceSvg) return { svg: sourceSvg, prompt };

  if (sourcePath) {
    const resolved = sourcePath.startsWith('/')
      ? join(process.cwd(), 'public', sourcePath.replace(/^\/+/, ''))
      : sourcePath;
    try {
      if (/\.svg$/i.test(resolved)) {
        const svg = readFileSync(resolved, 'utf8');
        return { svg, prompt, filename: resolved.split('/').pop() };
      }
      // PNG — pass as a note instead of inlining bytes. The model will compose
      // a wordmark-style animation from the prompt.
      return { prompt: prompt ?? '(source was a PNG — animate from description)', filename: resolved.split('/').pop() };
    } catch {
      return { prompt };
    }
  }

  return { prompt };
}

function readSidecar(logoId: string): Record<string, any> {
  try {
    const p = join(process.cwd(), '.compositions', 'logos', logoId, 'sidecar.json');
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

function writeSidecar(logoId: string, patch: Record<string, any>): void {
  const dir = join(process.cwd(), '.compositions', 'logos', logoId);
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'sidecar.json');
  const existing = readSidecar(logoId);
  writeFileSync(p, JSON.stringify({ ...existing, ...patch }, null, 2));
}

async function runLogoBrief(ctx: {
  jobId: string;
  compositionId: string;
  prompt: string;
  inputs: LogoJobInputs | null;
  updateState: (agentState: string, progress: number, lastMessage?: string) => void;
}) {
  const { jobId, compositionId, prompt: jobPrompt, inputs, updateState } = ctx;
  const logoId = compositionId;
  const sidecar = readSidecar(logoId);
  const userPrompt = (inputs?.prompt ?? jobPrompt ?? sidecar.lastPrompt ?? '').trim();
  const reviewNotes = inputs?.reviewNotes?.trim() ?? '';

  updateState('reading source', 10, `Logo brief for ${logoId}`);
  const source = await readLogoSource(inputs ?? { prompt: userPrompt });

  const userMessage = [
    '## User prompt',
    userPrompt || '(none — propose a sensible default)',
    '',
    source.svg ? '## Source SVG\n\n```svg\n' + source.svg.slice(0, 12_000) + '\n```' : '## Source\n\n(no SVG — animate from description)',
    reviewNotes ? '\n\n## Review notes from previous take\n' + reviewNotes : '',
  ].join('\n');

  const providerConfig = readProviderConfig();
  updateState('drafting brief', 40, `Calling ${providerConfig.name || providerConfig.model} for motion brief`);
  appendActivity(jobId, {
    stage: 'llm',
    message: `Calling ${providerConfig.name || providerConfig.model} (${providerConfig.format}) for motion brief`,
  });

  const llmResult = await callLLM({
    system: LOGO_BRIEF_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 1024,
  });
  if (!llmResult.text) throw new Error('LLM returned no text content');

  const brief = llmResult.text.trim();
  const dir = join(process.cwd(), '.compositions', 'logos', logoId);
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, 'brief.md');
  writeFileSync(briefPath, brief);
  writeSidecar(logoId, { lastPrompt: userPrompt, briefAt: new Date().toISOString() });
  rebuildCatalog();

  appendActivity(jobId, {
    stage: 'done',
    message: 'Motion brief written — ready to render',
    detail: `.compositions/logos/${logoId}/brief.md`,
  });

  completeJob(jobId, {
    outputUrls: [`/compositions/logos/${logoId}/brief.md`],
    metadata: {
      kind: 'logo-brief',
      logoId,
      briefPath: `/compositions/logos/${logoId}/brief.md`,
    },
  });
}

async function runLogoRender(ctx: {
  jobId: string;
  compositionId: string;
  prompt: string;
  inputs: LogoJobInputs | null;
  updateState: (agentState: string, progress: number, lastMessage?: string) => void;
}) {
  const { jobId, compositionId, prompt: jobPrompt, inputs, updateState } = ctx;
  const logoId = compositionId;
  const sidecar = readSidecar(logoId);
  const userPrompt = (inputs?.prompt ?? jobPrompt ?? sidecar.lastPrompt ?? '').trim();

  updateState('reading source', 5, `Logo render for ${logoId}`);
  const source = await readLogoSource(inputs ?? { prompt: userPrompt });

  // Brief: either provided in inputs, on disk from a prior logo-brief, or
  // synthesized inline (we let the render prompt do its own internal planning).
  let brief = inputs?.briefMarkdown?.trim() ?? '';
  if (!brief) {
    try {
      brief = readFileSync(join(process.cwd(), '.compositions', 'logos', logoId, 'brief.md'), 'utf8').trim();
    } catch {}
  }

  const userMessage = [
    brief ? '## Motion brief\n' + brief : '## Motion brief\n(none provided — infer from prompt)',
    '',
    userPrompt ? '## User prompt\n' + userPrompt : '',
    '',
    source.svg ? '## Source SVG\n\n```svg\n' + source.svg.slice(0, 14_000) + '\n```' : '## Source\n\n(no SVG — compose from description)',
  ].filter(Boolean).join('\n');

  const providerConfig = readProviderConfig();
  updateState('rendering hyperframe', 30, `Calling ${providerConfig.name || providerConfig.model} for Hyperframe HTML`);
  appendActivity(jobId, {
    stage: 'llm',
    message: `Calling ${providerConfig.name || providerConfig.model} (${providerConfig.format}) for Hyperframe HTML`,
  });

  const llmResult = await callLLM({
    system: LOGO_RENDER_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 8192,
  });
  if (!llmResult.text) throw new Error('LLM returned no text content');

  // Extract HTML — the model sometimes wraps it in a code fence despite instructions.
  let html = llmResult.text.trim();
  const fenceMatch = html.match(/```html\s*\n([\s\S]*?)\n```/i) ?? html.match(/```\s*\n([\s\S]*?)\n```/i);
  if (fenceMatch) html = fenceMatch[1].trim();
  if (!/^<!DOCTYPE html/i.test(html)) {
    // Last-resort: salvage the body if doctype is missing.
    const docMatch = html.match(/<html[\s\S]*<\/html>/i);
    if (docMatch) html = '<!DOCTYPE html>\n' + docMatch[0];
    else throw new Error('Render output did not contain a complete HTML document');
  }

  const dir = join(process.cwd(), '.compositions', 'logos', logoId);
  mkdirSync(dir, { recursive: true });
  const htmlPath = join(dir, 'Composition.html');
  writeFileSync(htmlPath, html);
  writeSidecar(logoId, { lastPrompt: userPrompt, renderedAt: new Date().toISOString() });

  // Mirror the HTML into public so the iframe can load it directly without
  // needing a custom route. Path: public/compositions/logos/<id>/Composition.html
  const publicDir = join(process.cwd(), 'public', 'compositions', 'logos', logoId);
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, 'Composition.html'), html);

  rebuildCatalog();

  appendActivity(jobId, {
    stage: 'done',
    message: 'Hyperframe rendered',
    detail: `/compositions/logos/${logoId}/Composition.html`,
  });

  completeJob(jobId, {
    outputUrls: [`/compositions/logos/${logoId}/Composition.html`],
    metadata: {
      kind: 'logo-render',
      logoId,
      compositionPath: `/compositions/logos/${logoId}/Composition.html`,
    },
  });
}
