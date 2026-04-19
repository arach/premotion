#!/usr/bin/env bun
/**
 * select-clips.ts — Requirement-driven clip selection for Remotion compositions
 *
 * Dense-probes source videos (audio + vision), then matches card requirements
 * to the best segments. Outputs a verified clip manifest.
 *
 * Usage:
 *   bun run scripts/select-clips.ts                   # Probe + select
 *   bun run scripts/select-clips.ts --probe-only      # Probe without selecting
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { basename, join, resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = resolve(import.meta.dirname || ".", "..");
const DEMOS = join(ROOT, "public/demos");
const CACHE_DIR = join(ROOT, ".clip-cache");
const SRC_FPS = 60;

// ─── Load .env.local ─────────────────────────────────────────────
try {
	const env = readFileSync(join(ROOT, ".env.local"), "utf-8");
	for (const line of env.split("\n")) {
		const m = line.match(/^#/) ? null : line.match(/^(\w+)=(.+)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
	}
} catch {}

// ─── Types ────────────────────────────────────────────────────────
interface AudioSample { time: number; rmsDb: number; level: "silent" | "quiet" | "audible" | "loud" }
interface FrameClassification {
	time: number;
	frameFile: string;
	uiState: string;
	playbackState: string;
	contentPhase: string;
	motion: string;
	details: string;
	confidence: number;
}
interface ProbedSegment { time: number; audio: AudioSample; visual: FrameClassification }
interface CardSpec {
	word: string;
	source: string;
	probeRange: [number, number];
	requirements: {
		playbackState?: string[];
		contentPhase?: string[];
		audioLevel?: ("silent" | "quiet" | "audible" | "loud")[];
		minDurationSec?: number;
	};
	precutIfStartFromExceeds?: number;
}
interface ClipSelection {
	word: string;
	source: string;
	startSec: number;
	endSec: number;
	startFromSrcFps: number;
	durationSec: number;
	score: number;
	reasoning: string;
	segment: ProbedSegment;
	precutCommand?: string;
	precutFile?: string;
}

// ─── Audio Probe ──────────────────────────────────────────────────
function probeAudio(videoPath: string, startSec: number, endSec: number): AudioSample[] {
	const samples: AudioSample[] = [];
	const duration = endSec - startSec;
	const tmpPcm = join(CACHE_DIR, `audio_${basename(videoPath, ".mp4")}_${startSec}-${endSec}.raw`);

	if (!existsSync(tmpPcm)) {
		execSync(
			`ffmpeg -y -ss ${startSec} -t ${duration} -i "${videoPath}" -ac 1 -ar 16000 -f f32le "${tmpPcm}" 2>/dev/null`,
			{ timeout: 30000 },
		);
	}

	const buf = readFileSync(tmpPcm);
	const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
	const samplesPerSec = 16000;

	for (let sec = 0; sec < duration; sec++) {
		const offset = sec * samplesPerSec;
		const chunk = floats.slice(offset, offset + samplesPerSec);
		if (chunk.length === 0) continue;

		let sumSq = 0;
		for (let i = 0; i < chunk.length; i++) sumSq += chunk[i] * chunk[i];
		const rms = Math.sqrt(sumSq / chunk.length);
		const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -91;
		const level: AudioSample["level"] =
			rmsDb < -50 ? "silent" : rmsDb < -35 ? "quiet" : rmsDb < -18 ? "audible" : "loud";

		samples.push({ time: startSec + sec, rmsDb: Math.round(rmsDb * 10) / 10, level });
	}

	return samples;
}

// ─── Frame Extraction ─────────────────────────────────────────────
function extractFrames(videoPath: string, startSec: number, endSec: number, intervalSec = 2): string[] {
	const tag = `${basename(videoPath, ".mp4")}_${startSec}-${endSec}`;
	const dir = join(CACHE_DIR, `frames_${tag}`);
	mkdirSync(dir, { recursive: true });

	const existing = readdirSync(dir).filter(f => f.endsWith(".jpg"));
	if (existing.length > 0) return existing.map(f => join(dir, f)).sort();

	execSync(
		`ffmpeg -y -ss ${startSec} -t ${endSec - startSec} -i "${videoPath}" -vf "fps=1/${intervalSec}" -q:v 2 "${dir}/frame_%04d.jpg" 2>/dev/null`,
		{ timeout: 60000 },
	);

	return readdirSync(dir).filter(f => f.endsWith(".jpg")).map(f => join(dir, f)).sort();
}

// ─── Vision Classification ────────────────────────────────────────
const TALKIE_VISION_PROMPT = `Analyze this Talkie iOS app screenshot. Classify:

1. uiState: camera-scan | text-capture | reader-view | readout-detail | ai-commands | tts-response | other
2. playbackState: playing (Pause ⏸ button visible AND progress > 0:00) | stopped (Play ▶ button visible) | loading | not-applicable
3. contentPhase: scanning | ocr-extraction | text-display | tts-readback | ai-question | ai-streaming | tts-playing | idle | transition
4. motion: high | medium | low (estimate from UI state — scrolling/typing = high, subtle changes = medium, static = low)
5. details: Describe what's on screen in one sentence. Note any progress bar position, button states, text content visible.
6. confidence: 0.0-1.0

Return ONLY JSON: {"uiState":"...","playbackState":"...","contentPhase":"...","motion":"...","details":"...","confidence":0.9}`;

async function classifyFrames(
	framePaths: string[],
	startSec: number,
	intervalSec: number,
): Promise<FrameClassification[]> {
	const dirName = basename(join(framePaths[0], ".."));
	const cacheFile = join(CACHE_DIR, `vision_${dirName}.json`);
	if (existsSync(cacheFile)) {
		return JSON.parse(readFileSync(cacheFile, "utf-8"));
	}

	const client = new Anthropic();
	const model = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
	const results: FrameClassification[] = [];
	const batchSize = 3;

	for (let i = 0; i < framePaths.length; i += batchSize) {
		const batch = framePaths.slice(i, i + batchSize);
		const batchResults = await Promise.all(
			batch.map(async (fp, j) => {
				const time = startSec + (i + j) * intervalSec;
				try {
					const imgData = readFileSync(fp).toString("base64");
					const resp = await client.messages.create({
						model,
						max_tokens: 300,
						messages: [{
							role: "user",
							content: [
								{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgData } },
								{ type: "text", text: TALKIE_VISION_PROMPT },
							],
						}],
					});
					const text = resp.content[0].type === "text" ? resp.content[0].text : "{}";
					const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
					return {
						time,
						frameFile: fp,
						uiState: parsed.uiState || "other",
						playbackState: parsed.playbackState || "not-applicable",
						contentPhase: parsed.contentPhase || "idle",
						motion: parsed.motion || "low",
						details: parsed.details || "",
						confidence: parsed.confidence || 0,
					};
				} catch (err: any) {
					console.error(`    ⚠ Frame ${time}s failed: ${err.message?.slice(0, 80)}`);
					return {
						time, frameFile: fp,
						uiState: "unknown", playbackState: "unknown", contentPhase: "unknown",
						motion: "unknown", details: `Classification failed`, confidence: 0,
					};
				}
			}),
		);
		results.push(...batchResults);
		process.stderr.write(`\r    → Classified ${Math.min(i + batchSize, framePaths.length)}/${framePaths.length} frames`);
	}
	console.log("");

	writeFileSync(cacheFile, JSON.stringify(results, null, 2));
	return results;
}

// ─── Probe a Source Region ────────────────────────────────────────
async function probeRegion(
	videoPath: string,
	startSec: number,
	endSec: number,
	opts: { intervalSec?: number; audioOnly?: boolean } = {},
): Promise<ProbedSegment[]> {
	const intervalSec = opts.intervalSec ?? 2;
	console.log(`\n── Probing ${basename(videoPath)} [${startSec}s → ${endSec}s] ──`);

	const audioSamples = probeAudio(videoPath, startSec, endSec);
	const framePaths = extractFrames(videoPath, startSec, endSec, intervalSec);

	let classifications: FrameClassification[];
	if (opts.audioOnly) {
		classifications = framePaths.map((fp, i) => ({
			time: startSec + i * intervalSec,
			frameFile: fp,
			uiState: "unknown",
			playbackState: "unknown",
			contentPhase: "unknown",
			motion: "unknown",
			details: "",
			confidence: 0,
		}));
	} else {
		classifications = await classifyFrames(framePaths, startSec, intervalSec);
	}

	const segments: ProbedSegment[] = [];
	for (const vis of classifications) {
		const audio = audioSamples.find(a => Math.abs(a.time - vis.time) <= 1) ||
			{ time: vis.time, rmsDb: -91, level: "silent" as const };
		segments.push({ time: vis.time, audio, visual: vis });
	}

	return segments;
}

// ─── Clip Scoring ─────────────────────────────────────────────────
function scoreSegment(segment: ProbedSegment, spec: CardSpec): number {
	let score = 0;
	const req = spec.requirements;

	if (req.playbackState?.length) {
		score += req.playbackState.includes(segment.visual.playbackState) ? 30 : -50;
	}
	if (req.contentPhase?.length) {
		score += req.contentPhase.includes(segment.visual.contentPhase) ? 30 : -20;
	}
	if (req.audioLevel?.length) {
		score += req.audioLevel.includes(segment.audio.level) ? 20 : -10;
	}

	score += segment.visual.confidence * 10;

	if (segment.visual.motion === "high") score += 5;
	else if (segment.visual.motion === "medium") score += 3;

	return score;
}

function selectBestClip(segments: ProbedSegment[], spec: CardSpec): ClipSelection | null {
	if (segments.length === 0) return null;

	const scored = segments.map(seg => ({ seg, score: scoreSegment(seg, spec) }));
	scored.sort((a, b) => b.score - a.score);

	const best = scored[0];
	const minDur = spec.requirements.minDurationSec || 3;
	const endSec = Math.min(best.seg.time + minDur, spec.probeRange[1]);
	const startFrom = best.seg.time * SRC_FPS;

	const needsPrecut = spec.precutIfStartFromExceeds !== undefined && startFrom > spec.precutIfStartFromExceeds;
	const precutFile = needsPrecut
		? `demos/${spec.word.toLowerCase()}-precut.mp4`
		: undefined;
	const precutCommand = needsPrecut
		? `ffmpeg -y -ss ${best.seg.time} -t ${endSec - best.seg.time} -i "${join(DEMOS, spec.source)}" -c copy "${join(DEMOS, precutFile!)}" 2>/dev/null`
		: undefined;

	const topAlternatives = scored.slice(1, 4).map(s =>
		`${s.seg.time}s (score=${s.score}, ${s.seg.visual.playbackState}, ${s.seg.audio.level})`
	).join("; ");

	return {
		word: spec.word,
		source: spec.source,
		startSec: best.seg.time,
		endSec,
		startFromSrcFps: startFrom,
		durationSec: endSec - best.seg.time,
		score: best.score,
		reasoning: `Best match at ${best.seg.time}s: ${best.seg.visual.contentPhase}, ` +
			`playback=${best.seg.visual.playbackState}, audio=${best.seg.audio.level} (${best.seg.audio.rmsDb}dB). ` +
			`${best.seg.visual.details} ` +
			`Alternatives: ${topAlternatives || "none"}`,
		segment: best.seg,
		precutCommand,
		precutFile,
	};
}

// ─── Composition Spec: Baudrillard ────────────────────────────────
const BAUDRILLARD_SPEC: CardSpec[] = [
	{
		word: "CAPTURE",
		source: "talkie-capture-baudrillard.mp4",
		probeRange: [0, 25],
		requirements: {
			contentPhase: ["scanning", "ocr-extraction"],
			playbackState: ["not-applicable"],
			audioLevel: ["silent", "quiet"],
		},
	},
	{
		word: "READ",
		source: "talkie-capture-baudrillard.mp4",
		probeRange: [25, 60],
		requirements: {
			contentPhase: ["text-display", "ocr-extraction", "text-capture"],
			playbackState: ["not-applicable"],
		},
	},
	{
		word: "LISTEN",
		source: "talkie-capture-baudrillard.mp4",
		probeRange: [75, 112],
		requirements: {
			playbackState: ["playing"],
			contentPhase: ["tts-readback", "tts-playing"],
			audioLevel: ["audible", "loud"],
			minDurationSec: 8,
		},
		precutIfStartFromExceeds: 3000,
	},
	{
		word: "UNDERSTAND",
		source: "talkie-capture-baudrillard-2.mp4",
		probeRange: [155, 210],
		requirements: {
			contentPhase: ["ai-streaming", "tts-playing", "ai-question", "tts-response"],
			audioLevel: ["quiet", "audible", "loud"],
			minDurationSec: 10,
		},
		precutIfStartFromExceeds: 3000,
	},
];

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
	mkdirSync(CACHE_DIR, { recursive: true });

	const probeOnly = process.argv.includes("--probe-only");
	const audioOnly = process.argv.includes("--audio-only");

	console.log("╔══════════════════════════════════════════╗");
	console.log("║  PREMOTION — Clip Selector               ║");
	console.log("╚══════════════════════════════════════════╝");

	const probeCache = new Map<string, ProbedSegment[]>();

	for (const spec of BAUDRILLARD_SPEC) {
		const videoPath = join(DEMOS, spec.source);
		if (!existsSync(videoPath)) {
			console.error(`  ✗ Source not found: ${spec.source}`);
			continue;
		}
		const key = `${spec.source}:${spec.probeRange[0]}-${spec.probeRange[1]}`;
		if (!probeCache.has(key)) {
			const segments = await probeRegion(videoPath, spec.probeRange[0], spec.probeRange[1], { audioOnly });
			probeCache.set(key, segments);

			console.log(`  Timeline for ${spec.source} [${spec.probeRange[0]}-${spec.probeRange[1]}s]:`);
			for (const seg of segments) {
				const audioBar = seg.audio.level === "loud" ? "████" :
					seg.audio.level === "audible" ? "███░" :
					seg.audio.level === "quiet" ? "██░░" : "░░░░";
				console.log(
					`    ${String(seg.time).padStart(4)}s  ${audioBar}  ${seg.audio.rmsDb.toFixed(1).padStart(6)}dB  ` +
					`[${seg.visual.playbackState.padEnd(12)}]  ${seg.visual.contentPhase.padEnd(16)}  ${seg.visual.details.slice(0, 60)}`,
				);
			}
		}
	}

	if (probeOnly) {
		console.log("\n  (--probe-only: skipping selection)");
		return;
	}

	console.log("\n── Selecting Clips ─────────────────────────");
	const selections: ClipSelection[] = [];

	for (const spec of BAUDRILLARD_SPEC) {
		const key = `${spec.source}:${spec.probeRange[0]}-${spec.probeRange[1]}`;
		const segments = probeCache.get(key);
		if (!segments) { console.log(`  ✗ ${spec.word}: no probe data`); continue; }

		const selection = selectBestClip(segments, spec);
		if (!selection) { console.log(`  ✗ ${spec.word}: no matching segment found`); continue; }

		selections.push(selection);
		console.log(
			`  ✓ ${spec.word}: ${selection.startSec}s → ${selection.endSec}s (score=${selection.score})`,
		);
		console.log(`    ${selection.reasoning}`);
		if (selection.precutCommand) {
			console.log(`    Pre-cut: ${selection.precutFile}`);
		}
	}

	// ── Generate pre-cut commands ───────────────────────────
	const precutCommands = selections.filter(s => s.precutCommand).map(s => s.precutCommand!);
	if (precutCommands.length > 0) {
		console.log("\n── Pre-cut Commands ────────────────────────");
		for (const cmd of precutCommands) console.log(`  ${cmd}`);
	}

	// ── Output manifest ─────────────────────────────────────
	const manifest = {
		composition: "HypeFeatureStackCBaudrillard",
		analyzedAt: new Date().toISOString(),
		srcFps: SRC_FPS,
		cards: selections.map(s => ({
			word: s.word,
			source: s.precutFile || s.source,
			startSec: s.startSec,
			endSec: s.endSec,
			startFromSrcFps: s.precutFile ? 0 : s.startFromSrcFps,
			durationSec: s.durationSec,
			score: s.score,
			reasoning: s.reasoning,
			audioLevel: s.segment.audio.level,
			playbackState: s.segment.visual.playbackState,
			contentPhase: s.segment.visual.contentPhase,
		})),
		precutCommands,
	};

	const manifestPath = join(CACHE_DIR, "manifest-baudrillard.json");
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	console.log(`\n  Manifest: ${manifestPath}`);

	// ── Pacing Suggestion ───────────────────────────────────
	console.log("\n── Pacing Suggestion ───────────────────────");
	const totalContent = 40; // seconds of content (minus intro/outro)
	const weights = selections.map(s => {
		const base = s.durationSec / selections.reduce((t, x) => t + x.durationSec, 0);
		if (s.word === "LISTEN" || s.word === "UNDERSTAND") return Math.max(base, 0.25);
		return base;
	});
	const wSum = weights.reduce((t, w) => t + w, 0);
	const normalized = weights.map(w => w / wSum);
	for (let i = 0; i < selections.length; i++) {
		const secs = Math.round(normalized[i] * totalContent);
		console.log(`  ${selections[i].word}: weight=${normalized[i].toFixed(2)} → ~${secs}s`);
	}
}

main().catch(err => {
	console.error("Fatal:", err);
	process.exit(1);
});
