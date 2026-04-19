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
} from "remotion";
import { TacticalIntro } from "../demo-template/TacticalIntro";
import { TacticalOutro } from "../demo-template/TacticalOutro";

// ── Multi-source clip definitions ────────────────────────

interface Clip {
	label: string;
	sublabel: string;
	videoSrc: string; // per-clip source video
	startFrom: number; // seconds into source video
	duration: number; // seconds to show
}

// Curated clips from three screen recording sessions
const CLIPS: Clip[] = [
	// Mar 19 — Full dev session: dense multi-window opening
	{
		label: "DEV SESSION",
		sublabel: "Multi-agent workspace",
		videoSrc: "demos/cleanshot-demo-2026-03-19-1655.mp4",
		startFrom: 80,
		duration: 8,
	},
	// Mar 20 — Lattices: GitHub PR + window manager overlay
	{
		label: "LATTICES",
		sublabel: "Window manager integration",
		videoSrc: "demos/cleanshot-demo-2026-03-20.mp4",
		startFrom: 59,
		duration: 10,
	},
	// Mar 19 — Active development with Claude agents
	{
		label: "AGENT COORDINATION",
		sublabel: "Claude agents in parallel",
		videoSrc: "demos/cleanshot-demo-2026-03-19-1655.mp4",
		startFrom: 135,
		duration: 10,
	},
	// Mar 20 — Multi-window coding session
	{
		label: "CODE SESSION",
		sublabel: "Real-time iteration",
		videoSrc: "demos/cleanshot-demo-2026-03-20.mp4",
		startFrom: 97,
		duration: 10,
	},
	// Mar 26 — Compose: AI writing in progress
	{
		label: "COMPOSE",
		sublabel: "AI-assisted writing",
		videoSrc: "demos/cleanshot-demo-2026-03-26.mp4",
		startFrom: 5,
		duration: 8,
	},
	// Mar 26 — Compose: diff view with professional rewrite
	{
		label: "REWRITE",
		sublabel: "Draft → Professional",
		videoSrc: "demos/cleanshot-demo-2026-03-26.mp4",
		startFrom: 119,
		duration: 10,
	},
	// Mar 19 — Dense multi-pane finale
	{
		label: "FULL STACK",
		sublabel: "Everything connected",
		videoSrc: "demos/cleanshot-demo-2026-03-19-1655.mp4",
		startFrom: 202,
		duration: 8,
	},
];

const INTRO_DURATION = 3; // seconds
const PROMPT_DURATION = 5; // seconds — opening directive
const OUTRO_DURATION = 4; // seconds
const OVERLAP_FRAMES = 18; // ~0.6s cross-dissolve overlap between clips

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
		"Voice-to-action framework — capture thoughts, route to agents, refine with AI. Compose, coordinate, ship.";
	const charsVisible = Math.floor(
		interpolate(frame, [0.6 * fps, 3.5 * fps], [0, promptText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);

	const cursorVisible = Math.floor(frame / 8) % 2 === 0;
	const showCursor = charsVisible < promptText.length || frame < 4.0 * fps;

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
						<span style={{ color: dotVisible ? "#6a8" : "#444", fontSize: 8 }}>
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
							highlight reel
						</span>
					</div>
					<span
						style={{
							color: "rgba(175, 185, 200, 0.3)",
							fontSize: 10,
							letterSpacing: "0.06em",
						}}
					>
						TALKIE / MARCH 2026
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
									color: "#6a8",
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

	const slideX = interpolate(clipFrame, [0.2 * fps, 0.6 * fps], [-12, 0], {
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
				bottom: 48,
				left: 48,
				opacity,
				transform: `translateX(${slideX}px)`,
				fontFamily: "SF Mono, Monaco, Consolas, monospace",
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

// ── Tactical guide frame overlay ─────────────────────────

const TacticalFrame: React.FC<{
	clipFrame: number;
	clipDuration: number;
	fps: number;
}> = ({ clipFrame, clipDuration, fps }) => {
	const { height } = useVideoConfig();
	const guideMargin = 28;

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

			{/* Top-left: TALKIE */}
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
				<span style={{ fontWeight: 600, color: "#d8d8e0" }}>TALKIE</span>
				<span style={{ color: textColor, opacity: 0.4 }}>—</span>
				<span style={{ color: textColor }}>Highlight Reel</span>
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
				<span>1920×1080</span>
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
				v2.22.0-beta
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

// ── Video clip with cross-dissolve ───────────────────────

const VideoClip: React.FC<{
	clip: Clip;
	fps: number;
	clipDurationFrames: number;
	isFirst: boolean;
	isLast: boolean;
}> = ({ clip, fps, clipDurationFrames, isFirst, isLast }) => {
	const frame = useCurrentFrame();

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
			<OffthreadVideo
				src={staticFile(clip.videoSrc)}
				startFrom={Math.floor(clip.startFrom * fps)}
				style={{
					width: "100%",
					height: "100%",
					objectFit: "contain",
					backgroundColor: "#0a0a0e",
				}}
				volume={0}
			/>
			<TacticalFrame
				clipFrame={frame}
				clipDuration={clipDurationFrames}
				fps={fps}
			/>
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

export interface TalkieHighlightReelProps {
	musicTrack?: string;
	musicVolume?: number;
	title?: string;
	subtitle?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
}

export const TalkieHighlightReel: React.FC<TalkieHighlightReelProps> = ({
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.3,
	title = "TALKIE",
	subtitle = "Voice Engine v2.22",
	tagline = "Voice-to-Action Framework",
	releaseDate = "2026",
	iconSrc = "talkie-icon-1024.png",
}) => {
	const { fps, durationInFrames } = useVideoConfig();

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
			{/* Layer 1: Background Music */}
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

			{/* Layer 5: Content clips — multi-source with cross-dissolve */}
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
						clipDurationFrames={clipFrames}
						isFirst={index === 0}
						isLast={index === CLIPS.length - 1}
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
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// Calculate total frames accounting for overlaps
export function calculateTalkieReelFrames(fps: number): number {
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
