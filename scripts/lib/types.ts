export interface VideoMeta {
	path: string;
	filename: string;
	duration: number;
	fps: number;
	width: number;
	height: number;
}

export interface SceneBreak {
	time: number;
	score: number;
	frameFile: string;
	frameIndex: number;
}

export interface DiffSegment {
	start: number;
	end: number;
	avgDiff: number;
	classification: "active" | "idle" | "transition";
}

export interface FrameTag {
	frameFile: string;
	time: number;
	tags: string[];
	description: string;
	contentType: string;
}

export interface EditDecisionList {
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

export interface EditorialResult {
	highlights: EditDecisionList["highlights"];
	suggestedClips: EditDecisionList["suggestedClips"];
	deadTime: EditDecisionList["deadTime"];
}

export type VisionProvider = (
	framePath: string,
	prompt: string,
) => Promise<{ tags: string[]; description: string; contentType: string }>;
