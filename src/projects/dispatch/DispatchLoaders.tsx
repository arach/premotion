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

// Dispatch palette — monochrome silver/white
const SILVER = "200, 205, 215";
const HUD_COLOR = "180, 185, 195";
const BG = "#0a0a0e";

const LOGO_SIZE = 160;
const ICON_RADIUS = 32; // rounded square radius matching iOS icon

// ── Grid constants (shared by dot-build variants) ───────
const GRID = 14;
const DOT_RADIUS = 2.5;
const DOT_SPACING = LOGO_SIZE / GRID;
const CENTER = (GRID - 1) / 2;
const MAX_DIST = Math.sqrt(CENTER * CENTER + CENTER * CENTER);

// ─── 1. Pulse ───────────────────────────────────────────────────────
export const DispatchLoaderPulse: React.FC = () => {
	const frame = useCurrentFrame();

	const t = Math.sin((frame / 60) * Math.PI * 2);
	const scale = 1 + t * 0.02;
	const glowOpacity = 0.4 + t * 0.2;
	const ringOpacity = 0.15 + t * 0.08;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: BG,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Radial glow */}
			<div
				style={{
					position: "absolute",
					width: LOGO_SIZE * 2.5,
					height: LOGO_SIZE * 2.5,
					borderRadius: "50%",
					background: `radial-gradient(circle, rgba(${SILVER}, ${glowOpacity * 0.15}) 0%, rgba(${SILVER}, ${glowOpacity * 0.04}) 40%, transparent 70%)`,
				}}
			/>

			{/* Subtle ring echo */}
			<div
				style={{
					position: "absolute",
					width: LOGO_SIZE + 24,
					height: LOGO_SIZE + 24,
					borderRadius: ICON_RADIUS + 6,
					border: `1px solid rgba(${SILVER}, ${ringOpacity})`,
				}}
			/>

			{/* Icon */}
			<Img
				src={staticFile("dispatch-icon-1024.png")}
				style={{
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					borderRadius: ICON_RADIUS,
					transform: `scale(${scale})`,
				}}
			/>
		</AbsoluteFill>
	);
};

// ─── 2. Scan ────────────────────────────────────────────────────────
export const DispatchLoaderScan: React.FC = () => {
	const frame = useCurrentFrame();

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
			<div
				style={{
					position: "relative",
					width: LOGO_SIZE,
					height: LOGO_SIZE,
				}}
			>
				<Img
					src={staticFile("dispatch-icon-1024.png")}
					style={{
						width: LOGO_SIZE,
						height: LOGO_SIZE,
						borderRadius: ICON_RADIUS,
					}}
				/>

				<ScanEffect
					direction="horizontal"
					progress={progress}
					intensity={0.8}
					color={SILVER}
					showTrail
					showScanlines
					scanlineOpacity={0.06}
					borderRadius={ICON_RADIUS}
				/>
			</div>
		</AbsoluteFill>
	);
};

// ─── 2b. Scan + Wordmark Reveal ─────────────────────────────────────
// Same scan loop but ends with wordmark. 3s (90 frames).

export interface DispatchScanRevealProps {
	wordmark?: string;
}

export const DispatchScanReveal: React.FC<DispatchScanRevealProps> = ({ wordmark = "Dispatch" }) => {
	const frame = useCurrentFrame();

	// Scan sweeps over first 60 frames (same as DispatchLoaderScan)
	const progress = frame / 60;

	// Wordmark fades in after scan completes
	const wordmarkOpacity = interpolate(frame, [50, 70], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const wordmarkY = interpolate(frame, [50, 70], [10, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

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
			{/* Logo + scan */}
			<div
				style={{
					position: "relative",
					width: LOGO_SIZE,
					height: LOGO_SIZE,
				}}
			>
				<Img
					src={staticFile("dispatch-icon-1024.png")}
					style={{
						width: LOGO_SIZE,
						height: LOGO_SIZE,
						borderRadius: ICON_RADIUS,
					}}
				/>

				{frame <= 63 && (
					<ScanEffect
						direction="horizontal"
						progress={progress}
						intensity={0.8}
						color={SILVER}
						showTrail
						showScanlines
						scanlineOpacity={0.06}
						borderRadius={ICON_RADIUS}
					/>
				)}
			</div>

			{/* Wordmark */}
			<div
				style={{
					marginTop: 28,
					opacity: wordmarkOpacity,
					transform: `translateY(${wordmarkY}px)`,
				}}
			>
				<div
					style={{
						fontFamily: mono,
						color: `rgba(${HUD_COLOR}, 0.55)`,
						fontSize: 14,
						fontWeight: 400,
						letterSpacing: "0.35em",
						textTransform: "uppercase",
					}}
				>
					{wordmark}
				</div>
			</div>
		</AbsoluteFill>
	);
};

// ─── 3. Dot Build ───────────────────────────────────────────────────
export const DispatchLoaderDotBuild: React.FC = () => {
	const frame = useCurrentFrame();

	const dots: React.ReactNode[] = [];
	for (let row = 0; row < GRID; row++) {
		for (let col = 0; col < GRID; col++) {
			const dist = Math.sqrt((row - CENTER) ** 2 + (col - CENTER) ** 2);
			const normDist = dist / MAX_DIST;

			const dotDelay = normDist * 30;
			const fadeIn = interpolate(frame, [dotDelay, dotDelay + 10], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			});
			const fadeOut = interpolate(frame, [45, 60], [1, 0], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			});

			dots.push(
				<circle
					key={`${row}-${col}`}
					cx={col * DOT_SPACING + DOT_SPACING / 2}
					cy={row * DOT_SPACING + DOT_SPACING / 2}
					r={DOT_RADIUS}
					fill={`rgba(${SILVER}, ${Math.min(fadeIn, fadeOut)})`}
				/>,
			);
		}
	}

	const logoFadeIn = interpolate(frame, [25, 40], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const logoFadeOut = interpolate(frame, [45, 60], [1, 0], {
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
			<svg width={LOGO_SIZE} height={LOGO_SIZE} style={{ position: "absolute" }}>
				{dots}
			</svg>
			<Img
				src={staticFile("dispatch-icon-1024.png")}
				style={{
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					borderRadius: ICON_RADIUS,
					opacity: Math.min(logoFadeIn, logoFadeOut),
					position: "absolute",
				}}
			/>
		</AbsoluteFill>
	);
};

// ─── 4. Minimal ─────────────────────────────────────────────────────
export const DispatchLoaderMinimal: React.FC = () => {
	const frame = useCurrentFrame();

	const logoOpacity = interpolate(frame, [0, 30, 45, 60], [0, 1, 1, 0], {
		extrapolateRight: "clamp",
	});
	const logoScale = interpolate(frame, [0, 30], [0.92, 1.0], {
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const textOpacity = interpolate(frame, [10, 35, 45, 60], [0, 0.45, 0.45, 0], {
		extrapolateRight: "clamp",
	});

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
			<Img
				src={staticFile("dispatch-icon-1024.png")}
				style={{
					width: LOGO_SIZE,
					height: LOGO_SIZE,
					borderRadius: ICON_RADIUS,
					opacity: logoOpacity,
					transform: `scale(${logoScale})`,
				}}
			/>
			<span
				style={{
					fontFamily: mono,
					fontSize: 14,
					letterSpacing: "0.3em",
					color: `rgba(${HUD_COLOR}, ${textOpacity})`,
					textTransform: "uppercase",
				}}
			>
				DISPATCH
			</span>
		</AbsoluteFill>
	);
};

// ─── 5. Build + Scan ────────────────────────────────────────────────
// Dots assemble → icon materialises → scan confirms. 3s one-shot.

export const DispatchLoaderBuildScan: React.FC = () => {
	const frame = useCurrentFrame();

	// Phase 1: dots build from center outward
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
					fill={`rgba(${SILVER}, ${Math.min(dotOpacity, dotFadeOut)})`}
				/>,
			);
		}
	}

	// Phase 2: icon fades in
	const logoOpacity = interpolate(frame, [30, 48], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Phase 3: scan sweep
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

	// Settle glow
	const glowOpacity = interpolate(frame, [70, 85], [0, 0.3], {
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
			{/* Glow */}
			<div
				style={{
					position: "absolute",
					width: LOGO_SIZE * 2.5,
					height: LOGO_SIZE * 2.5,
					borderRadius: "50%",
					background: `radial-gradient(circle, rgba(${SILVER}, ${glowOpacity * 0.12}) 0%, rgba(${SILVER}, ${glowOpacity * 0.03}) 40%, transparent 70%)`,
				}}
			/>

			{/* Dots */}
			<svg width={LOGO_SIZE} height={LOGO_SIZE} style={{ position: "absolute" }}>
				{dots}
			</svg>

			{/* Icon + scan */}
			<div style={{ position: "relative", width: LOGO_SIZE, height: LOGO_SIZE }}>
				<Img
					src={staticFile("dispatch-icon-1024.png")}
					style={{
						width: LOGO_SIZE,
						height: LOGO_SIZE,
						borderRadius: ICON_RADIUS,
						opacity: logoOpacity,
					}}
				/>

				{scanActive && (
					<ScanEffect
						direction="vertical"
						progress={scanProgress}
						intensity={scanIntensity * 0.8}
						color={SILVER}
						showTrail
						showScanlines
						scanlineOpacity={0.05}
						borderRadius={ICON_RADIUS}
					/>
				)}
			</div>
		</AbsoluteFill>
	);
};
