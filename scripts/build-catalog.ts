#!/usr/bin/env bun
/**
 * build-catalog.ts
 * Walks stage directories (source, wip, final), reads EDLs and transcripts,
 * runs ffprobe for metadata, and writes public/catalog-data.json.
 */

import { readdir, stat } from "node:fs/promises";
import { join, basename, extname, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const TRANSCRIPTS = join(PUBLIC, "transcripts");
const OUTPUT = join(PUBLIC, "catalog-data.json");

const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv"]);

type VideoStage = "source" | "wip" | "final";

const STAGE_ROOTS: { stage: VideoStage; dir: string }[] = [
  { stage: "source", dir: join(PUBLIC, "demos") },
  { stage: "wip", dir: join(PUBLIC, "wip") },
  { stage: "final", dir: join(PUBLIC, "out") },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function log(...args: any[]) {
  console.error(...args);
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

    const codec = videoStream?.codec_name || "unknown";
    return { duration: Math.round(duration * 100) / 100, resolution, fps, codec };
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

interface Storyboard {
  dirName: string;
  dirPath: string;
  edl: any | null;
  edlSource: string | null;
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
      const edlPath = join(dirPath, "edl.json");
      try {
        const edlFile = Bun.file(edlPath);
        if (await edlFile.exists()) {
          edl = await edlFile.json();
          edlSource = edl.source || null;
        }
      } catch {}

      const files = await readdir(dirPath);
      const frames = files
        .filter((f) => /^frame_\d+\.jpg$/i.test(f))
        .sort();

      storyboards.push({ dirName: entry, dirPath, edl, edlSource, frameCount: frames.length, frames });
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

// ── build catalog ───────────────────────────────────────────────────────────

const BATCH_SIZE = 8;

async function buildCatalog() {
  const startTime = Date.now();
  log("Building catalog...");

  const [videoFiles, storyboards, transcripts] = await Promise.all([
    scanAllVideos(),
    scanStoryboards(),
    loadTranscripts(),
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

  const catalog = {
    meta: {
      generatedAt: new Date().toISOString(),
      videoCount: videos.length,
    },
    videos,
    orphanStoryboards,
  };

  await Bun.write(OUTPUT, JSON.stringify(catalog, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nDone in ${elapsed}s`);
  log(`  Videos: ${videos.length} (source: ${stageCounts.source}, wip: ${stageCounts.wip}, final: ${stageCounts.final})`);
  log(`  With storyboards: ${matchedStoryboards.size}`);
  log(`  Orphan storyboards: ${orphanStoryboards.length}`);
  log(`  Output: ${OUTPUT}`);
}

buildCatalog().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
