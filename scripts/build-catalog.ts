#!/usr/bin/env bun
/**
 * build-catalog.ts
 * Walks stage directories (source, wip, final), reads EDLs and transcripts,
 * runs ffprobe for metadata, and writes public/catalog-data.json.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, basename, dirname, extname, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const TRANSCRIPTS = join(PUBLIC, "transcripts");
const OUTPUT = join(PUBLIC, "catalog-data.json");
const FRAMES_REGISTRY = join(PUBLIC, "frames.json");
const LOGOS_INBOX = join(PUBLIC, "inbox/logos");
const LOGOS_COMPOSITIONS = join(ROOT, ".compositions/logos");

const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv", ".gif"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".aac", ".m4a", ".flac", ".ogg"]);
const TRACKS = join(PUBLIC, "tracks");

type VideoStage = "source" | "wip" | "final";

const STAGE_ROOTS: { stage: VideoStage; dir: string }[] = [
  { stage: "source", dir: join(PUBLIC, "demos") },
  { stage: "source", dir: join(PUBLIC, "inbox") },
  { stage: "wip", dir: join(PUBLIC, "wip") },
  { stage: "final", dir: join(PUBLIC, "out") },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function log(...args: any[]) {
  console.log(...args);
}

function slugify(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, "");
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferApp(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("talkie")) return "talkie";
  if (lower.includes("lattices")) return "lattices";
  if (lower.includes("hudson") || lower.includes("hud")) return "hudson";
  if (lower.includes("scout")) return "scout";
  if (lower.includes("amplink") || lower.includes("amp-")) return "amplink";
  if (lower.includes("plexus")) return "plexus";
  if (lower.includes("cleanshot")) return "screen-recording";
  if (lower.includes("screenrecording")) return "screen-recording";
  if (lower.includes("hype")) return "promo";
  return "other";
}

interface FfprobeResult {
  duration: number;
  resolution: string;
  fps: number;
  codec: string;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
}

async function ffprobe(filepath: string): Promise<FfprobeResult> {
  const proc = Bun.spawn(
    [
      "ffprobe",
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      filepath,
    ],
    { stdout: "pipe", stderr: "pipe" }
  );
  const text = await new Response(proc.stdout).text();
  await proc.exited;

  try {
    const data = JSON.parse(text);
    const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
    const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");
    const format = data.format || {};

    let duration = 0;
    if (format.duration) duration = parseFloat(format.duration);
    else if (videoStream?.duration) duration = parseFloat(videoStream.duration);

    let resolution = "unknown";
    if (videoStream) resolution = `${videoStream.width}x${videoStream.height}`;

    let fps = 0;
    if (videoStream?.avg_frame_rate) {
      const parts = videoStream.avg_frame_rate.split("/");
      if (parts.length === 2 && parseFloat(parts[1]) > 0) {
        fps = Math.round(parseFloat(parts[0]) / parseFloat(parts[1]));
      }
    }
    if ((!fps || fps > 240) && videoStream?.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split("/");
      if (parts.length === 2 && parseFloat(parts[1]) > 0) {
        fps = Math.round(parseFloat(parts[0]) / parseFloat(parts[1]));
      }
    }
    if ((!fps || fps > 240) && videoStream?.nb_frames && duration > 0) {
      fps = Math.round(parseInt(videoStream.nb_frames) / duration);
    }

    const codec = videoStream?.codec_name || audioStream?.codec_name || "unknown";
    const sampleRate = audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined;
    const channels = audioStream?.channels ? parseInt(audioStream.channels) : undefined;
    const bitrate = audioStream?.bit_rate
      ? parseInt(audioStream.bit_rate)
      : format.bit_rate
        ? parseInt(format.bit_rate)
        : undefined;
    return { duration: Math.round(duration * 100) / 100, resolution, fps, codec, sampleRate, channels, bitrate };
  } catch {
    return { duration: 0, resolution: "unknown", fps: 0, codec: "unknown" };
  }
}

// ── recursive video walk ────────────────────────────────────────────────────

interface VideoFile {
  filename: string;
  absolutePath: string;
  relativePath: string;
  stage: VideoStage;
}

async function walkDir(dir: string, stage: VideoStage, baseDir: string): Promise<VideoFile[]> {
  const results: VideoFile[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = join(dir, entry);
    const s = await stat(fullPath);

    if (s.isDirectory()) {
      if (entry.startsWith("storyboard-")) continue;
      results.push(...await walkDir(fullPath, stage, baseDir));
    } else {
      const ext = extname(entry).toLowerCase();
      if (!VIDEO_EXTS.has(ext)) continue;
      results.push({
        filename: entry,
        absolutePath: fullPath,
        relativePath: relative(PUBLIC, fullPath),
        stage,
      });
    }
  }

  return results;
}

async function scanAllVideos(): Promise<VideoFile[]> {
  const all: VideoFile[] = [];
  for (const { stage, dir } of STAGE_ROOTS) {
    log(`Scanning ${stage}: ${dir}`);
    const found = await walkDir(dir, stage, dir);
    log(`  → ${found.length} videos`);
    all.push(...found);
  }
  log(`Total: ${all.length} video files`);
  return all;
}

// ── scan storyboards ────────────────────────────────────────────────────────

// ── scan audio assets ───────────────────────────────────────────────────────

interface AudioAsset {
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
  compositionId?: string;
}

interface AudioFile {
  filename: string;
  absolutePath: string;
  relativePath: string;
}

async function walkAudio(dir: string): Promise<AudioFile[]> {
  const results: AudioFile[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = join(dir, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      results.push(...await walkAudio(fullPath));
      continue;
    }

    const ext = extname(entry).toLowerCase();
    if (!AUDIO_EXTS.has(ext)) continue;
    results.push({
      filename: entry,
      absolutePath: fullPath,
      relativePath: relative(PUBLIC, fullPath),
    });
  }

  return results;
}

async function loadTrackSidecar(audioPath: string): Promise<Record<string, any>> {
  const sidecarPath = audioPath.replace(/\.[^.]+$/, ".json");
  try {
    return await Bun.file(sidecarPath).json();
  } catch {
    return {};
  }
}

async function scanAudioAssets(): Promise<AudioAsset[]> {
  const files = await walkAudio(TRACKS);
  log(`Scanning music: ${TRACKS}`);
  log(`  → ${files.length} audio files`);

  const assets = await Promise.all(files.map(async (file) => {
    const [probe, fileStat, sidecar] = await Promise.all([
      ffprobe(file.absolutePath),
      stat(file.absolutePath),
      loadTrackSidecar(file.absolutePath),
    ]);

    const generated = file.relativePath.split(/[\\/]/).includes("generated") || sidecar.generated === true;
    return {
      id: sidecar.id || slugify(file.relativePath),
      filename: file.filename,
      sourcePath: null,
      path: file.relativePath,
      capturedAt: fileStat.mtime.toISOString(),
      duration: probe.duration,
      codec: probe.codec,
      sampleRate: probe.sampleRate ?? null,
      channels: probe.channels ?? null,
      bitrate: probe.bitrate ?? null,
      sizeMB: Math.round((fileStat.size / (1024 * 1024)) * 100) / 100,
      app: sidecar.app || inferApp(file.filename),
      generated,
      provider: sidecar.provider,
      model: sidecar.model,
      prompt: sidecar.prompt,
      lyrics: sidecar.lyrics,
      instrumental: sidecar.instrumental,
      songTitle: sidecar.songTitle || sidecar.lyricsGeneration?.song_title,
      styleTags: sidecar.styleTags || sidecar.lyricsGeneration?.style_tags,
      lyricsGeneration: sidecar.lyricsGeneration,
      compositionId: sidecar.compositionId,
      parentTrackId: sidecar.parentTrackId,
      revisionOf: sidecar.revisionOf,
      feedback: sidecar.feedback,
      request: sidecar.request,
      result: sidecar.result,
      sidecar,
    };
  }));

  return assets.sort((a, b) => {
    const diff = new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
    if (diff !== 0) return diff;
    return a.filename.localeCompare(b.filename);
  });
}

interface Storyboard {
  dirName: string;
  dirPath: string;
  edl: any | null;
  edlSource: string | null;
  visionTags: any[] | null;
  frameOverlays: Record<string, any[]> | null;
  frameCount: number;
  frames: string[];
}

async function scanStoryboards(): Promise<Storyboard[]> {
  const storyboards: Storyboard[] = [];

  for (const { dir } of STAGE_ROOTS) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.startsWith("storyboard-")) continue;
      const dirPath = join(dir, entry);
      const s = await stat(dirPath);
      if (!s.isDirectory()) continue;

      let edl: any = null;
      let edlSource: string | null = null;
      let visionTags: any[] | null = null;
      let frameOverlays: Record<string, any[]> | null = null;
      const edlPath = join(dirPath, "edl.json");
      try {
        const edlFile = Bun.file(edlPath);
        if (await edlFile.exists()) {
          edl = await edlFile.json();
          edlSource = edl.source || null;
        }
      } catch {}
      try {
        const tagsFile = Bun.file(join(dirPath, ".cache-layer3-tags.json"));
        if (await tagsFile.exists()) {
          const tags = await tagsFile.json();
          if (Array.isArray(tags)) visionTags = tags;
        }
      } catch {}
      try {
        const overlaysFile = Bun.file(join(dirPath, "frame-overlays.json"));
        if (await overlaysFile.exists()) {
          const overlays = await overlaysFile.json();
          if (overlays && typeof overlays === "object" && !Array.isArray(overlays)) {
            frameOverlays = overlays;
          }
        }
      } catch {}

      const files = await readdir(dirPath);
      const frames = files
        .filter((f) => /^frame_\d+\.jpg$/i.test(f))
        .sort();

      storyboards.push({ dirName: entry, dirPath, edl, edlSource, visionTags, frameOverlays, frameCount: frames.length, frames });
    }
  }

  log(`Found ${storyboards.length} storyboard directories`);
  return storyboards;
}

// ── scan transcripts ────────────────────────────────────────────────────────

interface TranscriptMatch {
  json: any | null;
  srt: string | null;
}

async function loadTranscripts(): Promise<Map<string, TranscriptMatch>> {
  const map = new Map<string, TranscriptMatch>();

  let files: string[];
  try {
    files = await readdir(TRANSCRIPTS);
  } catch {
    log("No transcripts directory found");
    return map;
  }

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext !== ".json" && ext !== ".srt") continue;

    const base = file.replace(/\.[^.]+$/, "");
    const slug = slugify(base);

    if (!map.has(slug)) map.set(slug, { json: null, srt: null });
    const entry = map.get(slug)!;

    const filePath = join(TRANSCRIPTS, file);
    try {
      if (ext === ".json") {
        const content = await Bun.file(filePath).json();
        if (content.text && content.segments) entry.json = content;
      } else if (ext === ".srt") {
        entry.srt = await Bun.file(filePath).text();
      }
    } catch {}
  }

  log(`Loaded ${map.size} transcript entries`);
  return map;
}

// ── matching ────────────────────────────────────────────────────────────────

function matchStoryboard(videoFilename: string, storyboards: Storyboard[]): Storyboard | null {
  for (const sb of storyboards) {
    if (sb.edlSource && sb.edlSource === videoFilename) return sb;
  }
  const videoSlug = slugify(videoFilename);
  for (const sb of storyboards) {
    const sbSlug = sb.dirName.replace(/^storyboard-/, "");
    if (sbSlug === videoSlug) return sb;
  }
  return null;
}

function matchTranscript(videoSlug: string, transcripts: Map<string, TranscriptMatch>): TranscriptMatch | null {
  if (transcripts.has(videoSlug)) return transcripts.get(videoSlug)!;
  for (const [tSlug, t] of transcripts) {
    if (tSlug.startsWith(videoSlug) || videoSlug.startsWith(tSlug)) return t;
  }
  return null;
}

// ── scan logo assets ────────────────────────────────────────────────────────

interface LogoSourceScan {
  kind: "svg" | "png" | "prompt-only";
  path?: string;
  filename?: string;
  prompt?: string;
}

interface LogoAssetScan {
  id: string;
  source: LogoSourceScan;
  capturedAt: string;
  compositionPath?: string;
  briefPath?: string;
  manifestPath?: string;
  manifestVersion?: string;
  hasRender: boolean;
  title?: string;
  lastPrompt?: string;
}

const LOGO_SOURCE_EXTS = new Set([".svg", ".png"]);

async function scanLogoSources(): Promise<Map<string, { kind: "svg" | "png"; path: string; filename: string; mtime: Date }>> {
  const out = new Map<string, { kind: "svg" | "png"; path: string; filename: string; mtime: Date }>();
  let entries: string[];
  try { entries = await readdir(LOGOS_INBOX); } catch { return out; }
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const full = join(LOGOS_INBOX, entry);
    const s = await stat(full);
    if (!s.isFile()) continue;
    const ext = extname(entry).toLowerCase();
    if (!LOGO_SOURCE_EXTS.has(ext)) continue;
    const id = entry.replace(/\.(svg|png)$/i, "");
    out.set(id, {
      kind: ext === ".svg" ? "svg" : "png",
      path: `/${relative(PUBLIC, full)}`,
      filename: entry,
      mtime: s.mtime,
    });
  }
  return out;
}

async function readLogoSidecar(id: string): Promise<Record<string, any>> {
  // .compositions/logos/<id>/sidecar.json — optional metadata persisted by the
  // upload route (prompt, title) or by job results.
  const sidecarPath = join(LOGOS_COMPOSITIONS, id, "sidecar.json");
  try {
    return JSON.parse(await readFile(sidecarPath, "utf8"));
  } catch {
    return {};
  }
}

async function scanLogoCompositions(): Promise<Map<string, { compositionPath?: string; briefPath?: string; manifestPath?: string; manifestVersion?: string; mtime?: Date }>> {
  const out = new Map<string, { compositionPath?: string; briefPath?: string; manifestPath?: string; manifestVersion?: string; mtime?: Date }>();
  let entries: string[];
  try { entries = await readdir(LOGOS_COMPOSITIONS); } catch { return out; }
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const dir = join(LOGOS_COMPOSITIONS, entry);
    let st;
    try { st = await stat(dir); } catch { continue; }
    if (!st.isDirectory()) continue;
    const htmlAbs = join(dir, "Composition.html");
    const briefAbs = join(dir, "brief.md");
    const manifestAbs = join(dir, "manifest.json");
    const has = async (p: string) => { try { await stat(p); return true; } catch { return false; } };
    const [hasHtml, hasBrief, hasManifest] = await Promise.all([has(htmlAbs), has(briefAbs), has(manifestAbs)]);
    let manifestVersion: string | undefined;
    if (hasManifest) {
      try {
        const m = JSON.parse(await readFile(manifestAbs, "utf8"));
        if (typeof m.version === "string") manifestVersion = m.version;
      } catch {}
    }
    out.set(entry, {
      compositionPath: hasHtml ? `/compositions/logos/${entry}/Composition.html` : undefined,
      briefPath: hasBrief ? `/compositions/logos/${entry}/brief.md` : undefined,
      manifestPath: hasManifest ? `/compositions/logos/${entry}/manifest.json` : undefined,
      manifestVersion,
      mtime: hasHtml ? (await stat(htmlAbs)).mtime : st.mtime,
    });
  }
  return out;
}

async function scanLogos(): Promise<LogoAssetScan[]> {
  const [sources, comps] = await Promise.all([scanLogoSources(), scanLogoCompositions()]);
  // Union of source ids and composition ids — every logo has at least one of the two.
  const ids = new Set<string>([...sources.keys(), ...comps.keys()]);
  log(`Scanning logos: ${LOGOS_INBOX}`);
  log(`  → ${ids.size} logo projects`);
  const assets: LogoAssetScan[] = [];
  for (const id of ids) {
    const src = sources.get(id);
    const comp = comps.get(id);
    const sidecar = await readLogoSidecar(id);
    const source: LogoSourceScan = src
      ? { kind: src.kind, path: src.path, filename: src.filename }
      : { kind: "prompt-only", prompt: typeof sidecar.prompt === "string" ? sidecar.prompt : undefined };
    const capturedAt = (src?.mtime ?? comp?.mtime ?? new Date()).toISOString();
    assets.push({
      id,
      source,
      capturedAt,
      compositionPath: comp?.compositionPath,
      briefPath: comp?.briefPath,
      manifestPath: comp?.manifestPath,
      manifestVersion: comp?.manifestVersion,
      hasRender: !!comp?.compositionPath,
      title: typeof sidecar.title === "string" ? sidecar.title : undefined,
      lastPrompt: typeof sidecar.lastPrompt === "string" ? sidecar.lastPrompt : undefined,
    });
  }
  assets.sort((a, b) => (b.capturedAt > a.capturedAt ? 1 : -1));
  return assets;
}

// ── build catalog ───────────────────────────────────────────────────────────

const BATCH_SIZE = 8;

async function buildCatalog() {
  const startTime = Date.now();
  log("Building catalog...");

  const [videoFiles, storyboards, transcripts, audioAssets, logos] = await Promise.all([
    scanAllVideos(),
    scanStoryboards(),
    loadTranscripts(),
    scanAudioAssets(),
    scanLogos(),
  ]);

  const matchedStoryboards = new Set<string>();
  const seenIds = new Map<string, number>();
  const videos: any[] = [];

  for (let i = 0; i < videoFiles.length; i += BATCH_SIZE) {
    const batch = videoFiles.slice(i, i + BATCH_SIZE);
    log(`  ffprobe batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(videoFiles.length / BATCH_SIZE)} (${batch.length} files)`);

    const results = await Promise.all(
      batch.map(async (vf) => {
        const probe = await ffprobe(vf.absolutePath);
        const fileStat = await stat(vf.absolutePath);
        const sizeMB = Math.round((fileStat.size / (1024 * 1024)) * 100) / 100;
        const capturedAt = fileStat.mtime.toISOString();

        let id = slugify(vf.filename);
        const count = seenIds.get(id) ?? 0;
        seenIds.set(id, count + 1);
        if (count > 0) id = `${id}-${count + 1}`;

        const app = inferApp(vf.filename);
        const sb = matchStoryboard(vf.filename, storyboards);
        if (sb) matchedStoryboards.add(sb.dirName);

        let analysisStatus = "none";
        if (sb) {
          if (sb.edl && sb.frameCount > 0) analysisStatus = "complete";
          else if (sb.frameCount > 0) analysisStatus = "frames-only";
        }

        const edlScenes = sb?.edl?.scenes || [];
        const tags: string[] = [];
        for (const scene of edlScenes) {
          if (scene.tags) tags.push(...scene.tags);
        }
        const uniqueTags = [...new Set(tags)];

        const description = sb?.edl?.description || vf.filename.replace(/\.[^.]+$/, "");
        const reelCandidate = (sb?.edl?.suggestedClips?.length || 0) > 0;
        const transcript = matchTranscript(id, transcripts);

        const video: any = {
          id,
          filename: vf.filename,
          sourcePath: null,
          demosPath: vf.relativePath,
          capturedAt,
          resolution: probe.resolution,
          fps: probe.fps,
          duration: probe.duration,
          codec: probe.codec,
          sizeMB,
          app,
          tags: uniqueTags,
          description,
          scenes: edlScenes,
          storyboardDir: sb?.dirName || null,
          analysisStatus,
          composition: sb?.edl?.composition || null,
          reelCandidate,
          stage: vf.stage,
        };

        if (sb) {
          video.frameCount = sb.frameCount;
          video.frames = sb.frames;
          video.edl = sb.edl;
          if (sb.visionTags?.length) video.visionTags = sb.visionTags;
          if (sb.frameOverlays) video.frameOverlays = sb.frameOverlays;
        }
        if (transcript?.json) video.transcript = transcript.json;
        if (transcript?.srt) video.srt = transcript.srt;

        video.videoUrl = vf.relativePath;

        return video;
      })
    );

    videos.push(...results);
  }

  videos.sort((a, b) => {
    if (a.capturedAt && b.capturedAt) {
      const diff = new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
      if (diff !== 0) return diff;
    }
    return a.filename.localeCompare(b.filename);
  });

  const orphanStoryboards = storyboards
    .filter((sb) => !matchedStoryboards.has(sb.dirName))
    .map((sb) => ({
      dirName: sb.dirName,
      edlSource: sb.edlSource,
      frameCount: sb.frameCount,
      hasEdl: !!sb.edl,
    }));

  const stageCounts = { source: 0, wip: 0, final: 0 };
  for (const v of videos) stageCounts[v.stage as VideoStage]++;

  let frames: unknown[] = [];
  try {
    frames = JSON.parse(await Bun.file(FRAMES_REGISTRY).text());
  } catch {
    // frames.json missing or invalid — omit frames from output
  }

  const catalog = {
    meta: {
      generatedAt: new Date().toISOString(),
      videoCount: videos.length,
      audioCount: audioAssets.length,
      logoCount: logos.length,
    },
    videos,
    audioAssets,
    logos,
    orphanStoryboards,
    ...(frames.length ? { frames } : {}),
  };

  await Bun.write(OUTPUT, JSON.stringify(catalog, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nDone in ${elapsed}s`);
  log(`  Videos: ${videos.length} (source: ${stageCounts.source}, wip: ${stageCounts.wip}, final: ${stageCounts.final})`);
  log(`  Audio: ${audioAssets.length}`);
  log(`  With storyboards: ${matchedStoryboards.size}`);
  log(`  Orphan storyboards: ${orphanStoryboards.length}`);
  log(`  Output: ${OUTPUT}`);
}

buildCatalog().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
