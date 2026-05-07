import { execSync } from "child_process";
import type { VideoMeta, DiffSegment } from "./types.ts";
import { log } from "./utils.ts";

export function computeDiffSegments(meta: VideoMeta): DiffSegment[] {
	log("\nLayer 2: Pixel diff analysis...");

	const analysisFps = 6;
	const frameW = 320;
	const frameH = Math.max(2, Math.round(frameW * (meta.height / meta.width)));
	const frameSize = frameW * frameH;
	const halfW = Math.floor(frameW / 2);
	const halfH = Math.floor(frameH / 2);

	const rawBuf = execSync(
		`ffmpeg -i "${meta.path}" -vf "fps=${analysisFps},scale=${frameW}:${frameH},format=gray" -f rawvideo -pix_fmt gray pipe:1 2>/dev/null`,
		{ maxBuffer: 200 * 1024 * 1024 },
	);

	const totalFrames = Math.floor(rawBuf.length / frameSize);
	if (totalFrames < 2) {
		log("  → Not enough frames for diff analysis");
		return [{ start: 0, end: meta.duration, avgDiff: 0.5, classification: "active" }];
	}

	log(`  → Comparing ${totalFrames} frames (${frameW}x${frameH} grayscale)...`);

	const diffs: {
		time: number;
		diff: number;
		quadrants: Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>;
		motionArea: DiffSegment["motionArea"];
	}[] = [];
	for (let i = 1; i < totalFrames; i++) {
		const prev = rawBuf.subarray((i - 1) * frameSize, i * frameSize);
		const curr = rawBuf.subarray(i * frameSize, (i + 1) * frameSize);
		let totalDiff = 0;
		const quadrantTotals = {
			topLeft: 0,
			topRight: 0,
			bottomLeft: 0,
			bottomRight: 0,
		};
		const quadrantCounts = {
			topLeft: 0,
			topRight: 0,
			bottomLeft: 0,
			bottomRight: 0,
		};
		for (let p = 0; p < frameSize; p++) {
			const delta = Math.abs(curr[p] - prev[p]);
			totalDiff += delta;
			const x = p % frameW;
			const y = Math.floor(p / frameW);
			const quadrant =
				y < halfH
					? x < halfW ? "topLeft" : "topRight"
					: x < halfW ? "bottomLeft" : "bottomRight";
			quadrantTotals[quadrant] += delta;
			quadrantCounts[quadrant] += 1;
		}
		const fullDiff = totalDiff / (frameSize * 255);
		const quadrants = {
			topLeft: quadrantTotals.topLeft / (quadrantCounts.topLeft * 255),
			topRight: quadrantTotals.topRight / (quadrantCounts.topRight * 255),
			bottomLeft: quadrantTotals.bottomLeft / (quadrantCounts.bottomLeft * 255),
			bottomRight: quadrantTotals.bottomRight / (quadrantCounts.bottomRight * 255),
		};
		const ranked = Object.entries(quadrants).sort((a, b) => b[1] - a[1]) as Array<[keyof typeof quadrants, number]>;
		const [maxQuadrant, maxQuadrantDiff] = ranked[0];
		const motionArea =
			maxQuadrant === "topLeft" ? "top-left" :
			maxQuadrant === "topRight" ? "top-right" :
			maxQuadrant === "bottomLeft" ? "bottom-left" :
			"bottom-right";
		const gestureSensitiveDiff = Math.max(fullDiff, maxQuadrantDiff);
		diffs.push({ time: (i / analysisFps), diff: gestureSensitiveDiff, quadrants, motionArea });
	}

	const secondDiffs: {
		sec: number;
		avgDiff: number;
		quadrants: Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>;
		motionArea: DiffSegment["motionArea"];
	}[] = [];
	for (let sec = 0; sec < meta.duration; sec++) {
		const inRange = diffs.filter(d => d.time >= sec && d.time < sec + 1);
		if (inRange.length > 0) {
			const avg = inRange.reduce((sum, d) => sum + d.diff, 0) / inRange.length;
			const quadrants = {
				topLeft: inRange.reduce((sum, d) => sum + d.quadrants.topLeft, 0) / inRange.length,
				topRight: inRange.reduce((sum, d) => sum + d.quadrants.topRight, 0) / inRange.length,
				bottomLeft: inRange.reduce((sum, d) => sum + d.quadrants.bottomLeft, 0) / inRange.length,
				bottomRight: inRange.reduce((sum, d) => sum + d.quadrants.bottomRight, 0) / inRange.length,
			};
			const ranked = Object.entries(quadrants).sort((a, b) => b[1] - a[1]) as Array<[keyof typeof quadrants, number]>;
			const motionArea =
				ranked[0][0] === "topLeft" ? "top-left" :
				ranked[0][0] === "topRight" ? "top-right" :
				ranked[0][0] === "bottomLeft" ? "bottom-left" :
				"bottom-right";
			secondDiffs.push({ sec, avgDiff: avg, quadrants, motionArea });
		} else {
			secondDiffs.push({
				sec,
				avgDiff: 0,
				quadrants: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
				motionArea: "full",
			});
		}
	}

	const segments: DiffSegment[] = [];
	let currentClass: DiffSegment["classification"] | null = null;
	let segStart = 0;
	let segDiffs: number[] = [];
	let segQuadrants: Array<Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>> = [];
	let segAreas: Array<DiffSegment["motionArea"]> = [];

	for (const sd of secondDiffs) {
		const cls: DiffSegment["classification"] =
			sd.avgDiff < 0.0006 ? "idle" :
			sd.avgDiff > 0.02 ? "transition" :
			"active";

		if (cls !== currentClass && currentClass !== null) {
			const quadrants = averageQuadrants(segQuadrants);
			segments.push({
				start: segStart,
				end: sd.sec,
				avgDiff: segDiffs.reduce((a, b) => a + b, 0) / segDiffs.length,
				classification: currentClass,
				quadrants,
				motionArea: dominantArea(segAreas, quadrants),
			});
			segStart = sd.sec;
			segDiffs = [];
			segQuadrants = [];
			segAreas = [];
		}
		currentClass = cls;
		segDiffs.push(sd.avgDiff);
		segQuadrants.push(sd.quadrants);
		segAreas.push(sd.motionArea);
	}
	if (currentClass && segDiffs.length > 0) {
		const quadrants = averageQuadrants(segQuadrants);
		segments.push({
			start: segStart,
			end: meta.duration,
			avgDiff: segDiffs.reduce((a, b) => a + b, 0) / segDiffs.length,
			classification: currentClass,
			quadrants,
			motionArea: dominantArea(segAreas, quadrants),
		});
	}

	const merged: DiffSegment[] = [];
	for (const seg of segments) {
		if (seg.end - seg.start < 2 && merged.length > 0) {
			merged[merged.length - 1].end = seg.end;
			merged[merged.length - 1].motionArea = seg.motionArea;
			merged[merged.length - 1].quadrants = seg.quadrants;
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

function averageQuadrants(items: Array<Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>>) {
	if (items.length === 0) return { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
	return {
		topLeft: items.reduce((sum, q) => sum + q.topLeft, 0) / items.length,
		topRight: items.reduce((sum, q) => sum + q.topRight, 0) / items.length,
		bottomLeft: items.reduce((sum, q) => sum + q.bottomLeft, 0) / items.length,
		bottomRight: items.reduce((sum, q) => sum + q.bottomRight, 0) / items.length,
	};
}

function dominantArea(
	areas: Array<DiffSegment["motionArea"]>,
	quadrants: Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>,
): DiffSegment["motionArea"] {
	const counts = new Map<DiffSegment["motionArea"], number>();
	for (const area of areas) counts.set(area, (counts.get(area) ?? 0) + 1);
	let bestArea: DiffSegment["motionArea"] = "full";
	let bestCount = 0;
	for (const [area, count] of counts) {
		if (count > bestCount) {
			bestArea = area;
			bestCount = count;
		}
	}
	if (bestArea !== "full") return bestArea;
	const ranked = Object.entries(quadrants).sort((a, b) => b[1] - a[1]) as Array<[keyof typeof quadrants, number]>;
	return ranked[0][0] === "topLeft" ? "top-left" :
		ranked[0][0] === "topRight" ? "top-right" :
		ranked[0][0] === "bottomLeft" ? "bottom-left" :
		"bottom-right";
}
