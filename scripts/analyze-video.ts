import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
// Load .env.local if present
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
const PROJECT_ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(PROJECT_ROOT, "public/demos");

// ── Types ──────────────────────────────────────────────────

interface VideoMeta {
	path: string;
	filename: string;
	duration: number;
	fps: number;
	width: number;
	height: number;
}

interface SceneBreak {
	time: number;
	score: number;
	frameFile: string;
	frameIndex: number;
}

interface DiffSegment {
	start: number;
	end: number;
	avgDiff: number;
	classification: "active" | "idle" | "transition";
}

interface FrameTag {
	frameFile: string;
	time: number;
	tags: string[];
	description: string;
	contentType: string;
}

interface EditDecisionList {
	source: string;
	duration: number;
	resolution: string;
	fps: number;
	analyzedAt: string;
	scenes: Array<{
		index: number;
		start: number;
		end: number;
		description: string;
		tags: string[];
		contentType: string;
		activity: string;
	}>;
	highlights: Array<{ time: number; reason: string; frameFile: string }>;
	suggestedClips: Array<{ start: number; end: number; title: string; reason: string }>;
	deadTime: Array<{ start: number; end: number; duration: number; reason: string }>;
	stats: {
		totalSceneBreaks: number;
		activeTime: number;
		idleTime: number;
		transitionTime: number;
		framesAnalyzed: number;
		estimatedTokens: number;
	};
	storyboardDir: string;
}

// ── LLM Config ────────────────────────────────────────────
// Set in .env.local:
//   ANTHROPIC_API_KEY   — API key
//   ANTHROPIC_BASE_URL  — API endpoint (optional, for compatible providers)
//   LLM_MODEL           — model name (default: claude-haiku-4-5-20251001)

const LLM_MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";

function createClient(): Anthropic {
	return new Anthropic();
}

// ── Helpers ────────────────────────────────────────────────

function run(cmd: string): string {
	try {
		return execSync(cmd, {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			maxBuffer: 100 * 1024 * 1024,
		});
	} catch (e: any) {
		return e?.stderr?.toString() || e?.stdout?.toString() || "";
	}
}

function log(msg: string) {
	console.error(msg);
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.round(seconds % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Cache ──────────────────────────────────────────────────

function cacheGet<T>(outDir: string, key: string): T | null {
	const path = join(outDir, `.cache-${key}.json`);
	if (existsSync(path)) {
		try {
			return JSON.parse(readFileSync(path, "utf-8"));
		} catch {}
	}
	return null;
}

function cacheSet(outDir: string, key: string, data: any): void {
	writeFileSync(join(outDir, `.cache-${key}.json`), JSON.stringify(data, null, 2));
}

// ── Layer 1: Scene Detection ──────────────────────────────

function getVideoMeta(filepath: string): VideoMeta {
	const duration = parseFloat(
		run(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`)
	);
	const streamInfo = run(
		`ffprobe -v quiet -show_entries stream=width,height,r_frame_rate -of csv=p=0 "${filepath}"`
	).trim().split("\n")[0];
	const parts = streamInfo.split(",");
	const width = parseInt(parts[0]) || 1920;
	const height = parseInt(parts[1]) || 1080;
	const fpsParts = (parts[2] || "30/1").split("/");
	const fps = Math.round(parseInt(fpsParts[0]) / (parseInt(fpsParts[1]) || 1));

	return {
		path: filepath,
		filename: basename(filepath),
		duration,
		fps,
		width,
		height,
	};
}

function detectSceneBreaks(meta: VideoMeta, outDir: string): SceneBreak[] {
	log("\nLayer 1: Scene detection...");

	// Try multiple thresholds — screen recordings have subtler changes
	const thresholds = [0.08, 0.04, 0.02];
	let breaks: { time: number; score: number }[] = [];

	for (const threshold of thresholds) {
		const raw = run(
			`ffmpeg -i "${meta.path}" -vf "select='gt(scene,${threshold})',showinfo" -f null - 2>&1`
		);

		const parsed: { time: number; score: number }[] = [];
		for (const match of raw.matchAll(/pts_time:([\d.]+)/g)) {
			const time = parseFloat(match[1]);
			// Find the scene score near this line
			const idx = raw.indexOf(match[0]);
			const nearby = raw.substring(Math.max(0, idx - 200), idx + 200);
			const scoreMatch = nearby.match(/scene_score=([\d.]+)/);
			const score = scoreMatch ? parseFloat(scoreMatch[1]) : threshold;
			parsed.push({ time, score });
		}

		// Deduplicate — only keep breaks that are at least 1 second apart
		const deduped: { time: number; score: number }[] = [];
		for (const b of parsed) {
			if (deduped.length === 0 || b.time - deduped[deduped.length - 1].time >= 1.0) {
				deduped.push(b);
			} else if (b.score > deduped[deduped.length - 1].score) {
				deduped[deduped.length - 1] = b;
			}
		}

		breaks = deduped;

		// If we got a reasonable number of breaks, use them
		if (breaks.length >= 5 && breaks.length <= 80) {
			log(`  → threshold ${threshold}: found ${breaks.length} scene breaks`);
			break;
		}
		log(`  → threshold ${threshold}: found ${breaks.length} (${breaks.length < 5 ? "too few" : "too many"}, trying next)`);
	}

	// Always include first frame and add anchor frames every 15s for gaps
	const anchors: { time: number; score: number }[] = [{ time: 0, score: 1.0 }];
	const breakTimes = new Set(breaks.map(b => Math.round(b.time)));

	for (let t = 15; t < meta.duration - 5; t += 15) {
		const nearbyBreak = breaks.find(b => Math.abs(b.time - t) < 5);
		if (!nearbyBreak) {
			anchors.push({ time: t, score: 0.01 });
		}
	}

	const allBreaks = [...anchors, ...breaks]
		.sort((a, b) => a.time - b.time)
		.filter((b, i, arr) => i === 0 || b.time - arr[i - 1].time >= 1.0);

	// Cap at 60 frames max
	const selected = allBreaks.length > 60
		? allBreaks.filter((_, i) => i % Math.ceil(allBreaks.length / 60) === 0)
		: allBreaks;

	// Extract frames
	log(`  → Extracting ${selected.length} keyframes...`);
	const result: SceneBreak[] = [];

	for (let i = 0; i < selected.length; i++) {
		const b = selected[i];
		const frameFile = `frame_${String(i + 1).padStart(3, "0")}.jpg`;
		const outPath = join(outDir, frameFile);

		run(
			`ffmpeg -y -ss ${b.time} -i "${meta.path}" -frames:v 1 -vf "scale=640:-1" -pix_fmt yuvj420p -q:v 2 "${outPath}" 2>/dev/null`
		);

		result.push({
			time: b.time,
			score: b.score,
			frameFile,
			frameIndex: i + 1,
		});
	}

	log(`  → ${result.length} keyframes saved to ${basename(outDir)}/`);
	return result;
}

// ── Layer 2: Pixel Diff Scoring ───────────────────────────

function computeDiffSegments(meta: VideoMeta): DiffSegment[] {
	log("\nLayer 2: Pixel diff analysis...");

	// Sample at 2fps, downscale to tiny grayscale, compare raw pixel buffers
	const frameW = 80;
	const frameH = 45;
	const frameSize = frameW * frameH;

	// Extract raw grayscale frames
	const rawBuf = execSync(
		`ffmpeg -i "${meta.path}" -vf "fps=2,scale=${frameW}:${frameH},format=gray" -f rawvideo -pix_fmt gray pipe:1 2>/dev/null`,
		{ maxBuffer: 200 * 1024 * 1024 },
	);

	const totalFrames = Math.floor(rawBuf.length / frameSize);
	if (totalFrames < 2) {
		log("  → Not enough frames for diff analysis");
		return [{ start: 0, end: meta.duration, avgDiff: 0.5, classification: "active" }];
	}

	log(`  → Comparing ${totalFrames} frames (${frameW}x${frameH} grayscale)...`);

	// Compute per-pixel diff between consecutive frames
	const diffs: { time: number; diff: number }[] = [];
	for (let i = 1; i < totalFrames; i++) {
		const prev = rawBuf.subarray((i - 1) * frameSize, i * frameSize);
		const curr = rawBuf.subarray(i * frameSize, (i + 1) * frameSize);
		let totalDiff = 0;
		for (let p = 0; p < frameSize; p++) {
			totalDiff += Math.abs(curr[p] - prev[p]);
		}
		const normalized = totalDiff / (frameSize * 255);
		diffs.push({ time: (i / 2), diff: normalized }); // 2fps → time in seconds
	}

	// Window-average diffs per second
	const secondDiffs: { sec: number; avgDiff: number }[] = [];
	for (let sec = 0; sec < meta.duration; sec++) {
		const inRange = diffs.filter(d => d.time >= sec && d.time < sec + 1);
		if (inRange.length > 0) {
			const avg = inRange.reduce((sum, d) => sum + d.diff, 0) / inRange.length;
			secondDiffs.push({ sec, avgDiff: avg });
		} else {
			secondDiffs.push({ sec, avgDiff: 0 });
		}
	}

	// Classify and merge into segments
	const segments: DiffSegment[] = [];
	let currentClass: DiffSegment["classification"] | null = null;
	let segStart = 0;
	let segDiffs: number[] = [];

	for (const sd of secondDiffs) {
		const cls: DiffSegment["classification"] =
			sd.avgDiff < 0.001 ? "idle" :
			sd.avgDiff > 0.02 ? "transition" :
			"active";

		if (cls !== currentClass && currentClass !== null) {
			segments.push({
				start: segStart,
				end: sd.sec,
				avgDiff: segDiffs.reduce((a, b) => a + b, 0) / segDiffs.length,
				classification: currentClass,
			});
			segStart = sd.sec;
			segDiffs = [];
		}
		currentClass = cls;
		segDiffs.push(sd.avgDiff);
	}
	// Final segment
	if (currentClass && segDiffs.length > 0) {
		segments.push({
			start: segStart,
			end: meta.duration,
			avgDiff: segDiffs.reduce((a, b) => a + b, 0) / segDiffs.length,
			classification: currentClass,
		});
	}

	// Merge very short segments (< 2s) into neighbors
	const merged: DiffSegment[] = [];
	for (const seg of segments) {
		if (seg.end - seg.start < 2 && merged.length > 0) {
			merged[merged.length - 1].end = seg.end;
		} else {
			merged.push({ ...seg });
		}
	}

	const activeTime = merged.filter(s => s.classification === "active").reduce((t, s) => t + s.end - s.start, 0);
	const idleTime = merged.filter(s => s.classification === "idle").reduce((t, s) => t + s.end - s.start, 0);
	const transTime = merged.filter(s => s.classification === "transition").reduce((t, s) => t + s.end - s.start, 0);

	log(`  → ${merged.length} segments: ${Math.round(activeTime)}s active, ${Math.round(idleTime)}s idle, ${Math.round(transTime)}s transition`);

	return merged;
}

// ── Layer 3: Claude Vision Analysis ───────────────────────

async function tagFramesWithHaiku(
	breaks: SceneBreak[],
	segments: DiffSegment[],
	outDir: string,
): Promise<FrameTag[]> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		log("\n  ⚠ ANTHROPIC_API_KEY not set, skipping vision analysis");
		return breaks.map(b => ({
			frameFile: b.frameFile,
			time: b.time,
			tags: [],
			description: `Frame at ${formatTime(b.time)}`,
			contentType: "unknown",
		}));
	}

	log("\nLayer 3: Claude vision analysis...");
	const client = createClient();

	// Filter frames — skip frames in idle segments (unless they're scene breaks with high scores)
	const framesToAnalyze = breaks.filter(b => {
		const seg = segments.find(s => b.time >= s.start && b.time < s.end);
		if (!seg) return true;
		if (seg.classification === "idle" && b.score < 0.03) return false;
		return true;
	});

	log(`  → Analyzing ${framesToAnalyze.length} frames with Haiku (skipped ${breaks.length - framesToAnalyze.length} idle frames)`);

	const tags: FrameTag[] = [];
	const batchSize = 5;

	for (let i = 0; i < framesToAnalyze.length; i += batchSize) {
		const batch = framesToAnalyze.slice(i, i + batchSize);
		const progress = Math.min(i + batchSize, framesToAnalyze.length);
		process.stderr.write(`\r  → Tagging frames... ${progress}/${framesToAnalyze.length}`);

		const results = await Promise.all(
			batch.map(async (b) => {
				const framePath = join(outDir, b.frameFile);
				if (!existsSync(framePath)) return null;

				const imageData = readFileSync(framePath).toString("base64");

				try {
					const response = await client.messages.create({
						model: LLM_MODEL,
						max_tokens: 300,
						messages: [{
							role: "user",
							content: [
								{
									type: "image",
									source: { type: "base64", media_type: "image/jpeg", data: imageData },
								},
								{
									type: "text",
									text: `Describe this screen recording frame in 1-2 sentences. What app/tool is shown? What action is happening? Return JSON only: {"tags": ["tag1", "tag2"], "description": "...", "contentType": "code-editor|terminal|browser|ui-demo|slide|transition|desktop|other"}`,
								},
							],
						}],
					});

					const text = response.content[0].type === "text" ? response.content[0].text : "";
					const jsonMatch = text.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						const parsed = JSON.parse(jsonMatch[0]);
						return {
							frameFile: b.frameFile,
							time: b.time,
							tags: parsed.tags || [],
							description: parsed.description || "",
							contentType: parsed.contentType || "other",
						} as FrameTag;
					}
				} catch (err: any) {
					// Rate limit — wait and retry
					if (err?.status === 429) {
						await new Promise(r => setTimeout(r, 2000));
						return null;
					}
				}
				return {
					frameFile: b.frameFile,
					time: b.time,
					tags: [],
					description: `Frame at ${formatTime(b.time)}`,
					contentType: "unknown",
				} as FrameTag;
			})
		);

		tags.push(...results.filter((r): r is FrameTag => r !== null));
	}

	log(""); // newline after progress

	// Fill in skipped frames
	for (const b of breaks) {
		if (!tags.find(t => t.frameFile === b.frameFile)) {
			const seg = segments.find(s => b.time >= s.start && b.time < s.end);
			tags.push({
				frameFile: b.frameFile,
				time: b.time,
				tags: ["idle"],
				description: `Idle frame at ${formatTime(b.time)}`,
				contentType: seg?.classification === "idle" ? "idle" : "other",
			});
		}
	}

	tags.sort((a, b) => a.time - b.time);
	return tags;
}

async function editorialPass(
	meta: VideoMeta,
	breaks: SceneBreak[],
	segments: DiffSegment[],
	tags: FrameTag[],
): Promise<{
	highlights: EditDecisionList["highlights"];
	suggestedClips: EditDecisionList["suggestedClips"];
	deadTime: EditDecisionList["deadTime"];
}> {
	if (!process.env.ANTHROPIC_API_KEY) {
		// Compute dead time from diff segments alone
		const deadTime = segments
			.filter(s => s.classification === "idle" && (s.end - s.start) > 3)
			.map(s => ({
				start: s.start,
				end: s.end,
				duration: Math.round(s.end - s.start),
				reason: "Static screen — no visual changes detected",
			}));

		return { highlights: [], suggestedClips: [], deadTime };
	}

	log("  → Editorial analysis with Sonnet...");
	const client = createClient();

	const sceneSummary = tags.map(t =>
		`  ${formatTime(t.time)} [${t.contentType}] ${t.description} (tags: ${t.tags.join(", ")})`
	).join("\n");

	const activitySummary = segments.map(s =>
		`  ${formatTime(s.start)}-${formatTime(s.end)} (${Math.round(s.end - s.start)}s): ${s.classification} (diff: ${(s.avgDiff * 100).toFixed(2)}%)`
	).join("\n");

	const response = await client.messages.create({
		model: LLM_MODEL,
		max_tokens: 1500,
		messages: [{
			role: "user",
			content: `You are a video editor analyzing a screen recording for a developer content creator.

Video: ${meta.filename} (${formatTime(meta.duration)}, ${meta.width}x${meta.height})

Frame descriptions (at scene breaks):
${sceneSummary}

Activity analysis:
${activitySummary}

Based on this data, provide editorial suggestions as JSON:
{
  "highlights": [{"time": <seconds>, "reason": "...", "frameFile": "frame_NNN.jpg"}],
  "suggestedClips": [{"start": <seconds>, "end": <seconds>, "title": "Short title", "reason": "..."}],
  "deadTime": [{"start": <seconds>, "end": <seconds>, "duration": <seconds>, "reason": "..."}]
}

Rules:
- Suggest 2-4 highlight moments that would work as thumbnails or hook shots
- Suggest 2-3 clips (30-90s each) that would make compelling standalone short videos
- Identify all dead time (static screen, idle waiting) longer than 3 seconds
- Use the actual timecodes from the frame data
- Give clips catchy but descriptive titles

Return ONLY the JSON.`,
		}],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "{}";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (jsonMatch) {
		try {
			return JSON.parse(jsonMatch[0]);
		} catch {}
	}

	return { highlights: [], suggestedClips: [], deadTime: [] };
}

// ── Main Pipeline ─────────────────────────────────────────

async function main() {
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

	// Check ffmpeg
	try {
		execSync("which ffmpeg", { stdio: "pipe" });
	} catch {
		log("Error: ffmpeg not found. Install with: brew install ffmpeg");
		process.exit(1);
	}

	// Setup
	const meta = getVideoMeta(resolved);
	const id = basename(resolved, ".mp4")
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9-_.]/g, "")
		.toLowerCase()
		.substring(0, 40);
	const outDir = join(PUBLIC_DIR, `storyboard-${id}`);

	mkdirSync(outDir, { recursive: true });

	log(`\n╔══════════════════════════════════════════╗`);
	log(`║  PREMOTION — Video Analyzer              ║`);
	log(`╚══════════════════════════════════════════╝`);
	log(`\n  File:       ${meta.filename}`);
	log(`  Duration:   ${formatTime(meta.duration)} (${meta.duration.toFixed(1)}s)`);
	log(`  Resolution: ${meta.width}x${meta.height} @ ${meta.fps}fps`);
	log(`  Output:     ${basename(outDir)}/`);

	// Layer 1: Scene detection + frame extraction (cached)
	let breaks = cacheGet<SceneBreak[]>(outDir, "layer1-breaks");
	if (breaks) {
		log("\nLayer 1: Scene detection... (cached, skipping)");
	} else {
		breaks = detectSceneBreaks(meta, outDir);
		cacheSet(outDir, "layer1-breaks", breaks);
	}

	// Layer 2: Pixel diff scoring (cached)
	let segments = cacheGet<DiffSegment[]>(outDir, "layer2-segments");
	if (segments) {
		log("\nLayer 2: Pixel diff analysis... (cached, skipping)");
	} else {
		segments = computeDiffSegments(meta);
		cacheSet(outDir, "layer2-segments", segments);
	}

	// Layer 3: Vision analysis (cached per-layer)
	let tags = cacheGet<FrameTag[]>(outDir, "layer3-tags");
	if (tags) {
		log("\nLayer 3: Frame tagging... (cached, skipping)");
	} else {
		tags = await tagFramesWithHaiku(breaks, segments, outDir);
		cacheSet(outDir, "layer3-tags", tags);
	}

	let editorial = cacheGet<{
		highlights: EditDecisionList["highlights"];
		suggestedClips: EditDecisionList["suggestedClips"];
		deadTime: EditDecisionList["deadTime"];
	}>(outDir, "layer3-editorial");
	if (editorial) {
		log("  → Editorial analysis... (cached, skipping)");
	} else {
		editorial = await editorialPass(meta, breaks, segments, tags);
		cacheSet(outDir, "layer3-editorial", editorial);
	}

	// Build scenes from tags + segments
	const scenes = tags.map((t, i) => {
		const nextTime = i < tags.length - 1 ? tags[i + 1].time : meta.duration;
		const seg = segments.find(s => t.time >= s.start && t.time < s.end);
		return {
			index: i + 1,
			start: t.time,
			end: nextTime,
			description: t.description,
			tags: t.tags,
			contentType: t.contentType,
			activity: seg?.classification || "unknown",
		};
	});

	// Stats
	const activeTime = segments.filter(s => s.classification === "active").reduce((t, s) => t + s.end - s.start, 0);
	const idleTime = segments.filter(s => s.classification === "idle").reduce((t, s) => t + s.end - s.start, 0);
	const transTime = segments.filter(s => s.classification === "transition").reduce((t, s) => t + s.end - s.start, 0);

	const edl: EditDecisionList = {
		source: meta.filename,
		duration: Math.round(meta.duration * 10) / 10,
		resolution: `${meta.width}x${meta.height}`,
		fps: meta.fps,
		analyzedAt: new Date().toISOString(),
		scenes,
		highlights: editorial.highlights || [],
		suggestedClips: editorial.suggestedClips || [],
		deadTime: editorial.deadTime || [],
		stats: {
			totalSceneBreaks: breaks.length,
			activeTime: Math.round(activeTime),
			idleTime: Math.round(idleTime),
			transitionTime: Math.round(transTime),
			framesAnalyzed: tags.filter(t => !t.tags.includes("idle")).length,
			estimatedTokens: tags.length * 800 + 2000, // rough estimate
		},
		storyboardDir: `public/demos/${basename(outDir)}`,
	};

	// Write EDL
	const edlPath = join(outDir, "edl.json");
	writeFileSync(edlPath, JSON.stringify(edl, null, 2));

	// Print summary
	log(`\n── Results ──────────────────────────────`);
	log(`  Scenes:      ${scenes.length}`);
	log(`  Active:      ${formatTime(activeTime)} / Idle: ${formatTime(idleTime)}`);
	log(`  Dead time:   ${(editorial.deadTime || []).length} segments (${(editorial.deadTime || []).reduce((t: number, d: any) => t + (d.duration || d.end - d.start), 0)}s)`);
	log(`  Highlights:  ${(editorial.highlights || []).length}`);
	log(`  Clips:       ${(editorial.suggestedClips || []).length}`);
	log(`  Tokens:      ~${edl.stats.estimatedTokens} (est. $${(edl.stats.estimatedTokens * 0.000003).toFixed(4)})`);

	if (editorial.suggestedClips?.length) {
		log(`\n── Suggested Clips ─────────────────────`);
		for (const clip of editorial.suggestedClips) {
			log(`  "${clip.title}" (${formatTime(clip.start)} → ${formatTime(clip.end)})`);
			log(`    ${clip.reason}`);
		}
	}

	if (editorial.deadTime?.length) {
		log(`\n── Dead Time ───────────────────────────`);
		for (const dt of editorial.deadTime) {
			log(`  ${formatTime(dt.start)} → ${formatTime(dt.end)} (${dt.duration || Math.round(dt.end - dt.start)}s): ${dt.reason}`);
		}
	}

	log(`\n  EDL written to: ${edlPath}`);
	log(`  Storyboard:    ${outDir}/\n`);

	// Also output JSON to stdout for piping
	console.log(JSON.stringify(edl, null, 2));
}

main().catch((err) => {
	log(`\nError: ${err.message}`);
	process.exit(1);
});
