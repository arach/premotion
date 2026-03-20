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
		label: "SCOUT RADAR",
		sublabel: "Procedural icon generation",
		startFrom: 3,
		duration: 7,
	},
	{
		label: "SCOUT LATTICE",
		sublabel: "S-curve glyph refinement",
		startFrom: 135,
		duration: 7,
	},
	{
		label: "SCOUT RADIO",
		sublabel: "Multi-agent AI prompting",
		startFrom: 235,
		duration: 8,
	},
	{
		label: "GLYPH ENGINE",
		sublabel: "Pixel matrix rasterization",
		startFrom: 335,
		duration: 7,
	},
	{
		label: "FINAL GLYPH",
		sublabel: "AI-assisted code surgery",
		startFrom: 540,
		duration: 8,
	},
];

const INTRO_DURATION = 3; // seconds
const PROMPT_DURATION = 6; // seconds — opening directive
const OUTRO_DURATION = 4; // seconds
const OVERLAP_FRAMES = 18; // ~0.6s cross-dissolve overlap between clips

// ── Crop settings ────────────────────────────────────────
// Source: 2550x1440. App spans 18px to 1840px (72% of frame).
// We crop to the app region, add padding on all sides, and shift slightly right.
const CROP_SCALE = 1.4;
const CROP_CENTER_X = 0.37; // slightly right of app center for balance
const INNER_SCALE_X = 0.72; // horizontal: 72% of frame
const INNER_SCALE_Y = 0.64; // vertical: 64% of frame — more top/bottom padding

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

	// Card slide up
	const cardY = interpolate(frame, [0, 0.6 * fps], [20, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Card chrome appears
	const chromeOpacity = interpolate(frame, [0.1 * fps, 0.5 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	const promptText =
		"Design a logo system for Scout — an agent communication platform. Explore pixel matrices, lattice grids, and multi-fill shape compositions. Three proposals, all generative, all parameterized.";
	const charsVisible = Math.floor(
		interpolate(frame, [0.6 * fps, 4.0 * fps], [0, promptText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);

	const cursorVisible = Math.floor(frame / 8) % 2 === 0;
	const showCursor = charsVisible < promptText.length || frame < 4.5 * fps;

	// Scanline
	const scanlineY = (frame * 2.5) % height;

	// Blinking status dot
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
				{/* Card chrome — title bar */}
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
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<span
							style={{
								color: dotVisible ? "#6a8" : "#444",
								fontSize: 8,
							}}
						>
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
							prompt
						</span>
					</div>
					<span
						style={{
							color: "rgba(175, 185, 200, 0.3)",
							fontSize: 10,
							letterSpacing: "0.06em",
						}}
					>
						HUDSON / SESSION 01
					</span>
				</div>

				{/* Card body — bezel */}
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
					{/* Prompt text */}
					<div
						style={{
							color: "#d8d8e4",
							fontSize: 20,
							lineHeight: 1.7,
							fontWeight: 400,
							letterSpacing: "0.02em",
							fontFamily: mono,
							minHeight: 120,
						}}
					>
						<span style={{ color: "rgba(160, 170, 190, 0.4)" }}>
							{"› "}
						</span>
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

					{/* Bottom status row */}
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
							claude-opus-4 · streaming
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

	// Cross-dissolve: fade in at start, fade out at end
	// First clip only fades in (intro handles lead-in)
	// Last clip only fades out (outro handles lead-out)
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

	// Inner frame with padding — more on top/bottom than sides
	const innerW = 1920 * INNER_SCALE_X;
	const innerH = 1080 * INNER_SCALE_Y;
	const padX = (1920 - innerW) / 2;
	const padY = (1080 - innerH) / 2;

	// Scaled video within the inner frame
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

export interface HudsonHighlightReelProps {
	videoSrc?: string;
	musicTrack?: string;
	musicVolume?: number;
	title?: string;
	subtitle?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
}

export const HudsonHighlightReel: React.FC<HudsonHighlightReelProps> = ({
	videoSrc = "demos/cleanshot-demo-2026-03-19-1633.mp4",
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.3,
	title = "HUDSON",
	subtitle = "Design System",
	tagline = "Generative Design Tools",
	releaseDate = "2026",
	iconSrc = "arach-circle.png",
}) => {
	const { fps, durationInFrames } = useVideoConfig();

	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);

	// Build clip timeline with overlapping transitions
	// Clips overlap by OVERLAP_FRAMES for smooth cross-dissolves
	let cursor = introFrames + promptFrames;
	const clipSequences = CLIPS.map((clip, i) => {
		const clipFrames = Math.floor(clip.duration * fps);
		const from = cursor;
		// Next clip starts OVERLAP_FRAMES before this one ends
		cursor += clipFrames - OVERLAP_FRAMES;
		return { clip, from, clipFrames, index: i };
	});

	// After last clip, add back the final overlap since it's not shared
	const outroStart = cursor + OVERLAP_FRAMES;
	const outroFrames = Math.floor(OUTRO_DURATION * fps);

	const sfxVolume = 0.35;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Layer 1: Background Music — continuous, no cuts */}
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

			{/* Layer 5: Content clips — overlapping for cross-dissolve */}
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
export function calculateHighlightFrames(fps: number): number {
	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);
	const outroFrames = Math.floor(OUTRO_DURATION * fps);
	const clipFrames = CLIPS.reduce(
		(sum, clip) => sum + Math.floor(clip.duration * fps),
		0,
	);
	// Subtract overlaps between clips (n-1 overlaps)
	const overlapFrames = (CLIPS.length - 1) * OVERLAP_FRAMES;
	return introFrames + promptFrames + clipFrames - overlapFrames + outroFrames;
}
