# Premotion Scripts

Video analysis pipeline that extracts scenes, classifies activity, and produces an Edit Decision List (EDL) for Remotion compositions.

## Prerequisites

- [bun](https://bun.sh)
- [ffmpeg](https://ffmpeg.org) — `brew install ffmpeg`
- An API key for vision analysis (Anthropic by default, or any provider via the library API)

## Quick Start

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-...

# Analyze a video
bun run scripts/analyze-video.ts ~/path/to/video.mp4
```

Output goes to `public/demos/storyboard-{id}/`:
- `frame_001.jpg` ... `frame_NNN.jpg` — extracted keyframes
- `edl.json` — the Edit Decision List
- `.cache-*.json` — per-layer cache (delete to re-run a layer)

The EDL JSON is also printed to stdout for piping.

## Pipeline Layers

| Layer | What it does | Cached as |
|-------|-------------|-----------|
| 1. Scene detection | ffmpeg adaptive thresholds → keyframe extraction | `.cache-layer1-breaks.json` |
| 2. Pixel diff | Raw grayscale buffer comparison → active/idle/transition | `.cache-layer2-segments.json` |
| 3. Vision tagging | Each keyframe → vision model → tags + description | `.cache-layer3-tags.json` |
| 4. Editorial pass | All data → LLM → highlights, clip suggestions, dead time | `.cache-layer3-editorial.json` |

Each layer caches its output. Re-running skips completed layers automatically.

## Library API

The pipeline is importable as a library:

```typescript
import { analyzeVideo } from "./scripts/lib";

const edl = await analyzeVideo("/path/to/video.mp4");
```

### Custom vision provider

Swap in any vision model — MiniMax, OpenAI, or any MCP tool:

```typescript
import { analyzeVideo, type VisionProvider } from "./scripts/lib";

const minimax: VisionProvider = async (framePath, prompt) => {
  const result = await mcp.understand_image({ image_source: framePath, prompt });
  return JSON.parse(result);
};

const edl = await analyzeVideo("video.mp4", { vision: minimax });
```

### Using individual primitives

```typescript
import {
  getVideoMeta,
  detectSceneBreaks,
  computeDiffSegments,
  tagFrames,
  editorialPass,
  createAnthropicVision,
} from "./scripts/lib";

const meta = getVideoMeta("video.mp4");
const breaks = detectSceneBreaks(meta, "./out");
const segments = computeDiffSegments(meta);
const tags = await tagFrames(breaks, segments, "./out", createAnthropicVision());
const editorial = await editorialPass(meta, breaks, segments, tags);
```

### Options

```typescript
analyzeVideo(inputPath, {
  vision?: VisionProvider,  // custom vision model (default: Anthropic Haiku)
  outDir?: string,          // output directory (default: auto-generated)
  skipVision?: boolean,     // skip layers 3+4 (frames + diffs only)
});
```

## EDL Output

The Edit Decision List contains everything needed to build a Remotion composition:

```json
{
  "source": "demo.mp4",
  "duration": 554.4,
  "resolution": "2550x1440",
  "scenes": [{ "index": 1, "start": 0, "end": 10.5, "description": "...", "contentType": "ui-demo" }],
  "highlights": [{ "time": 142, "reason": "...", "frameFile": "frame_015.jpg" }],
  "suggestedClips": [{ "start": 135, "end": 200, "title": "...", "reason": "..." }],
  "deadTime": [{ "start": 50, "end": 65, "duration": 15, "reason": "Static screen" }]
}
```
