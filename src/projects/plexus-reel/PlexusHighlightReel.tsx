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
import { IPhoneFrame } from "../../components/iPhoneFrame";

// ── Clip definitions ─────────────────────────────────────
// Curated moments from the two Plexus iOS recordings.
// Source videos are 1126x2436 @ 60fps portrait iPhone Pro.

interface Clip {
	label: string;
	sublabel: string;
	videoSrc: string;
	startFrom: number; // seconds into source (accounts for 3s control center)
	duration: number;
}

const CLIPS: Clip[] = [
	// Act 1: The empty canvas
	{
		label: "EMPTY STATE",
		sublabel: "New conversation",
		videoSrc: "demos/plexus-ios-voice-2026-03-30.mp4",
		startFrom: 4,
		duration: 4,
	},
	// Act 2: Voice capture in action
	{
		label: "VOICE INPUT",
		sublabel: "Hold to record",
		videoSrc: "demos/plexus-ios-voice-2026-03-30.mp4",
		startFrom: 7,
		duration: 5,
	},
	// Act 3: Agent response flowing in
	{
		label: "AGENT RESPONSE",
		sublabel: "Project status report",
		videoSrc: "demos/plexus-ios-voice-2026-03-30.mp4",
		startFrom: 20,
		duration: 12,
	},
	// Act 4: Scrolling through the detailed response
	{
		label: "DEEP CONTEXT",
		sublabel: "Commit history & CI pipeline",
		videoSrc: "demos/plexus-ios-voice-2026-03-30.mp4",
		startFrom: 42,
		duration: 10,
	},
	// Act 5: Human replies with text
	{
		label: "TEXT REPLY",
		sublabel: "Multimodal input",
		videoSrc: "demos/plexus-ios-voice-2026-03-30.mp4",
		startFrom: 88,
		duration: 8,
	},
	// Act 6: Follow-up — thought process visible
	{
		label: "THOUGHT PROCESS",
		sublabel: "Agent reasoning exposed",
		videoSrc: "demos/plexus-ios-followup-2026-03-30.mp4",
		startFrom: 4,
		duration: 6,
	},
	// Act 7: Instant follow-up response
	{
		label: "INSTANT ANSWER",
		sublabel: "Git status in seconds",
		videoSrc: "demos/plexus-ios-followup-2026-03-30.mp4",
		startFrom: 15,
		duration: 8,
	},
];

const INTRO_DURATION = 3;
const PROMPT_DURATION = 4;
const OUTRO_DURATION = 3;
const OVERLAP_FRAMES = 15;

// ── Prompt card ──────────────────────────────────────────

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

	const promptText = "Talk to your agents. Ask anything. Get answers instantly.";
	const charsVisible = Math.floor(
		interpolate(frame, [0.6 * fps, 2.8 * fps], [0, promptText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);
	const cursorVisible = Math.floor(frame / 8) % 2 === 0;
	const showCursor = charsVisible < promptText.length || frame < 3.2 * fps;
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
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.025 * chromeOpacity,
					backgroundImage: `
						linear-gradient(rgba(160,170,190,0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(160,170,190,0.35) 1px, transparent 1px)
					`,
					backgroundSize: "50px 50px",
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: scanlineY,
					left: 0,
					right: 0,
					height: 1,
					backgroundColor: "rgba(160,170,190,0.025)",
					opacity: chromeOpacity,
				}}
			/>
			<div style={{ transform: `translateY(${cardY}px)`, width: "82%", fontFamily: mono }}>
				<div
					style={{
						opacity: chromeOpacity,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 16px",
						backgroundColor: "rgba(160,170,190,0.06)",
						borderTop: "1px solid rgba(160,170,190,0.12)",
						borderLeft: "1px solid rgba(160,170,190,0.12)",
						borderRight: "1px solid rgba(160,170,190,0.12)",
						borderRadius: "6px 6px 0 0",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={{ color: dotVisible ? "#6a8" : "#444", fontSize: 8 }}>●</span>
						<span style={{ color: "rgba(175,185,200,0.6)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
							voice agent
						</span>
					</div>
					<span style={{ color: "rgba(175,185,200,0.3)", fontSize: 10, letterSpacing: "0.06em" }}>
						PLEXUS / iOS
					</span>
				</div>
				<div
					style={{
						opacity: chromeOpacity,
						padding: "28px 22px",
						backgroundColor: "rgba(160,170,190,0.03)",
						border: "1px solid rgba(160,170,190,0.12)",
						borderTop: "none",
						borderRadius: "0 0 6px 6px",
					}}
				>
					<div style={{ color: "#d8d8e4", fontSize: 18, lineHeight: 1.7, fontWeight: 400, letterSpacing: "0.02em", fontFamily: mono, minHeight: 50 }}>
						<span style={{ color: "rgba(160,170,190,0.4)" }}>{"› "}</span>
						{promptText.slice(0, charsVisible)}
						{showCursor && (
							<span style={{ opacity: cursorVisible ? 0.7 : 0, color: "#6a8", fontWeight: 300 }}>▎</span>
						)}
					</div>
				</div>
			</div>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.4) 100%)",
					pointerEvents: "none",
				}}
			/>
		</AbsoluteFill>
	);
};

// ── Scene label (bottom, portrait-friendly) ──────────────

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
	const fadeOut = interpolate(clipFrame, [clipDuration - 0.5 * fps, clipDuration], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
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
				bottom: 80,
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
			<div style={{ color: "#e0e0e8", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ color: "rgba(175,185,200,0.6)", fontSize: 10, letterSpacing: "0.06em", marginBottom: 8 }}>
				{sublabel}
			</div>
			<div style={{ width: 100, height: 2, backgroundColor: "rgba(160,170,190,0.15)", borderRadius: 1 }}>
				<div style={{ width: `${progress}%`, height: "100%", backgroundColor: "rgba(160,170,190,0.5)", borderRadius: 1 }} />
			</div>
		</div>
	);
};

// ── Tactical guide frame (portrait-adapted) ──────────────

const TacticalFrame: React.FC<{
	clipFrame: number;
	clipDuration: number;
	fps: number;
}> = ({ clipFrame, clipDuration, fps }) => {
	const { height } = useVideoConfig();
	const guideMargin = 20;

	const fadeIn = interpolate(clipFrame, [0, 0.4 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(clipFrame, [clipDuration - 0.5 * fps, clipDuration], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const opacity = fadeIn * fadeOut;
	const guideColor = "rgba(160,170,190,0.25)";
	const textColor = "rgba(175,185,200,0.55)";
	const scanlineY = (clipFrame * 2.5) % height;
	const recDotVisible = Math.floor(clipFrame / (fps * 0.5)) % 2 === 0;

	return (
		<AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
			{/* Scanline */}
			<div style={{ position: "absolute", top: scanlineY, left: 0, right: 0, height: 1, backgroundColor: "rgba(160,170,190,0.02)" }} />

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, backgroundColor: guideColor }} />

			{/* Top-left */}
			<div style={{ position: "absolute", top: guideMargin + 6, left: guideMargin + 8, fontFamily: "SF Mono, Monaco, Consolas, monospace", fontSize: 9, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ fontWeight: 600, color: "#d8d8e0" }}>PLEXUS</span>
				<span style={{ color: textColor, opacity: 0.4 }}>—</span>
				<span style={{ color: textColor }}>iOS</span>
			</div>

			{/* Top-right */}
			<div style={{ position: "absolute", top: guideMargin + 6, right: guideMargin + 8, fontFamily: "SF Mono, Monaco, Consolas, monospace", color: textColor, fontSize: 9, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8 }}>
				<span>1126×2436</span>
				<span>60fps</span>
			</div>

			{/* Bottom-left */}
			<div style={{ position: "absolute", bottom: guideMargin + 6, left: guideMargin + 8, fontFamily: "SF Mono, Monaco, Consolas, monospace", color: textColor, fontSize: 9, letterSpacing: "0.06em" }}>
				v0.1.0
			</div>

			{/* Bottom-right: REC */}
			<div style={{ position: "absolute", bottom: guideMargin + 6, right: guideMargin + 8, fontFamily: "SF Mono, Monaco, Consolas, monospace", color: textColor, fontSize: 9, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
				<span style={{ color: recDotVisible ? "#6a8" : "#555", fontSize: 6 }}>●</span>
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

	const fadeIn = interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: isFirst ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
	});
	const fadeOut = interpolate(
		frame,
		[clipDurationFrames - OVERLAP_FRAMES, clipDurationFrames],
		[1, 0],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
			easing: isLast ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
		},
	);
	const opacity = fadeIn * fadeOut;

	return (
		<AbsoluteFill style={{ opacity, backgroundColor: "#0a0a0e" }}>
			{/* iPhone frame with video inside */}
			<IPhoneFrame powerOnEffect={isFirst}>
				<OffthreadVideo
					src={staticFile(clip.videoSrc)}
					startFrom={Math.floor(clip.startFrom * fps)}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
					volume={0.7}
				/>
			</IPhoneFrame>
			{/* Tactical chrome */}
			<TacticalFrame clipFrame={frame} clipDuration={clipDurationFrames} fps={fps} />
			{/* Scene label */}
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

export interface PlexusHighlightReelProps {
	musicTrack?: string;
	musicVolume?: number;
	title?: string;
	subtitle?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
}

export const PlexusHighlightReel: React.FC<PlexusHighlightReelProps> = ({
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.15,
	title = "PLEXUS",
	subtitle = "Voice Agent",
	tagline = "Talk to Your Agents",
	releaseDate = "2026",
	iconSrc = "arach-circle.png",
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
			{/* Music — ducked low to let voice through */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile(musicTrack)}
					volume={(f) => {
						const fadeInEnd = 1.5 * fps;
						const fadeOutStart = durationInFrames - 2.0 * fps;
						if (f < fadeInEnd) return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
						if (f > fadeOutStart) return interpolate(f, [fadeOutStart, durationInFrames], [musicVolume, 0]);
						// Duck during content
						const contentStart = introFrames + promptFrames;
						if (f >= contentStart && f < outroStart) return musicVolume * 0.4;
						return musicVolume;
					}}
				/>
			</Sequence>

			{/* SFX */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				<Sequence from={0} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
				</Sequence>
				<Sequence from={outroStart + Math.floor(0.5 * fps)} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={sfxVolume * 0.5} />
				</Sequence>
			</Sequence>

			{/* Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro title={title} subtitle={subtitle} iconSrc={iconSrc} />
			</Sequence>

			{/* Prompt */}
			<Sequence name="Prompt" from={introFrames} durationInFrames={promptFrames}>
				<PromptCard />
			</Sequence>

			{/* Content clips */}
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

			{/* Outro */}
			<Sequence name="Outro" from={outroStart} durationInFrames={outroFrames}>
				<TacticalOutro title={title} tagline={tagline} releaseDate={releaseDate} iconSrc={iconSrc} />
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculatePlexusReelFrames(fps: number): number {
	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);
	const outroFrames = Math.floor(OUTRO_DURATION * fps);
	const clipFrames = CLIPS.reduce((sum, clip) => sum + Math.floor(clip.duration * fps), 0);
	const overlapFrames = (CLIPS.length - 1) * OVERLAP_FRAMES;
	return introFrames + promptFrames + clipFrames - overlapFrames + outroFrames;
}
