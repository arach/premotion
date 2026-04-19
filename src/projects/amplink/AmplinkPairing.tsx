import {
	useCurrentFrame,
	useVideoConfig,
	Sequence,
	AbsoluteFill,
	Audio,
	staticFile,
	interpolate,
	Img,
	OffthreadVideo,
	Easing,
	spring,
} from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";
import { IPhoneFrame } from "../../components/iPhoneFrame";

const { fontFamily: mono } = loadMono("normal", { weights: ["400"] });

const AMBER = "200, 95, 50";
const HUD_COLOR = "200, 160, 120";
const GUIDE_COLOR = `rgba(${HUD_COLOR}, 0.25)`;
const TEXT_COLOR = `rgba(${HUD_COLOR}, 0.55)`;
const BG = "#08080b";

// ── Clip definitions ────────────────────────────────────
interface Clip {
	label: string;
	sublabel: string;
	startFrom: number; // seconds into source
	duration: number;
}

const CLIPS: Clip[] = [
	{
		label: "OPEN SESSION",
		sublabel: "Select your linked agent",
		startFrom: 5,
		duration: 4,
	},
	{
		label: "SEND A MESSAGE",
		sublabel: "Voice or text to your desktop",
		startFrom: 14,
		duration: 5,
	},
	{
		label: "GET A RESPONSE",
		sublabel: "Agent replies from your machine",
		startFrom: 24,
		duration: 4,
	},
	{
		label: "KEEP TALKING",
		sublabel: "Voice-driven coding sessions",
		startFrom: 62,
		duration: 5,
	},
];

const VIDEO_SRC = "demos/amplink-pairing.mp4";
const INTRO_DURATION = 2.5;
const PROMPT_DURATION = 3.5;
const OUTRO_DURATION = 2.5;
const OVERLAP_FRAMES = 15;

// ── Prompt card ─────────────────────────────────────────

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

	const promptText = "Pair with your desktop agent. Talk, code, ship.";
	const charsVisible = Math.floor(
		interpolate(frame, [0.6 * fps, 2.4 * fps], [0, promptText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);
	const cursorVisible = Math.floor(frame / 8) % 2 === 0;
	const showCursor = charsVisible < promptText.length || frame < 2.8 * fps;
	const scanlineY = (frame * 2.5) % height;
	const dotVisible = Math.floor(frame / (fps * 0.5)) % 2 === 0;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				opacity,
			}}
		>
			{/* Grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.025 * chromeOpacity,
					backgroundImage: `
						linear-gradient(rgba(${HUD_COLOR}, 0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(${HUD_COLOR}, 0.35) 1px, transparent 1px)
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
					backgroundColor: `rgba(${HUD_COLOR}, 0.025)`,
					opacity: chromeOpacity,
				}}
			/>
			<div style={{ transform: `translateY(${cardY}px)`, width: "82%", fontFamily: mono }}>
				{/* Header bar */}
				<div
					style={{
						opacity: chromeOpacity,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 16px",
						backgroundColor: `rgba(${AMBER}, 0.04)`,
						borderTop: `1px solid rgba(${AMBER}, 0.15)`,
						borderLeft: `1px solid rgba(${AMBER}, 0.15)`,
						borderRight: `1px solid rgba(${AMBER}, 0.15)`,
						borderRadius: "6px 6px 0 0",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={{ color: dotVisible ? `rgba(${AMBER}, 0.9)` : "#444", fontSize: 8 }}>●</span>
						<span style={{ color: `rgba(${HUD_COLOR}, 0.6)`, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
							bridge active
						</span>
					</div>
					<span style={{ color: `rgba(${HUD_COLOR}, 0.3)`, fontSize: 10, letterSpacing: "0.06em" }}>
						AMPLINK / MOBILE
					</span>
				</div>
				{/* Body */}
				<div
					style={{
						opacity: chromeOpacity,
						padding: "28px 22px",
						backgroundColor: `rgba(${AMBER}, 0.02)`,
						border: `1px solid rgba(${AMBER}, 0.15)`,
						borderTop: "none",
						borderRadius: "0 0 6px 6px",
					}}
				>
					<div style={{ color: "#e0dcd8", fontSize: 18, lineHeight: 1.7, fontWeight: 400, letterSpacing: "0.02em", fontFamily: mono, minHeight: 50 }}>
						<span style={{ color: `rgba(${AMBER}, 0.5)` }}>{"› "}</span>
						{promptText.slice(0, charsVisible)}
						{showCursor && (
							<span style={{ opacity: cursorVisible ? 0.7 : 0, color: `rgba(${AMBER}, 0.9)`, fontWeight: 300 }}>▎</span>
						)}
					</div>
				</div>
			</div>
			{/* Vignette */}
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

// ── Scene label with progress bar ───────────────────────

const SceneLabel: React.FC<{
	label: string;
	sublabel: string;
}> = ({ label, sublabel }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const fadeIn = interpolate(frame, [0.2 * fps, 0.6 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(frame, [durationInFrames - 0.5 * fps, durationInFrames], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const opacity = fadeIn * fadeOut;
	const slideY = interpolate(frame, [0.2 * fps, 0.6 * fps], [8, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<div
			style={{
				marginTop: 20,
				opacity,
				transform: `translateY(${slideY}px)`,
				fontFamily: mono,
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				zIndex: 10,
			}}
		>
			<div style={{ color: "#e8e4e0", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ color: `rgba(${HUD_COLOR}, 0.6)`, fontSize: 10, letterSpacing: "0.06em", marginBottom: 8 }}>
				{sublabel}
			</div>
			<div style={{ width: 100, height: 2, backgroundColor: `rgba(${AMBER}, 0.15)`, borderRadius: 1 }}>
				<div style={{ width: `${progress}%`, height: "100%", backgroundColor: `rgba(${AMBER}, 0.6)`, borderRadius: 1 }} />
			</div>
		</div>
	);
};

// ── Tactical guide frame ────────────────────────────────

const TacticalFrame: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames, height } = useVideoConfig();

	const guideMargin = 20;
	const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const fadeOut = interpolate(frame, [durationInFrames - 0.5 * fps, durationInFrames], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const opacity = fadeIn * fadeOut;
	const scanlineY = (frame * 2.5) % height;
	const recDotVisible = Math.floor(frame / (fps * 0.5)) % 2 === 0;

	return (
		<AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
			{/* Scanline */}
			<div style={{ position: "absolute", top: scanlineY, left: 0, right: 0, height: 1, backgroundColor: `rgba(${HUD_COLOR}, 0.02)` }} />

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: GUIDE_COLOR }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: GUIDE_COLOR }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, backgroundColor: GUIDE_COLOR }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, backgroundColor: GUIDE_COLOR }} />

			{/* Top-left */}
			<div style={{ position: "absolute", top: guideMargin + 6, left: guideMargin + 8, fontFamily: mono, fontSize: 9, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8 }}>
				<span style={{ fontWeight: 600, color: "#e8e4e0" }}>AMPLINK</span>
				<span style={{ color: TEXT_COLOR, opacity: 0.4 }}>—</span>
				<span style={{ color: TEXT_COLOR }}>Mobile</span>
			</div>

			{/* Top-right */}
			<div style={{ position: "absolute", top: guideMargin + 6, right: guideMargin + 8, fontFamily: mono, color: TEXT_COLOR, fontSize: 9, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8 }}>
				<span>WebSocket / TLS</span>
			</div>

			{/* Bottom-left */}
			<div style={{ position: "absolute", bottom: guideMargin + 6, left: guideMargin + 8, fontFamily: mono, color: TEXT_COLOR, fontSize: 9, letterSpacing: "0.06em" }}>
				v1.0.0
			</div>

			{/* Bottom-right: REC */}
			<div style={{ position: "absolute", bottom: guideMargin + 6, right: guideMargin + 8, fontFamily: mono, color: TEXT_COLOR, fontSize: 9, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
				<span style={{ color: recDotVisible ? `rgba(${AMBER}, 0.9)` : "#555", fontSize: 6 }}>●</span>
				<span>LINKED</span>
			</div>
		</AbsoluteFill>
	);
};

// ── Video clip with cross-dissolve ──────────────────────

const VideoClip: React.FC<{
	clip: Clip;
	isFirst: boolean;
	isLast: boolean;
}> = ({ clip, isFirst, isLast }) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const fadeIn = interpolate(frame, [0, OVERLAP_FRAMES], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: isFirst ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
	});
	const fadeOut = interpolate(
		frame,
		[durationInFrames - OVERLAP_FRAMES, durationInFrames],
		[1, 0],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
			easing: isLast ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
		},
	);
	const opacity = fadeIn * fadeOut;

	// Ambient glow pulse
	const glowOpacity = interpolate(Math.sin(frame / 30), [-1, 1], [0.03, 0.06]);

	return (
		<AbsoluteFill style={{ opacity, backgroundColor: BG }}>
			{/* Ambient glow */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(ellipse 40% 50% at 50% 50%, rgba(${AMBER}, ${glowOpacity}) 0%, transparent 70%)`,
					zIndex: 0,
				}}
			/>

			{/* iPhone — self-centers via useVideoConfig */}
			<IPhoneFrame
				powerOnEffect={isFirst}
				showGlow
				glowColor={`rgba(${AMBER}, 0.25)`}
				phoneSizePct={0.68}
			>
				<OffthreadVideo
					src={staticFile(VIDEO_SRC)}
					startFrom={Math.floor(clip.startFrom * fps)}
					style={{ width: "100%", height: "100%", objectFit: "cover" }}
					volume={0}
				/>
			</IPhoneFrame>

			{/* Caption below phone */}
			<div
				style={{
					position: "absolute",
					bottom: 80,
					left: 0,
					right: 0,
				}}
			>
				<SceneLabel label={clip.label} sublabel={clip.sublabel} />
			</div>

			{/* Tactical chrome */}
			<TacticalFrame />
		</AbsoluteFill>
	);
};

// ── Main Composition ────────────────────────────────────

export const AmplinkPairing: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);

	// Build clip timeline with overlaps
	let cursor = introFrames + promptFrames - OVERLAP_FRAMES;
	const clipSequences = CLIPS.map((clip, i) => {
		const clipFrames = Math.floor(clip.duration * fps);
		const from = cursor;
		cursor += clipFrames - OVERLAP_FRAMES;
		return { clip, from, clipFrames, index: i };
	});

	const outroStart = cursor;
	const outroFrames = Math.floor(OUTRO_DURATION * fps);
	const musicVolume = 0.3;
	const sfxVolume = 0.3;

	// Outro animations
	const outroOpacity = interpolate(
		frame,
		[outroStart, outroStart + 0.5 * fps],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const outroScale = spring({
		frame: frame - outroStart,
		fps,
		config: { damping: 20, stiffness: 100 },
	});

	return (
		<AbsoluteFill style={{ backgroundColor: BG }}>
			{/* Music */}
			<Audio
				src={staticFile("tracks/futuristic-synthwave.mp3")}
				volume={(f) => {
					const fadeInEnd = 1.5 * fps;
					const fadeOutStart = durationInFrames - 2.0 * fps;
					if (f < fadeInEnd) return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
					if (f > fadeOutStart) return interpolate(f, [fadeOutStart, durationInFrames], [musicVolume, 0]);
					// Duck during clips
					const contentStart = introFrames + promptFrames;
					if (f >= contentStart && f < outroStart) return musicVolume * 0.5;
					return musicVolume;
				}}
			/>

			{/* SFX */}
			<Sequence from={0} durationInFrames={30}>
				<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
			</Sequence>
			<Sequence from={outroStart + Math.floor(0.5 * fps)} durationInFrames={45}>
				<Audio src={staticFile("sfx/cortex_wave.wav")} volume={sfxVolume * 0.5} />
			</Sequence>

			{/* === INTRO === */}
			<Sequence from={0} durationInFrames={introFrames} name="Intro">
				<AmplinkIntroSection />
			</Sequence>

			{/* === PROMPT CARD === */}
			<Sequence from={introFrames - OVERLAP_FRAMES} durationInFrames={promptFrames + OVERLAP_FRAMES} name="Prompt">
				<PromptCard />
			</Sequence>

			{/* === VIDEO CLIPS === */}
			{clipSequences.map(({ clip, from, clipFrames, index }) => (
				<Sequence
					key={index}
					name={`Clip-${clip.label}`}
					from={from}
					durationInFrames={clipFrames}
				>
					<VideoClip
						clip={clip}
						isFirst={index === 0}
						isLast={index === CLIPS.length - 1}
					/>
				</Sequence>
			))}

			{/* === OUTRO === */}
			<Sequence from={outroStart} durationInFrames={outroFrames} name="Outro">
				<AbsoluteFill
					style={{
						backgroundColor: BG,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						opacity: outroOpacity,
					}}
				>
					<div
						style={{
							transform: `scale(${interpolate(outroScale, [0, 1], [0.85, 1])})`,
							textAlign: "center",
						}}
					>
						<Img
							src={staticFile("amplink-logo.svg")}
							style={{ width: 140, height: 140, marginBottom: 20 }}
						/>
						<div
							style={{
								fontFamily: mono,
								color: "#e8e4e0",
								fontSize: 20,
								letterSpacing: "0.14em",
								textTransform: "uppercase",
							}}
						>
							Connected
						</div>
						<div
							style={{
								fontFamily: mono,
								fontSize: 14,
								color: `rgba(${AMBER}, 0.7)`,
								marginTop: 14,
								letterSpacing: "0.08em",
							}}
						>
							amplink.cloud
						</div>
					</div>
				</AbsoluteFill>
			</Sequence>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%)",
					pointerEvents: "none",
					zIndex: 5,
				}}
			/>
		</AbsoluteFill>
	);
};

// ── Intro section (Amplink branded) ─────────────────────

const AmplinkIntroSection: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const logoOpacity = interpolate(
		frame,
		[0.2 * fps, 0.6 * fps, durationInFrames - 0.4 * fps, durationInFrames],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const logoScale = spring({
		frame: frame - 0.2 * fps,
		fps,
		config: { damping: 22, stiffness: 80, mass: 1 },
	});
	const titleOpacity = interpolate(
		frame,
		[0.7 * fps, 1.2 * fps, durationInFrames - 0.4 * fps, durationInFrames],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const titleY = interpolate(frame, [0.7 * fps, 1.2 * fps], [14, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const subtitleOpacity = interpolate(
		frame,
		[1.2 * fps, 1.7 * fps, durationInFrames - 0.4 * fps, durationInFrames],
		[0, 0.55, 0.55, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				style={{
					opacity: logoOpacity,
					transform: `scale(${interpolate(logoScale, [0, 1], [0.9, 1])})`,
				}}
			>
				<Img
					src={staticFile("amplink-logo.svg")}
					style={{ width: 220, height: 220 }}
				/>
			</div>
			<div
				style={{
					marginTop: 28,
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
				}}
			>
				<div
					style={{
						fontFamily: mono,
						color: "#e8e4e0",
						fontSize: 20,
						letterSpacing: "0.14em",
						textTransform: "uppercase",
					}}
				>
					Amplink
				</div>
			</div>
			<div
				style={{
					marginTop: 12,
					opacity: subtitleOpacity,
					fontFamily: mono,
					color: `rgba(${HUD_COLOR}, 0.8)`,
					fontSize: 15,
					letterSpacing: "0.14em",
					textTransform: "uppercase",
				}}
			>
				Mobile Pairing
			</div>
		</AbsoluteFill>
	);
};

// Duration calculator for Root.tsx
export function calculateAmplinkPairingFrames(fps: number): number {
	const introFrames = Math.floor(INTRO_DURATION * fps);
	const promptFrames = Math.floor(PROMPT_DURATION * fps);
	const outroFrames = Math.floor(OUTRO_DURATION * fps);
	const clipFrames = CLIPS.reduce((sum, clip) => sum + Math.floor(clip.duration * fps), 0);
	const overlapFrames = (CLIPS.length + 1) * OVERLAP_FRAMES;
	return introFrames + promptFrames + clipFrames - overlapFrames + outroFrames;
}
