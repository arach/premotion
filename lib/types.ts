export interface VisionTag {
  frameFile: string;
  time: number;
  tags: string[];
  description: string;
  contentType: string;
  provider?: string;
  model?: string;
  prompt?: string;
  rawText?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface Scene {
  index?: number;
  start?: number;
  end?: number;
  time?: number;
  description: string;
  tags?: string[];
  contentType?: string;
  activity?: string;
  frameFile?: string;
  frameKind?: string;
  score?: number;
  motionArea?: string;
  quadrants?: Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>;
}

export interface EdlStats {
  totalSceneBreaks: number;
  activeTime: number;
  idleTime: number;
  transitionTime: number;
  framesAnalyzed: number;
  estimatedTokens: number;
}

export interface Clip {
  start: number;
  end: number;
  title: string;
  reason: string;
}

export interface Highlight {
  time: number;
  reason: string;
  frameFile?: string;
}

export interface FrameOverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameOverlay {
  provider: string;
  label: string;
  rect: FrameOverlayRect;
  confidence?: string;
  note?: string;
  source?: string;
}

export interface DeadTime {
  start: number;
  end: number;
  duration?: number;
  reason: string;
}

export interface Edl {
  source: string;
  duration: number;
  resolution: string;
  fps: number;
  analyzedAt: string;
  scenes: Scene[];
  highlights: Highlight[];
  suggestedClips: Clip[];
  deadTime: DeadTime[];
  stats: EdlStats;
  storyboardDir: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

export type VideoStage = "source" | "wip" | "final";

export interface Video {
  id: string;
  filename: string;
  sourcePath: string | null;
  demosPath: string | null;
  capturedAt: string | null;
  resolution: string;
  fps: number;
  duration: number;
  codec: string;
  sizeMB: number;
  app: string;
  tags: string[];
  description: string;
  scenes: Scene[];
  storyboardDir: string | null;
  analysisStatus: string;
  composition: string | null;
  reelCandidate: boolean;
  note?: string;
  edl?: Edl;
  visionTags?: VisionTag[];
  frameOverlays?: Record<string, FrameOverlay[]>;
  frameCount?: number;
  frames?: string[];
  transcript?: Transcript;
  srt?: string;
  stage?: VideoStage;
  videoUrl?: string;
}

export type ReviewNoteKind = "feedback" | "zoom";

export interface ReviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReviewNote {
  id: string;
  time: number | null;
  endTime?: number;
  kind: ReviewNoteKind;
  rect?: ReviewRect;
  comment: string;
  createdAt: string;
}

export interface OrphanStoryboard {
  storyboardDir: string;
  frameCount: number;
  frames: string[];
  edl: Edl | null;
  visionTags: VisionTag[] | null;
}

export interface AudioAsset {
  id: string;
  filename: string;
  sourcePath: string | null;
  path: string;
  capturedAt: string;
  duration: number;
  codec: string;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  sizeMB: number;
  app: string;
  generated: boolean;
  provider?: string;
  model?: string;
  prompt?: string;
  lyrics?: string;
  instrumental?: boolean;
  songTitle?: string;
  styleTags?: string;
  lyricsGeneration?: Record<string, unknown>;
  compositionId?: string;
  parentTrackId?: string;
  revisionOf?: string;
  feedback?: string;
  request?: Record<string, unknown>;
  result?: Record<string, unknown>;
  sidecar?: Record<string, unknown>;
}

export type SnippetCategory = "capture" | "read" | "listen" | "explore";

export interface CuratedSnippet {
  id: string;
  source: string;
  timestamp: number;
  startFrom: number;
  category: SnippetCategory;
  rating: number;
  description: string;
  tags: string[];
  frameFile: string;
}

export interface CuratedSnippetsData {
  generatedAt: string;
  snippets: CuratedSnippet[];
}

export interface CatalogData {
  meta: { generatedAt: string; videoCount: number; audioCount?: number };
  videos: Video[];
  audioAssets?: AudioAsset[];
  orphanStoryboards?: OrphanStoryboard[];
  curatedSnippets?: CuratedSnippetsData;
}

export interface Filter {
  id: string;
  label: string;
}

export function formatTime(s: number | null | undefined): string {
  if (s == null) return "--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDuration(s: number | null | undefined): string {
  if (s == null) return "--";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}
