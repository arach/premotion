import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	AbsoluteFill,
	Easing,
} from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";
import { ScanEffect } from "../../components/ScanEffect";

const { fontFamily: mono } = loadMono("normal", { weights: ["400"] });

const AMBER = "200, 95, 50";
const HUD_COLOR = "200, 160, 120";
const BG = "#08080b";

const LOGO_SIZE = 160;

// ─── 1. Pulse ────────────────────────────────────────────────────────
// Breathing glow + subtle scale pulse, seamless loop via sin(2*PI*f/60)

export const AmplinkLoaderPulse: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Full sine cycle over 60 frames (2*PI)
	const t = Math.sin((frame / 60) * Math.PI * 2);

	// Scale: 0.98 <-> 1.02
	const scale = 1 + t * 0.02;

	// Glow opacity: 0.25 <-> 0.65
	const glowOpacity = 0.45 + t * 0.2;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Radial amber glow */}
			<div
				style={{
					position: "absolute",
					width: LOGO_SIZE * 2.5,
					height: LOGO_SIZE * 2.5,
					borderRadius: "50%",
					background: `radial-gradient(circle, rgba(${AMBER}, ${glowOpacity * 0.5}) 0%, rgba(${AMBER}, ${glowOpacity * 0.15}) 40%, transparent 70%)`,
				}}
			/>

			{/* Logo */}
			<Img
				src={staticFile("amplink-logo.svg")}
				style={{
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					transform: `scale(${scale})`,
				}}
			/>
		</AbsoluteFill>
	);
};

// ─── 2. Scan ─────────────────────────────────────────────────────────
// Horizontal scan line sweeps top-to-bottom over the logo area

export const AmplinkLoaderScan: React.FC = () => {
	const frame = useCurrentFrame();

	// progress 0->1 over 60 frames, loops cleanly
	const progress = frame / 60;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Logo */}
			<div
				style={{
					position: "relative",
					width: LOGO_SIZE,
					height: LOGO_SIZE,
				}}
			>
				<Img
					src={staticFile("amplink-logo.svg")}
					style={{
						width: LOGO_SIZE,
						height: LOGO_SIZE,
					}}
				/>

				{/* Scan overlay pinned to logo bounds */}
				<ScanEffect
					direction="horizontal"
					progress={progress}
					intensity={1.2}
					color={AMBER}
					showTrail={true}
					showScanlines={true}
					scanlineOpacity={0.08}
					borderRadius={0}
				/>
			</div>
		</AbsoluteFill>
	);
};

// ─── 3. Dot Build ────────────────────────────────────────────────────
// Grid of dots fading in from center outward, then logo cross-fades on top

const GRID = 12;
const DOT_RADIUS = 3;
const DOT_SPACING = LOGO_SIZE / GRID;
const CENTER = (GRID - 1) / 2;

// Pre-compute max distance from center for normalisation
const MAX_DIST = Math.sqrt(CENTER * CENTER + CENTER * CENTER);

export const AmplinkLoaderDotBuild: React.FC = () => {
	const frame = useCurrentFrame();

	// Build up: frames 0-40, hold: 40-45, fade out: 45-60
	const dots: React.ReactNode[] = [];

	for (let row = 0; row < GRID; row++) {
		for (let col = 0; col < GRID; col++) {
			const dist = Math.sqrt(
				(row - CENTER) ** 2 + (col - CENTER) ** 2,
			);
			const normDist = dist / MAX_DIST; // 0 at center, 1 at corners

			// Stagger: center dots appear first
			const dotDelay = normDist * 30; // spread over 30 frames
			const fadeInOpacity = interpolate(frame, [dotDelay, dotDelay + 10], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			});

			// Fade out: frames 45-60
			const fadeOutOpacity = interpolate(frame, [45, 60], [1, 0], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			});

			const opacity = Math.min(fadeInOpacity, fadeOutOpacity);

			dots.push(
				<circle
					key={`${row}-${col}`}
					cx={col * DOT_SPACING + DOT_SPACING / 2}
					cy={row * DOT_SPACING + DOT_SPACING / 2}
					r={DOT_RADIUS}
					fill={`rgba(${AMBER}, ${opacity})`}
				/>,
			);
		}
	}

	// Logo fades in around frame 25-40, then fades out 45-60
	const logoFadeIn = interpolate(frame, [25, 40], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const logoFadeOut = interpolate(frame, [45, 60], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const logoOpacity = Math.min(logoFadeIn, logoFadeOut);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Dot grid */}
			<svg
				width={LOGO_SIZE}
				height={LOGO_SIZE}
				style={{ position: "absolute" }}
			>
				{dots}
			</svg>

			{/* Actual logo cross-fading on top */}
			<Img
				src={staticFile("amplink-logo.svg")}
				style={{
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					opacity: logoOpacity,
					position: "absolute",
				}}
			/>
		</AbsoluteFill>
	);
};

// ─── 5. Build + Scan ────────────────────────────────────────────────
// Dots assemble from center → logo materialises → scan confirms. 3s one-shot.

export const AmplinkLoaderBuildScan: React.FC = () => {
	const frame = useCurrentFrame();

	// Phase 1 (0-40): dots build from center outward
	const dots: React.ReactNode[] = [];
	for (let row = 0; row < GRID; row++) {
		for (let col = 0; col < GRID; col++) {
			const dist = Math.sqrt((row - CENTER) ** 2 + (col - CENTER) ** 2);
			const normDist = dist / MAX_DIST;

			const dotDelay = normDist * 30;
			const dotOpacity = interpolate(frame, [dotDelay, dotDelay + 10], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			});

			// Dots fade out as logo takes over (frames 35-50)
			const dotFadeOut = interpolate(frame, [35, 50], [1, 0], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			});

			dots.push(
				<circle
					key={`${row}-${col}`}
					cx={col * DOT_SPACING + DOT_SPACING / 2}
					cy={row * DOT_SPACING + DOT_SPACING / 2}
					r={DOT_RADIUS}
					fill={`rgba(${AMBER}, ${Math.min(dotOpacity, dotFadeOut)})`}
				/>,
			);
		}
	}

	// Phase 2 (30-48): logo fades in over the dots, then stays
	const logoOpacity = interpolate(frame, [30, 48], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Phase 3 (50-80): scan sweeps across the settled logo
	const scanActive = frame >= 48 && frame <= 82;
	const scanProgress = interpolate(frame, [48, 80], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const scanIntensity = interpolate(
		scanProgress,
		[0, 0.05, 0.9, 1],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// Subtle glow settles in after scan (80-90)
	const glowOpacity = interpolate(frame, [70, 85], [0, 0.35], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Ambient glow after scan */}
			<div
				style={{
					position: "absolute",
					width: LOGO_SIZE * 2.5,
					height: LOGO_SIZE * 2.5,
					borderRadius: "50%",
					background: `radial-gradient(circle, rgba(${AMBER}, ${glowOpacity * 0.4}) 0%, rgba(${AMBER}, ${glowOpacity * 0.1}) 40%, transparent 70%)`,
				}}
			/>

			{/* Dot grid */}
			<svg
				width={LOGO_SIZE}
				height={LOGO_SIZE}
				style={{ position: "absolute" }}
			>
				{dots}
			</svg>

			{/* Logo */}
			<div style={{ position: "relative", width: LOGO_SIZE, height: LOGO_SIZE }}>
				<Img
					src={staticFile("amplink-logo.svg")}
					style={{
						width: LOGO_SIZE,
						height: LOGO_SIZE,
						opacity: logoOpacity,
					}}
				/>

				{/* Scan pass over logo */}
				{scanActive && (
					<ScanEffect
						direction="vertical"
						progress={scanProgress}
						intensity={scanIntensity}
						color={AMBER}
						showTrail
						showScanlines
						scanlineOpacity={0.06}
						borderRadius={0}
					/>
				)}
			</div>
		</AbsoluteFill>
	);
};

// ─── 4. Minimal ──────────────────────────────────────────────────────
// Simple fade-in / hold / fade-out with text label

export const AmplinkLoaderMinimal: React.FC = () => {
	const frame = useCurrentFrame();

	// Logo: fade in 0-30, hold 30-45, fade out 45-60
	const logoOpacity = interpolate(
		frame,
		[0, 30, 45, 60],
		[0, 1, 1, 0],
		{ extrapolateRight: "clamp" },
	);

	// Scale: 0.92 -> 1.0 over 0-30, hold at 1.0 after
	const logoScale = interpolate(frame, [0, 30], [0.92, 1.0], {
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Text fades in slightly after logo (frames 10-35), out 45-60
	const textOpacity = interpolate(
		frame,
		[10, 35, 45, 60],
		[0, 0.5, 0.5, 0],
		{ extrapolateRight: "clamp" },
	);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 28,
			}}
		>
			{/* Logo */}
			<Img
				src={staticFile("amplink-logo.svg")}
				style={{
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					opacity: logoOpacity,
					transform: `scale(${logoScale})`,
				}}
			/>

			{/* AMPLINK text */}
			<span
				style={{
					fontFamily: mono,
					fontSize: 14,
					letterSpacing: "0.3em",
					color: `rgba(${HUD_COLOR}, ${textOpacity})`,
					textTransform: "uppercase",
				}}
			>
				AMPLINK
			</span>
		</AbsoluteFill>
	);
};
