import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { basename, join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
	analyzeVideo,
	log,
	formatTime,
} from "./lib/index.ts";

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
const PUBLIC_DIR = join(__dirname, "..", "public/demos");

const inputPath = process.argv[2];

if (!inputPath) {
	log("Usage: bun run analyze <video-file>");
	log("  e.g. bun run analyze ~/tmp/demo.mp4");
	process.exit(1);
}

const expanded = inputPath.replace(/^~\//, `${process.env.HOME}/`);
const resolved = resolve(expanded);
if (!existsSync(resolved)) {
	log(`Error: File not found: ${resolved}`);
	process.exit(1);
}

try {
	execSync("which ffmpeg", { stdio: "pipe" });
} catch {
	log("Error: ffmpeg not found. Install with: brew install ffmpeg");
	process.exit(1);
}

const id = basename(resolved, ".mp4")
	.replace(/\s+/g, "-")
	.replace(/[^a-zA-Z0-9-_.]/g, "")
	.toLowerCase()
	.substring(0, 40);
const outDir = join(PUBLIC_DIR, `storyboard-${id}`);

log(`\n╔══════════════════════════════════════════╗`);
log(`║  PREMOTION — Video Analyzer              ║`);
log(`╚══════════════════════════════════════════╝`);

const edl = await analyzeVideo(resolved, { outDir });

log(`\n── Results ──────────────────────────────`);
log(`  Scenes:      ${edl.scenes.length}`);
log(`  Active:      ${formatTime(edl.stats.activeTime)} / Idle: ${formatTime(edl.stats.idleTime)}`);
log(`  Dead time:   ${(edl.deadTime || []).length} segments (${(edl.deadTime || []).reduce((t, d) => t + (d.duration || d.end - d.start), 0)}s)`);
log(`  Highlights:  ${(edl.highlights || []).length}`);
log(`  Clips:       ${(edl.suggestedClips || []).length}`);
log(`  Tokens:      ~${edl.stats.estimatedTokens} (est. $${(edl.stats.estimatedTokens * 0.000003).toFixed(4)})`);

if (edl.suggestedClips?.length) {
	log(`\n── Suggested Clips ─────────────────────`);
	for (const clip of edl.suggestedClips) {
		log(`  "${clip.title}" (${formatTime(clip.start)} → ${formatTime(clip.end)})`);
		log(`    ${clip.reason}`);
	}
}

if (edl.deadTime?.length) {
	log(`\n── Dead Time ───────────────────────────`);
	for (const dt of edl.deadTime) {
		log(`  ${formatTime(dt.start)} → ${formatTime(dt.end)} (${dt.duration || Math.round(dt.end - dt.start)}s): ${dt.reason}`);
	}
}

log(`\n  EDL written to: ${join(outDir, "edl.json")}`);
log(`  Storyboard:    ${outDir}/\n`);

console.log(JSON.stringify(edl, null, 2));
