/**
 * Premotion Video Catalog Schema v0.2
 *
 * Master index for all source recordings. Designed for:
 * - Progressive enrichment (ingest → annotate → full analyze)
 * - Content-aware reel assembly (query by project, feature, content type)
 * - Linking to pipeline outputs (storyboards, transcripts, EDLs)
 */

// ── Projects ─────────────────────────────────────────────
// A project is a top-level product/app. Videos belong to one primary project
// but may reference others (e.g. a Talkie demo that also shows Lattices).

export type Project =
	| "talkie"       // Voice-to-action framework — memos, dictations, readouts
	| "lattices"     // Agentic window manager
	| "hudson"       // Generative design system
	| "hud"          // Spatial developer canvas
	| "relay"        // Multi-agent communication
	| "compose"      // AI writing assistant (Talkie feature, but standalone UI)
	| "plexus"       // Voice agent chat — iOS app for conversing with agents
	| "premotion"    // This project itself — video pipeline, Remotion
	| "other";

// ── Content Classification ───────────────────────────────
// What KIND of recording is this? Drives how we use it in reels.

export type ContentType =
	| "app-demo"         // Showing an app's UI/features to an audience
	| "feature-walkthrough" // Focused walkthrough of a single feature
	| "dev-session"      // Screen recording of active development (coding, debugging)
	| "voice-session"    // Voice-driven interaction (Lattices voice, Talkie dictation)
	| "agent-session"    // Multi-agent coordination visible
	| "pipeline-run"     // Running a tool/script (analyze, diarize, render)
	| "design-session"   // Generative design / visual exploration
	| "meta"             // Recording about the recording process itself
	| "other";

// ── Scene ────────────────────────────────────────────────
// Time-stamped annotation of what's visible at a specific point.

export interface Scene {
	/** Start time in seconds */
	start: number;
	/** End time in seconds (optional — inferred from next scene if absent) */
	end?: number;
	/** What is visible on screen */
	description: string;
	/** What app/view is foregrounded */
	visibleApp?: string;
	/** Specific UI elements or features visible */
	visibleFeatures?: string[];
	/** Activity level from pixel diff */
	activity?: "active" | "idle" | "transition";
	/** Path to extracted keyframe image (relative to storyboard dir) */
	frameFile?: string;
}

// ── Content ──────────────────────────────────────────────
// Rich description of WHAT is in the video, beyond just "which app".

export interface VideoContent {
	/** Primary project */
	project: Project;
	/** Other projects visible or referenced in the recording */
	alsoShows?: Project[];
	/** What kind of recording this is */
	contentType: ContentType;
	/** Specific features demonstrated (e.g. "compose-rewrite", "voice-commands", "readouts") */
	features: string[];
	/** UI views/screens shown (e.g. "home-dashboard", "library-readouts", "settings") */
	views: string[];
	/** Human summary — what story does this video tell? */
	narrative: string;
	/** Free-form tags for search (broader than features — includes technologies, concepts) */
	tags: string[];
}

// ── Source Metadata ───────────────────────────────────────
// Technical details from ffprobe. Populated automatically on ingest.

export interface SourceMeta {
	resolution: string;        // "1920x1080"
	width: number;
	height: number;
	fps: number;
	duration: number;          // seconds
	codec: string;             // "h264"
	sizeMB: number;
	aspectRatio: string;       // "16:9", "9:16", "4:3", etc.
	hasAudio: boolean;
}

// ── Analysis ─────────────────────────────────────────────
// Links to pipeline outputs. Populated progressively.

export type AnalysisStatus =
	| "none"           // Only ffprobe metadata — file just discovered
	| "frames-only"    // Keyframes extracted + manual descriptions (no API cost)
	| "analyzed"       // Full pipeline: scene detect + pixel diff + vision + editorial
	| "transcribed";   // Also has audio transcript/diarization

export interface Analysis {
	status: AnalysisStatus;
	/** Relative path to storyboard directory (keyframes + edl.json) */
	storyboardDir?: string;
	/** Relative path to transcript JSON (from diarize.py or vox) */
	transcriptFile?: string;
	/** Relative path to EDL JSON */
	edlFile?: string;
	/** When analysis was last run */
	analyzedAt?: string;
	/** Vision API calls used */
	visionCallsUsed?: number;
}

// ── Production ───────────────────────────────────────────
// How this video has been used in Remotion compositions.

export interface Production {
	/** Remotion composition ID(s) that use this video */
	compositions: string[];
	/** Whether this video is a candidate for a reel */
	reelCandidate: boolean;
	/** Which reel(s) this has been included in */
	includedInReels?: string[];
	/** Notes about why this was included/excluded */
	note?: string;
}

// ── Video Entry ──────────────────────────────────────────
// The main catalog record. One per source recording.

export interface VideoEntry {
	/** Stable human-readable identifier (e.g. "talkie-dashboard-mar26") */
	id: string;
	/** Filename in public/demos/ */
	filename: string;
	/** Original capture path (e.g. ~/TMP/CleanShot...) */
	sourcePath: string | null;
	/** Canonical path relative to public/ (e.g. "demos/talkie-dashboard-2026-03-26.mp4") */
	demosPath: string | null;
	/** When the screen recording was captured */
	capturedAt: string | null;

	/** Technical metadata from ffprobe */
	source: SourceMeta;
	/** Rich content classification */
	content: VideoContent;
	/** Time-stamped scene annotations */
	scenes: Scene[];
	/** Pipeline analysis outputs */
	analysis: Analysis;
	/** Remotion production usage */
	production: Production;
}

// ── Catalog ──────────────────────────────────────────────

export interface VideoCatalog {
	_meta: {
		version: string;
		description: string;
		updatedAt: string;
	};
	videos: VideoEntry[];
}
