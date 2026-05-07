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
	kind?: "start" | "scene-break" | "coverage-anchor";
}

export interface DiffSegment {
	start: number;
	end: number;
	avgDiff: number;
	classification: "active" | "idle" | "transition";
	motionArea?: "full" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
	quadrants?: Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>;
}

export interface FrameTag {
	frameFile: string;
	time: number;
	tags: string[];
	description: string;
	contentType: string;
	provider?: string;
	model?: string;
	prompt?: string;
	rawText?: string;
	rawResponse?: unknown;
	error?: string;
}

export interface MoondreamMouseObservation {
	visible?: boolean;
	gesture?: boolean;
	description?: string;
	location?: string;
}

export interface MoondreamVideoFrameObservation {
	index: number;
	time: number;
	framePath: string;
	answer: string;
	raw: unknown;
	mouse?: MoondreamMouseObservation;
}

export interface AskMoondreamOnVideoFramesOptions {
	videoPath: string;
	question?: string;
	fpsRate?: number;
	apiKey?: string;
	model?: string;
	maxFrames?: number;
	outputDir?: string;
	signal?: AbortSignal;
}

export interface MoondreamVideoFrameObservations {
	videoPath: string;
	fpsRate: number;
	question: string;
	frames: MoondreamVideoFrameObservation[];
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
		frameFile?: string;
		frameKind?: string;
		score?: number;
		motionArea?: string;
		quadrants?: Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", number>;
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
) => Promise<{
	tags: string[];
	description: string;
	contentType: string;
	provider?: string;
	model?: string;
	rawText?: string;
	rawResponse?: unknown;
	error?: string;
}>;
