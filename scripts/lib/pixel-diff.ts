import { execSync } from "child_process";
import type { VideoMeta, DiffSegment } from "./types.ts";
import { log } from "./utils.ts";

export function computeDiffSegments(meta: VideoMeta): DiffSegment[] {
	log("\nLayer 2: Pixel diff analysis...");

	const frameW = 80;
	const frameH = 45;
	const frameSize = frameW * frameH;

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

	const diffs: { time: number; diff: number }[] = [];
	for (let i = 1; i < totalFrames; i++) {
		const prev = rawBuf.subarray((i - 1) * frameSize, i * frameSize);
		const curr = rawBuf.subarray(i * frameSize, (i + 1) * frameSize);
		let totalDiff = 0;
		for (let p = 0; p < frameSize; p++) {
			totalDiff += Math.abs(curr[p] - prev[p]);
		}
		const normalized = totalDiff / (frameSize * 255);
		diffs.push({ time: (i / 2), diff: normalized });
	}

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
	if (currentClass && segDiffs.length > 0) {
		segments.push({
			start: segStart,
			end: meta.duration,
			avgDiff: segDiffs.reduce((a, b) => a + b, 0) / segDiffs.length,
			classification: currentClass,
		});
	}

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
