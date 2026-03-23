import {
	useCurrentFrame,
	useVideoConfig,
	Sequence,
	AbsoluteFill,
	Audio,
	staticFile,
	interpolate,
	OffthreadVideo,
	Easing,
	delayRender,
	continueRender,
} from "remotion";
import { useState, useCallback, useEffect } from "react";
import { TacticalIntro } from "../demo-template/TacticalIntro";
import { TacticalOutro } from "../demo-template/TacticalOutro";
import { MonitorFrame } from "../../components/MonitorFrame";

// ── Clip definitions ─────────────────────────────────────

interface Clip {
	label: string;
	sublabel: string;
	startFrom: number; // seconds into source video
	duration: number; // seconds to show
}

// Curated clips from the 5-minute voice session
const CLIPS: Clip[] = [
	{
		label: "OPENING",
		sublabel: "Voice session begins",
		startFrom: 1,
		duration: 7,
	},
	{
		label: "REQUEST",
		sublabel: "Inspecting the workspace",
		startFrom: 33,
		duration: 12,
	},
	{
		label: "SPATIAL AWARENESS",
		sublabel: "Lattices describes window layout",
		startFrom: 183,
		duration: 30,
	},
	{
		label: "Z-INDEX",
		sublabel: "Questioning depth order",
		startFrom: 214,
		duration: 14,
	},
	{
		label: "Z-ORDER BREAKDOWN",
		sublabel: "Lattices explains stacking",
		startFrom: 229,
		duration: 22,
	},
	{
		label: "BRING IT UP",
		sublabel: "Window not visible",
		startFrom: 250,
		duration: 9,
	},
	{
		label: "RESULT",
		sublabel: "Window surfaces",
		startFrom: 266,
		duration: 14,
	},
	{
		label: "EXPLANATION",
		sublabel: "Z-order vs visual position",
		startFrom: 283,
		duration: 21,
	},
];

const INTRO_DURATION = 3; // seconds
const PROMPT_DURATION = 4; // seconds — opening directive
const OUTRO_DURATION = 2; // seconds
const OVERLAP_FRAMES = 18; // ~0.6s cross-dissolve overlap between clips

// ── Tactical guide frame overlay ─────────────────────────

const TacticalFrame: React.FC<{
	title: string;
	subtitle: string;
	clipFrame: number;
	clipDuration: number;
	fps: number;
	guideMargin?: number;
}> = ({ title, subtitle, clipFrame, clipDuration, fps, guideMargin = 28 }) => {
	const { height } = useVideoConfig();

	const fadeIn = interpolate(clipFrame, [0, 0.4 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const fadeOut = interpolate(
		clipFrame,
		[clipDuration - 0.5 * fps, clipDuration],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	const opacity = fadeIn * fadeOut;
	const guideColor = "rgba(160, 170, 190, 0.35)";
	const textColor = "rgba(175, 185, 200, 0.65)";
	const scanlineY = (clipFrame * 2.5) % height;
	const recDotVisible = Math.floor(clipFrame / (fps * 0.5)) % 2 === 0;

	return (
		<AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
			{/* Scanline */}
			<div
				style={{
					position: "absolute",
					top: scanlineY,
					left: 0,
					right: 0,
					height: 1,
					backgroundColor: "rgba(160, 170, 190, 0.02)",
				}}
			/>

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, backgroundColor: guideColor }} />

			{/* Top-left: Title */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 8,
					left: guideMargin + 10,
					fontFamily: "SF Mono, Monaco, Consolas, monospace",
					fontSize: 10,
					letterSpacing: "0.06em",
					display: "flex",
					alignItems: "center",
					gap: 10,
				}}
			>
				<span style={{ fontWeight: 600, color: "#d8d8e0" }}>{title}</span>
				<span style={{ color: textColor, opacity: 0.4 }}>—</span>
				<span style={{ color: textColor }}>{subtitle}</span>
			</div>

			{/* Top-right: Status */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 8,
					right: guideMargin + 10,
					fontFamily: "SF Mono, Monaco, Consolas, monospace",
					color: textColor,
					fontSize: 10,
					letterSpacing: "0.06em",
					display: "flex",
					alignItems: "center",
					gap: 12,
				}}
			>
				<span>3440×1440</span>
				<span>30fps</span>
				<span>macOS</span>
			</div>

			{/* Bottom-left: Version */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 8,
					left: guideMargin + 10,
					fontFamily: "SF Mono, Monaco, Consolas, monospace",
					color: textColor,
					fontSize: 10,
					letterSpacing: "0.06em",
				}}
			>
				v0.1.0-dev
			</div>

			{/* Bottom-right: REC indicator */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 8,
					right: guideMargin + 10,
					fontFamily: "SF Mono, Monaco, Consolas, monospace",
					color: textColor,
					fontSize: 10,
					letterSpacing: "0.06em",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<span style={{ color: recDotVisible ? "#6a8" : "#555", fontSize: 7 }}>●</span>
				<span>REC</span>
			</div>
		</AbsoluteFill>
	);
};

// ── Opening prompt card ──────────────────────────────────

const PromptCard: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames, height } = useVideoConfig();

	const fadeIn = interpolate(frame, [0, 0.5 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const fadeOut = interpolate(
		frame,
		[durationInFrames - 0.6 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	const opacity = fadeIn * fadeOut;

	const cardY = interpolate(frame, [0, 0.6 * fps], [20, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const chromeOpacity = interpolate(frame, [0.1 * fps, 0.5 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const promptText =
		"Voice-controlled window management — finding, placing, and organizing windows with natural language commands.";
	const charsVisible = Math.floor(
		interpolate(frame, [0.6 * fps, 2.8 * fps], [0, promptText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);

	const cursorVisible = Math.floor(frame / 8) % 2 === 0;
	const showCursor = charsVisible < promptText.length || frame < 3.5 * fps;

	const scanlineY = (frame * 2.5) % height;
	const dotVisible = Math.floor(frame / (fps * 0.5)) % 2 === 0;
	const mono = "SF Mono, Monaco, Consolas, monospace";

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#0a0a0e",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				opacity,
			}}
		>
			{/* Subtle grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.025 * chromeOpacity,
					backgroundImage: `
						linear-gradient(rgba(160, 170, 190, 0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(160, 170, 190, 0.35) 1px, transparent 1px)
					`,
					backgroundSize: "50px 50px",
				}}
			/>

			{/* Scanline */}
			<div
				style={{
					position: "absolute",
					top: scanlineY,
					left: 0,
					right: 0,
					height: 1,
					backgroundColor: "rgba(160, 170, 190, 0.025)",
					opacity: chromeOpacity,
				}}
			/>

			{/* Card */}
			<div
				style={{
					transform: `translateY(${cardY}px)`,
					width: 760,
					fontFamily: mono,
				}}
			>
				{/* Card chrome */}
				<div
					style={{
						opacity: chromeOpacity,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 16px",
						backgroundColor: "rgba(160, 170, 190, 0.06)",
						borderTop: "1px solid rgba(160, 170, 190, 0.12)",
						borderLeft: "1px solid rgba(160, 170, 190, 0.12)",
						borderRight: "1px solid rgba(160, 170, 190, 0.12)",
						borderRadius: "6px 6px 0 0",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={{ color: dotVisible ? "#60a5fa" : "#444", fontSize: 8 }}>
							●
						</span>
						<span
							style={{
								color: "rgba(175, 185, 200, 0.6)",
								fontSize: 11,
								letterSpacing: "0.1em",
								textTransform: "uppercase",
							}}
						>
							voice session
						</span>
					</div>
					<span
						style={{
							color: "rgba(175, 185, 200, 0.3)",
							fontSize: 10,
							letterSpacing: "0.06em",
						}}
					>
						LATTICES / VOICE MODE
					</span>
				</div>

				{/* Card body */}
				<div
					style={{
						opacity: chromeOpacity,
						padding: "32px 28px",
						backgroundColor: "rgba(160, 170, 190, 0.03)",
						border: "1px solid rgba(160, 170, 190, 0.12)",
						borderTop: "none",
						borderRadius: "0 0 6px 6px",
					}}
				>
					<div
						style={{
							color: "#d8d8e4",
							fontSize: 20,
							lineHeight: 1.7,
							fontWeight: 400,
							letterSpacing: "0.02em",
							fontFamily: mono,
							minHeight: 60,
						}}
					>
						<span style={{ color: "rgba(160, 170, 190, 0.4)" }}>{"› "}</span>
						{promptText.slice(0, charsVisible)}
						{showCursor && (
							<span
								style={{
									opacity: cursorVisible ? 0.7 : 0,
									color: "#60a5fa",
									fontWeight: 300,
								}}
							>
								▎
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.4) 100%)",
					pointerEvents: "none",
				}}
			/>
		</AbsoluteFill>
	);
};

// ── Scene label overlay ──────────────────────────────────

const SceneLabel: React.FC<{
	label: string;
	sublabel: string;
	clipFrame: number;
	clipDuration: number;
	fps: number;
}> = ({ label, sublabel, clipFrame, clipDuration, fps }) => {
	const fadeIn = interpolate(clipFrame, [0.2 * fps, 0.6 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const fadeOut = interpolate(
		clipFrame,
		[clipDuration - 0.5 * fps, clipDuration],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	const opacity = fadeIn * fadeOut;

	const slideY = interpolate(clipFrame, [0.2 * fps, 0.6 * fps], [8, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const progress = interpolate(clipFrame, [0, clipDuration], [0, 100], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<div
			style={{
				position: "absolute",
				bottom: 38,
				left: 0,
				right: 0,
				opacity,
				transform: `translateY(${slideY}px)`,
				fontFamily: "SF Mono, Monaco, Consolas, monospace",
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
			}}
		>
			<div
				style={{
					color: "#e0e0e8",
					fontSize: 14,
					fontWeight: 600,
					letterSpacing: "0.12em",
					marginBottom: 4,
				}}
			>
				{label}
			</div>
			<div
				style={{
					color: "rgba(175, 185, 200, 0.6)",
					fontSize: 11,
					letterSpacing: "0.06em",
					marginBottom: 8,
				}}
			>
				{sublabel}
			</div>
			<div
				style={{
					width: 120,
					height: 2,
					backgroundColor: "rgba(160, 170, 190, 0.15)",
					borderRadius: 1,
				}}
			>
				<div
					style={{
						width: `${progress}%`,
						height: "100%",
						backgroundColor: "rgba(160, 170, 190, 0.5)",
						borderRadius: 1,
					}}
				/>
			</div>
		</div>
	);
};

// ── Transcript-driven caption overlay (tactical style) ──

interface TranscriptSegment {
	start: number;
	end: number;
	speaker: string;
	text: string;
}

const SPEAKER_STYLES: Record<string, { color: string; label: string }> = {
	arach: { color: "#6ae", label: "ARACH" },
	lattices: { color: "#e6a", label: "LATTICES" },
};

const TranscriptCaption: React.FC<{
	segments: TranscriptSegment[];
	videoTime: number; // current time in the source video (seconds)
}> = ({ segments, videoTime }) => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();

	// Find the active segment at this video time
	const active = segments.find(
		(seg) => videoTime >= seg.start - 0.3 && videoTime <= seg.end + 0.3,
	);

	if (!active) return null;

	const style = SPEAKER_STYLES[active.speaker] || SPEAKER_STYLES.arach;

	// Fade based on how far we are into/out of the segment
	const segProgress = (videoTime - active.start) / (active.end - active.start);
	const fadeIn = Math.min(1, segProgress * 5); // quick fade in over first 20%
	const fadeOut = Math.min(1, (1 - segProgress) * 5); // quick fade out over last 20%
	const opacity = Math.max(0, Math.min(1, fadeIn * fadeOut));

	// Typewriter: reveal chars based on progress through the segment
	const charsVisible = Math.floor(
		interpolate(segProgress, [0, 0.7], [0, active.text.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);

	const cursorVisible =
		charsVisible < active.text.length
			? Math.floor(frame / 8) % 2 === 0
			: false;

	return (
		<div
			style={{
				position: "absolute",
				bottom: 85,
				left: 0,
				right: 0,
				display: "flex",
				justifyContent: "center",
				opacity,
				pointerEvents: "none",
			}}
		>
			<div
				style={{
					maxWidth: 820,
					width: "70%",
					padding: "14px 22px",
					backgroundColor: "rgba(10, 10, 14, 0.88)",
					border: "1px solid rgba(160, 170, 190, 0.18)",
					borderRadius: 6,
					fontFamily: "SF Mono, Monaco, Consolas, monospace",
				}}
			>
				<div
					style={{
						fontSize: 10,
						color: "rgba(160, 170, 190, 0.5)",
						letterSpacing: "0.1em",
						marginBottom: 7,
						display: "flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					<span style={{ color: style.color, fontSize: 7 }}>●</span>
					{style.label}
				</div>
				<div
					style={{
						fontSize: 18,
						color: "#e0e0e8",
						fontWeight: 400,
						lineHeight: 1.5,
						letterSpacing: "0.02em",
					}}
				>
					<span style={{ color: "rgba(160, 170, 190, 0.35)" }}>{"› "}</span>
					{active.text.slice(0, charsVisible)}
					{cursorVisible && (
						<span style={{ opacity: 0.6, color: style.color, fontWeight: 300 }}>
							▎
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

// ── Video clip with monitor bezel + cross-dissolve ───────

const VideoClip: React.FC<{
	clip: Clip;
	fps: number;
	videoSrc: string;
	clipDurationFrames: number;
	isFirst: boolean;
	isLast: boolean;
	title: string;
	subtitle: string;
	videoVolume: number;
	transcriptSegments: TranscriptSegment[];
}> = ({ clip, fps, videoSrc, clipDurationFrames, isFirst, isLast, title, subtitle, videoVolume, transcriptSegments }) => {
	const frame = useCurrentFrame();

	// Current time in the source video
	const videoTime = clip.startFrom + frame / fps;

	const fadeIn = isFirst
		? interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
				easing: Easing.out(Easing.cubic),
			})
		: interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
				easing: Easing.inOut(Easing.cubic),
			});

	const fadeOut = isLast
		? interpolate(
				frame,
				[clipDurationFrames - OVERLAP_FRAMES, clipDurationFrames],
				[1, 0],
				{
					extrapolateLeft: "clamp",
					extrapolateRight: "clamp",
					easing: Easing.out(Easing.cubic),
				},
			)
		: interpolate(
				frame,
				[clipDurationFrames - OVERLAP_FRAMES, clipDurationFrames],
				[1, 0],
				{
					extrapolateLeft: "clamp",
					extrapolateRight: "clamp",
					easing: Easing.inOut(Easing.cubic),
				},
			);

	const opacity = fadeIn * fadeOut;

	return (
		<AbsoluteFill style={{ opacity }}>
			<MonitorFrame
				bezelColor="#1c1c20"
				bezelWidth={10}
				bezelRadius={12}
				screenRadius={4}
				showStand={false}
				showScreenGlow={true}
				glowColor="rgba(80, 140, 255, 0.06)"
				powerOnEffect={isFirst}
				wordmark="LATTICES"
				wordmarkColor="rgba(255, 255, 255, 0.18)"
				monitorWidthPct={96}
				monitorHeightPct={76}
				monitorTopPct={10}
				chinHeight={28}
			>
				<div style={{ width: "100%", height: "100%", backgroundColor: "#0a0a0e", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<OffthreadVideo
						src={staticFile(videoSrc)}
						startFrom={Math.floor(clip.startFrom * fps)}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "contain",
						}}
						volume={videoVolume}
					/>
				</div>
			</MonitorFrame>
			{/* Tactical guide frame */}
			<TacticalFrame
				title={title}
				subtitle={subtitle}
				clipFrame={frame}
				clipDuration={clipDurationFrames}
				fps={fps}
			/>
			{/* Transcript-driven captions */}
			<TranscriptCaption
				segments={transcriptSegments}
				videoTime={videoTime}
			/>
			{/* Scene label — bottom center */}
			<SceneLabel
				label={clip.label}
				sublabel={clip.sublabel}
				clipFrame={frame}
				clipDuration={clipDurationFrames}
				fps={fps}
			/>
		</AbsoluteFill>
	);
};

// ── Main composition ─────────────────────────────────────

export interface LatticesVoiceCommandsDemoProps {
	videoSrc?: string;
	transcriptFile?: string;
	musicTrack?: string;
	musicVolume?: number;
	videoVolume?: number;
	title?: string;
	subtitle?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
}

export const LatticesVoiceCommandsDemo: React.FC<LatticesVoiceCommandsDemoProps> = ({
	videoSrc = "demos/lattices-voice-2026-03-22.mp4",
	transcriptFile = "transcripts/lattices-voice-2026-03-22-captions.json",
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.15,
	videoVolume = 0.6,
	title = "LATTICES",
	subtitle = "Voice Commands",
	tagline = "Hands-Off Window Management",
	releaseDate = "2026",
	iconSrc = "lattices-icon.png",
}) => {
	const { fps, durationInFrames } = useVideoConfig();

	// Load transcript segments
	const [segments, setSegments] = useState<TranscriptSegment[]>([]);
	const [handle] = useState(() => delayRender("Loading transcript..."));

	const fetchTranscript = useCallback(async () => {
		try {
			const response = await fetch(staticFile(transcriptFile));
			const data = await response.json();
			setSegments(data);
			continueRender(handle);
		} catch (err) {
			console.error("Failed to load transcript:", err);
			continueRender(handle);
		}
	}, [transcriptFile, handle]);

	useEffect(() => {
		fetchTranscript();
	}, [fetchTranscript]);

	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);

	let cursor = introFrames + promptFrames;
	const clipSequences = CLIPS.map((clip, i) => {
		const clipFrames = Math.floor(clip.duration * fps);
		const from = cursor;
		cursor += clipFrames - OVERLAP_FRAMES;
		return { clip, from, clipFrames, index: i };
	});

	const outroStart = cursor + OVERLAP_FRAMES;
	const outroFrames = Math.floor(OUTRO_DURATION * fps);

	const sfxVolume = 0.35;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Layer 1: Background Music — ducks during content to let voice through */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile(musicTrack)}
					volume={(f) => {
						const fadeInEnd = 1.5 * fps;
						const fadeOutStart = durationInFrames - 2.0 * fps;
						if (f < fadeInEnd)
							return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
						if (f > fadeOutStart)
							return interpolate(
								f,
								[fadeOutStart, durationInFrames],
								[musicVolume, 0],
							);
						// Duck music during content clips to let voice come through
						const contentStart = introFrames + promptFrames;
						if (f >= contentStart && f < outroStart) {
							return musicVolume * 0.3;
						}
						return musicVolume;
					}}
				/>
			</Sequence>

			{/* Layer 2: Sound Effects */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={0} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
				</Sequence>
				<Sequence
					from={outroStart + Math.floor(0.5 * fps)}
					durationInFrames={45}
				>
					<Audio
						src={staticFile("sfx/cortex_wave.wav")}
						volume={sfxVolume * 0.5}
					/>
				</Sequence>
			</Sequence>

			{/* Layer 3: Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title={title}
					subtitle={subtitle}
					iconSrc={iconSrc}
					guideMargin={28}
				/>
			</Sequence>

			{/* Layer 4: Opening prompt */}
			<Sequence
				name="Prompt"
				from={introFrames}
				durationInFrames={promptFrames}
			>
				<PromptCard />
			</Sequence>

			{/* Layer 5: Content clips */}
			{clipSequences.map(({ clip, from, clipFrames, index }) => (
				<Sequence
					key={index}
					name={`Clip-${clip.label}-${index}`}
					from={from}
					durationInFrames={clipFrames}
				>
					<VideoClip
						clip={clip}
						fps={fps}
						videoSrc={videoSrc}
						clipDurationFrames={clipFrames}
						isFirst={index === 0}
						isLast={index === CLIPS.length - 1}
						title={title}
						subtitle={subtitle}
						videoVolume={videoVolume}
						transcriptSegments={segments}
					/>
				</Sequence>
			))}

			{/* Layer 6: Outro */}
			<Sequence name="Outro" from={outroStart} durationInFrames={outroFrames}>
				<TacticalOutro
					title={title}
					tagline={tagline}
					releaseDate={releaseDate}
					iconSrc={iconSrc}
					guideMargin={28}
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// Calculate total frames accounting for overlaps
export function calculateVoiceCommandsDemoFrames(fps: number): number {
	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);
	const outroFrames = Math.floor(OUTRO_DURATION * fps);
	const clipFrames = CLIPS.reduce(
		(sum, clip) => sum + Math.floor(clip.duration * fps),
		0,
	);
	const overlapFrames = (CLIPS.length - 1) * OVERLAP_FRAMES;
	return introFrames + promptFrames + clipFrames - overlapFrames + outroFrames;
}
