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

// ── Clip definitions ─────────────────────────────────────

interface Clip {
	label: string;
	sublabel: string;
	startFrom: number; // seconds into source video
	duration: number; // seconds to show
}

const CLIPS: Clip[] = [
	{
		label: "LANDING PAGE",
		sublabel: "The agentic window manager",
		startFrom: 5,
		duration: 2,
	},
	{
		label: "WORKSPACE LAYOUT",
		sublabel: "Multi-panel window tiling",
		startFrom: 16,
		duration: 8,
	},
	{
		label: "README",
		sublabel: "Architecture & commands",
		startFrom: 60,
		duration: 8,
	},
	{
		label: "DESKTOP INVENTORY",
		sublabel: "Window management overview",
		startFrom: 120,
		duration: 8,
	},
	{
		label: "LIVE COMMANDS",
		sublabel: "Terminal integration",
		startFrom: 116,
		duration: 8,
	},
];

const INTRO_DURATION = 3; // seconds
const PROMPT_DURATION = 5; // seconds — opening directive
const OUTRO_DURATION = 2; // seconds — short, no spinner
const OVERLAP_FRAMES = 18; // ~0.6s cross-dissolve overlap between clips

// ── Crop settings ────────────────────────────────────────
// Source: 3440x1440 ultrawide. Lattices content is on the right ~60%.
// We crop to focus on the app content.
const CROP_SCALE = 1.35;
const CROP_CENTER_X = 0.42; // focus right of center where the app content lives
const INNER_SCALE_X = 0.72;
const INNER_SCALE_Y = 0.64;

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
		"Walk through the Lattices window manager — the landing page, workspace layouts, documentation, and live command integration. An agentic tiling manager for macOS.";
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
						<span style={{ color: dotVisible ? "#4ade80" : "#444", fontSize: 8 }}>
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
							overview
						</span>
					</div>
					<span
						style={{
							color: "rgba(175, 185, 200, 0.3)",
							fontSize: 10,
							letterSpacing: "0.06em",
						}}
					>
						LATTICES / UI WALKTHROUGH
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
							minHeight: 100,
						}}
					>
						<span style={{ color: "rgba(160, 170, 190, 0.4)" }}>{"› "}</span>
						{promptText.slice(0, charsVisible)}
						{showCursor && (
							<span
								style={{
									opacity: cursorVisible ? 0.7 : 0,
									color: "#4ade80",
									fontWeight: 300,
								}}
							>
								▎
							</span>
						)}
					</div>

					<div
						style={{
							marginTop: 24,
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							paddingTop: 16,
							borderTop: "1px solid rgba(160, 170, 190, 0.08)",
						}}
					>
						<span
							style={{
								color: "rgba(175, 185, 200, 0.35)",
								fontSize: 10,
								letterSpacing: "0.08em",
							}}
						>
							lattices · native macOS
						</span>
						<span
							style={{
								color: "rgba(175, 185, 200, 0.35)",
								fontSize: 10,
								letterSpacing: "0.08em",
							}}
						>
							{charsVisible} / {promptText.length} chars
						</span>
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

// ── Video clip with cross-dissolve ───────────────────────

const VideoClip: React.FC<{
	clip: Clip;
	fps: number;
	videoSrc: string;
	clipDurationFrames: number;
	isFirst: boolean;
	isLast: boolean;
}> = ({ clip, fps, videoSrc, clipDurationFrames, isFirst, isLast }) => {
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

	const innerW = 1920 * INNER_SCALE_X;
	const innerH = 1080 * INNER_SCALE_Y;
	const padX = (1920 - innerW) / 2;
	const padY = (1080 - innerH) / 2;

	const scaledW = innerW * CROP_SCALE;
	const scaledH = innerH * CROP_SCALE;
	const left = padX - (scaledW * CROP_CENTER_X - innerW * 0.5);
	const top = padY - (scaledH - innerH) / 2;

	return (
		<AbsoluteFill style={{ opacity, overflow: "hidden" }}>
			<OffthreadVideo
				src={staticFile(videoSrc)}
				startFrom={Math.floor(clip.startFrom * fps)}
				style={{
					position: "absolute",
					width: scaledW,
					height: scaledH,
					left,
					top,
					objectFit: "cover",
				}}
				volume={0}
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

export interface LatticesUIHighlightProps {
	videoSrc?: string;
	musicTrack?: string;
	musicVolume?: number;
	title?: string;
	subtitle?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
}

export const LatticesUIHighlight: React.FC<LatticesUIHighlightProps> = ({
	videoSrc = "demos/cleanshot-demo-2026-03-20.mp4",
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.3,
	title = "LATTICES",
	subtitle = "Window Manager",
	tagline = "The Agentic Window Manager",
	releaseDate = "2026",
	iconSrc = "lattices-icon.png",
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

			{/* Layer 5: Content clips */}
			{clipSequences.map(({ clip, from, clipFrames, index }) => (
				<Sequence
					key={index}
					name={`Clip-${clip.label}`}
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
export function calculateUIHighlightFrames(fps: number): number {
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
