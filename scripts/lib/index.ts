import { mkdirSync, writeFileSync } from "fs";
import { basename, join } from "path";

export type {
	VideoMeta,
	SceneBreak,
	DiffSegment,
	FrameTag,
	EditDecisionList,
	EditorialResult,
	VisionProvider,
} from "./types.ts";

export { getVideoMeta } from "./video-meta.ts";
export { detectSceneBreaks } from "./scene-detect.ts";
export { computeDiffSegments } from "./pixel-diff.ts";
export { tagFrames, createAnthropicVision } from "./vision.ts";
export { editorialPass } from "./editorial.ts";
export { cacheGet, cacheSet } from "./cache.ts";
export { run, log, formatTime } from "./utils.ts";

import type { EditDecisionList, VisionProvider } from "./types.ts";
import { getVideoMeta } from "./video-meta.ts";
import { detectSceneBreaks } from "./scene-detect.ts";
import { computeDiffSegments } from "./pixel-diff.ts";
import { tagFrames, createAnthropicVision } from "./vision.ts";
import { editorialPass } from "./editorial.ts";
import { cacheGet, cacheSet } from "./cache.ts";
import { log, formatTime } from "./utils.ts";

export async function analyzeVideo(inputPath: string, options?: {
	vision?: VisionProvider;
	outDir?: string;
	skipVision?: boolean;
}): Promise<EditDecisionList> {
	const meta = getVideoMeta(inputPath);
	const id = basename(inputPath, ".mp4")
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9-_.]/g, "")
		.toLowerCase()
		.substring(0, 40);
	const outDir = options?.outDir || join(process.cwd(), `storyboard-${id}`);

	mkdirSync(outDir, { recursive: true });

	let breaks = cacheGet<import("./types.ts").SceneBreak[]>(outDir, "layer1-breaks");
	if (breaks) {
		log("\nLayer 1: Scene detection... (cached, skipping)");
	} else {
		breaks = detectSceneBreaks(meta, outDir);
		cacheSet(outDir, "layer1-breaks", breaks);
	}

	let segments = cacheGet<import("./types.ts").DiffSegment[]>(outDir, "layer2-segments");
	if (segments) {
		log("\nLayer 2: Pixel diff analysis... (cached, skipping)");
	} else {
		segments = computeDiffSegments(meta);
		cacheSet(outDir, "layer2-segments", segments);
	}

	let tags = cacheGet<import("./types.ts").FrameTag[]>(outDir, "layer3-tags");
	if (tags) {
		log("\nLayer 3: Frame tagging... (cached, skipping)");
	} else if (options?.skipVision) {
		tags = breaks.map(b => ({
			frameFile: b.frameFile,
			time: b.time,
			tags: [],
			description: `Frame at ${formatTime(b.time)}`,
			contentType: "unknown",
		}));
	} else {
		const provider = options?.vision || createAnthropicVision();
		tags = await tagFrames(breaks, segments, outDir, provider);
		cacheSet(outDir, "layer3-tags", tags);
	}

	let editorial = cacheGet<import("./types.ts").EditorialResult>(outDir, "layer3-editorial");
	if (editorial) {
		log("  → Editorial analysis... (cached, skipping)");
	} else {
		editorial = await editorialPass(meta, breaks, segments, tags);
		cacheSet(outDir, "layer3-editorial", editorial);
	}

	const scenes = tags.map((t, i) => {
		const nextTime = i < tags!.length - 1 ? tags![i + 1].time : meta.duration;
		const seg = segments!.find(s => t.time >= s.start && t.time < s.end);
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
			estimatedTokens: tags.length * 800 + 2000,
		},
		storyboardDir: basename(outDir),
	};

	const edlPath = join(outDir, "edl.json");
	writeFileSync(edlPath, JSON.stringify(edl, null, 2));

	return edl;
}
