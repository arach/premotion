/**
 * Ingest — one-shot iPhone screen recording ingestion
 *
 * Usage:
 *   bun run ingest <video-file> [--name <slug>] [--app <app-name>] [--frames-only]
 *
 * Examples:
 *   bun run ingest ~/Downloads/ScreenRecording_04-03-2026\ 14-22-01_1.MP4 --name amplink-voice --app amplink
 *   bun run ingest ~/Downloads/RPReplay_Final1712345678.MP4 --app dispatch
 *   bun run ingest latest                        # grabs most recent screen recording from ~/Downloads
 *
 * What it does:
 *   1. Finds the video (supports "latest" to auto-detect newest ScreenRecording/RPReplay in ~/Downloads)
 *   2. Probes metadata (resolution, fps, duration, portrait vs landscape)
 *   3. Copies to public/demos/{name}.mp4 with a clean slug
 *   4. Runs the full analysis pipeline (scene detect, pixel diff, vision tagging)
 *   5. Prints a summary with clip suggestions
 */

import { execSync } from "child_process";
import { existsSync, copyFileSync, readdirSync, statSync, readFileSync } from "fs";
import { basename, join, resolve, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { analyzeVideo, getVideoMeta, log, formatTime } from "./lib/index.ts";

// Load .env.local
try {
	const envContent = readFileSync(resolve(import.meta.dirname || ".", "../.env.local"), "utf-8");
	for (const line of envContent.split("\n")) {
		const match = line.match(/^export\s+(\w+)=(.+)$/) || line.match(/^(\w+)=(.+)$/);
		if (match && !process.env[match[1]]) {
			process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
		}
	}
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEMOS_DIR = join(__dirname, "..", "public/demos");
const DOWNLOADS = join(process.env.HOME!, "Downloads");

// ── Parse args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const framesOnly = args.includes("--frames-only");
const nameIdx = args.indexOf("--name");
const appIdx = args.indexOf("--app");
const customName = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
const appName = appIdx >= 0 ? args[appIdx + 1] : undefined;
const inputArg = args.find(a => !a.startsWith("--") && a !== customName && a !== appName);

if (!inputArg) {
	log(`
╔══════════════════════════════════════════════╗
║  PREMOTION — Screen Recording Ingest         ║
╚══════════════════════════════════════════════╝

Usage: bun run ingest <video-file> [options]

  <video-file>     Path to video, or "latest" to auto-detect
  --name <slug>    Override output filename (default: auto from source)
  --app <name>     App name prefix (e.g. amplink, dispatch)
  --frames-only    Skip vision API, local analysis only

Examples:
  bun run ingest latest --app amplink
  bun run ingest ~/Downloads/ScreenRecording*.MP4 --name amplink-chat
  bun run ingest /path/to/recording.mp4 --frames-only
`);
	process.exit(1);
}

// ── Find the video ──────────────────────────────────────────────────

function findLatestScreenRecording(): string {
	const patterns = [/^ScreenRecording/i, /^RPReplay/i, /^screen[\s_-]?recording/i];
	const videoExts = new Set([".mp4", ".mov", ".MP4", ".MOV"]);

	const files = readdirSync(DOWNLOADS)
		.filter(f => {
			const ext = extname(f);
			if (!videoExts.has(ext)) return false;
			return patterns.some(p => p.test(f));
		})
		.map(f => ({
			name: f,
			path: join(DOWNLOADS, f),
			mtime: statSync(join(DOWNLOADS, f)).mtimeMs,
		}))
		.sort((a, b) => b.mtime - a.mtime);

	if (files.length === 0) {
		log("Error: No screen recordings found in ~/Downloads");
		log("  Looking for: ScreenRecording*, RPReplay* (.mp4/.mov)");
		process.exit(1);
	}

	log(`  Found ${files.length} screen recording(s), using latest:`);
	log(`  → ${files[0].name} (${new Date(files[0].mtime).toLocaleString()})`);
	return files[0].path;
}

let sourcePath: string;
if (inputArg.toLowerCase() === "latest") {
	sourcePath = findLatestScreenRecording();
} else {
	const expanded = inputArg.replace(/^~\//, `${process.env.HOME}/`);
	sourcePath = resolve(expanded);
}

if (!existsSync(sourcePath)) {
	log(`Error: File not found: ${sourcePath}`);
	process.exit(1);
}

// ── Probe metadata ──────────────────────────────────────────────────

log(`\n╔══════════════════════════════════════════════╗`);
log(`║  PREMOTION — Screen Recording Ingest         ║`);
log(`╚══════════════════════════════════════════════╝\n`);

log(`Source: ${sourcePath}\n`);

const meta = getVideoMeta(sourcePath);
const isPortrait = meta.height > meta.width;
const aspectLabel = isPortrait ? "portrait" : "landscape";

log(`  Resolution:  ${meta.width}x${meta.height} (${aspectLabel})`);
log(`  FPS:         ${meta.fps}`);
log(`  Duration:    ${formatTime(meta.duration)} (${Math.round(meta.duration)}s)`);
log(`  Format:      ${isPortrait ? "iPhone screen recording" : "Desktop capture"}`);

// ── Build output name ───────────────────────────────────────────────

function buildSlug(source: string): string {
	let name = basename(source, extname(source));

	// Clean up common iPhone recording patterns
	name = name
		.replace(/^ScreenRecording[_\s-]*/i, "")
		.replace(/^RPReplay[_\s-]*Final/i, "")
		.replace(/^screen[\s_-]*recording[\s_-]*/i, "");

	// Convert date patterns: 04-03-2026 → 2026-04-03
	name = name.replace(/(\d{2})-(\d{2})-(\d{4})/, "$3-$1-$2");

	// Clean up time stamps and random suffixes
	name = name
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-zA-Z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase()
		.substring(0, 40);

	return name || "recording";
}

let slug: string;
if (customName) {
	slug = customName.replace(/\s+/g, "-").toLowerCase();
} else if (appName) {
	// Use source file's mtime for the timestamp to avoid collisions
	const mtime = statSync(sourcePath).mtime;
	const date = mtime.toISOString().slice(0, 10);
	const time = mtime.toTimeString().slice(0, 5).replace(":", "");
	slug = `${appName}-${date}-${time}`;
} else {
	slug = buildSlug(sourcePath);
}

const destFilename = `${slug}.mp4`;
const destPath = join(DEMOS_DIR, destFilename);

log(`\n  Slug:        ${slug}`);
log(`  Dest:        public/demos/${destFilename}`);

// ── Copy to demos ───────────────────────────────────────────────────

if (existsSync(destPath)) {
	log(`\n  ⚠ File already exists at destination, overwriting`);
}

log(`\n  Copying to public/demos/...`);
copyFileSync(sourcePath, destPath);
log(`  → Done (${(statSync(destPath).size / 1024 / 1024).toFixed(1)} MB)`);

// ── Run analysis pipeline ───────────────────────────────────────────

const storyboardDir = join(DEMOS_DIR, `storyboard-${slug}`);

log("");
const edl = await analyzeVideo(destPath, {
	outDir: storyboardDir,
	skipVision: framesOnly,
});

// ── Print summary ───────────────────────────────────────────────────

log(`\n╔══════════════════════════════════════════════╗`);
log(`║  Ingest Complete                             ║`);
log(`╚══════════════════════════════════════════════╝`);

log(`
  Video:       public/demos/${destFilename}
  Storyboard:  public/demos/storyboard-${slug}/
  EDL:         public/demos/storyboard-${slug}/edl.json

  Scenes:      ${edl.scenes.length}
  Active:      ${formatTime(edl.stats.activeTime)} / Idle: ${formatTime(edl.stats.idleTime)}
  Frames:      ${edl.stats.framesAnalyzed} analyzed`);

if (isPortrait) {
	log(`
  ── iPhone Quick Start ─────────────────────
  Use in a composition with IPhoneFrame:

    <IPhoneFrame phoneSizePct={0.9}>
      <OffthreadVideo
        src={staticFile("demos/${destFilename}")}
        startFrom={Math.floor(SECONDS * fps)}
      />
    </IPhoneFrame>`);
}

if (edl.suggestedClips?.length) {
	log(`\n  ── Suggested Clips ────────────────────────`);
	for (const clip of edl.suggestedClips) {
		log(`    "${clip.title}" (${formatTime(clip.start)} → ${formatTime(clip.end)})`);
		log(`      ${clip.reason}`);
	}
}

if (edl.deadTime?.length) {
	log(`\n  ── Dead Time ──────────────────────────────`);
	for (const dt of edl.deadTime) {
		const dur = dt.duration || Math.round(dt.end - dt.start);
		log(`    ${formatTime(dt.start)} → ${formatTime(dt.end)} (${dur}s): ${dt.reason}`);
	}
}

log("");
