import { getDb, updateJobStatus, updateJobAgent, completeJob, failJob, appendActivity } from './db';
import type { JobKind } from './types';
import { readProviderConfig, type ProviderConfig } from '@/lib/provider';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

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

## Revision jobs

When the job kind is "revise", you'll receive the current Composition.tsx source and timestamped review notes.
Your job is to produce a new composition plan that addresses the feedback while preserving the parts that work.
Parse the existing TSX to understand the current clip selection, timing, and structure — then apply the reviewer's notes.
Common feedback types: FEEDBACK (general notes), ZOOM (add/adjust zoom on a region).

Respond with ONLY the JSON object, no markdown fences, no explanation.`;

// ── Build the user message for the LLM ──────────────────────────

function buildUserMessage(ctx: {
  prompt: string;
  inputs: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  kind: JobKind;
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

    if (ctx.kind === 'revise') {
      const originalSource = ctx.inputs.originalSource as string | undefined;
      const reviewNotes = ctx.inputs.reviewNotes as string | undefined;
      if (originalSource) {
        parts.push(`\n## Current Composition Source (TSX)\nRevise this composition based on the feedback below. Keep the same clips and structure unless the feedback says otherwise.\n\n\`\`\`tsx\n${originalSource}\n\`\`\``);
      }
      if (reviewNotes) {
        parts.push(`\n## Review Feedback\n${reviewNotes}`);
      }
    }

    const skipKeys = new Set(['clips', 'audio', 'originalSource', 'reviewNotes']);
    const otherKeys = Object.keys(ctx.inputs).filter(k => !skipKeys.has(k));
    if (otherKeys.length > 0) {
      parts.push(`\n## Additional Inputs`);
      for (const key of otherKeys) {
        parts.push(`- ${key}: ${JSON.stringify(ctx.inputs[key])}`);
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

// ── Parse + validate the LLM response ───────────────────────────

function parsePlan(raw: string): CompositionPlan {
  // Strip markdown fences if the model wraps them
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  }

  const plan = JSON.parse(cleaned) as CompositionPlan;

  // Validate required fields
  if (!plan.title || typeof plan.title !== 'string') {
    throw new Error('Plan missing title');
  }
  if (!plan.clips || !Array.isArray(plan.clips)) {
    throw new Error('Plan missing clips array');
  }
  if (typeof plan.durationSec !== 'number' || plan.durationSec <= 0) {
    throw new Error('Plan has invalid durationSec');
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

  return `// Auto-generated composition for ${compositionId}
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
  const fadeIn = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [clipDurationFrames - TRANSITION_FRAMES, clipDurationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = fadeIn * fadeOut;

  // Zoom
  let scale = 1;
  let originX = 50;
  let originY = 50;
  if (clip.zoom) {
    const zoomStartFrame = clip.zoom.startAtSec * fps;
    scale = interpolate(
      frame,
      [zoomStartFrame, clipDurationFrames],
      [1, clip.zoom.scale],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    originX = clip.zoom.originX;
    originY = clip.zoom.originY;
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
          title={${JSON.stringify(plan.title)}}
          subtitle={${JSON.stringify(plan.subtitle)}}
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
          title={${JSON.stringify(plan.title)}}
          tagline={${JSON.stringify(plan.tagline)}}
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
  const outputPath = join(process.cwd(), 'out', `${compositionId}.mp4`);

  mkdirSync(join(process.cwd(), 'out'), { recursive: true });

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
    // ── Stage 1: Collect inputs ─────────────────────────────
    updateState('collecting inputs', 5, `Reading ${kind} job for ${compositionId}`);

    const clips = (inputs?.clips as string[] | undefined) ?? [];
    const audio = (inputs?.audio as string[] | undefined) ?? [];
    const aspectRatio = (params?.aspectRatio as string | undefined) ?? '16:9';
    const durationSec = (params?.durationSec as number | undefined);

    appendActivity(jobId, {
      stage: 'inputs',
      message: `${clips.length} clip${clips.length !== 1 ? 's' : ''}, ${audio.length} audio, aspect ${aspectRatio}`,
      detail: clips.join(', '),
    });

    console.log(`[worker] Job ${jobId}: ${clips.length} clips, ${audio.length} audio, aspect=${aspectRatio}`);

    // ── Stage 2: Call LLM to plan the composition ───────────
    updateState('planning composition', 15, `Sending prompt to LLM with ${clips.length} clips`);

    const userMessage = buildUserMessage({ prompt, inputs, params, kind });
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
      plan = parsePlan(llmResult.text);
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
      },
    });

  } catch (err: any) {
    console.error(`[worker] Job ${jobId} failed:`, err);
    appendActivity(jobId, { stage: 'error', message: err.message || String(err) });
    failJob(jobId, { message: err.message || String(err) });
    throw err;
  }
}
