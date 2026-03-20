import { join, basename } from "path";
import type { VideoMeta, SceneBreak } from "./types.ts";
import { run, log } from "./utils.ts";

export function detectSceneBreaks(meta: VideoMeta, outDir: string): SceneBreak[] {
	log("\nLayer 1: Scene detection...");

	const thresholds = [0.08, 0.04, 0.02];
	let breaks: { time: number; score: number }[] = [];

	for (const threshold of thresholds) {
		const raw = run(
			`ffmpeg -i "${meta.path}" -vf "select='gt(scene,${threshold})',showinfo" -f null - 2>&1`
		);

		const parsed: { time: number; score: number }[] = [];
		for (const match of raw.matchAll(/pts_time:([\d.]+)/g)) {
			const time = parseFloat(match[1]);
			const idx = raw.indexOf(match[0]);
			const nearby = raw.substring(Math.max(0, idx - 200), idx + 200);
			const scoreMatch = nearby.match(/scene_score=([\d.]+)/);
			const score = scoreMatch ? parseFloat(scoreMatch[1]) : threshold;
			parsed.push({ time, score });
		}

		const deduped: { time: number; score: number }[] = [];
		for (const b of parsed) {
			if (deduped.length === 0 || b.time - deduped[deduped.length - 1].time >= 1.0) {
				deduped.push(b);
			} else if (b.score > deduped[deduped.length - 1].score) {
				deduped[deduped.length - 1] = b;
			}
		}

		breaks = deduped;

		if (breaks.length >= 5 && breaks.length <= 80) {
			log(`  → threshold ${threshold}: found ${breaks.length} scene breaks`);
			break;
		}
		log(`  → threshold ${threshold}: found ${breaks.length} (${breaks.length < 5 ? "too few" : "too many"}, trying next)`);
	}

	const anchors: { time: number; score: number }[] = [{ time: 0, score: 1.0 }];

	for (let t = 15; t < meta.duration - 5; t += 15) {
		const nearbyBreak = breaks.find(b => Math.abs(b.time - t) < 5);
		if (!nearbyBreak) {
			anchors.push({ time: t, score: 0.01 });
		}
	}

	const allBreaks = [...anchors, ...breaks]
		.sort((a, b) => a.time - b.time)
		.filter((b, i, arr) => i === 0 || b.time - arr[i - 1].time >= 1.0);

	const selected = allBreaks.length > 60
		? allBreaks.filter((_, i) => i % Math.ceil(allBreaks.length / 60) === 0)
		: allBreaks;

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
