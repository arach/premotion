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
import { loadFont as loadDisplay } from "@remotion/google-fonts/InstrumentSerif";
import { ScanEffect } from "../../components/ScanEffect";

const { fontFamily: mono } = loadMono("normal", { weights: ["400"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"] });

const BG = "#000000";

// 3 seconds = 90 frames at 30fps
// Phase 1 (0-30):  Logo visible, scan sweeps across
// Phase 2 (25-55): Logo holds, wordmark fades in below
// Phase 3 (55-90): Hold both, gentle settle

export interface ScoutScanRevealProps {
	wordmark?: string;
}

export const ScoutScanReveal: React.FC<ScoutScanRevealProps> = ({ wordmark = "OpenScout" }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Logo — fully visible from start
	const logoOpacity = 1;

	// Scan sweep (frames 5-35)
	const scanActive = frame >= 5 && frame <= 38;
	const scanProgress = interpolate(frame, [5, 35], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const scanIntensity = interpolate(
		scanProgress,
		[0, 0.05, 0.85, 1],
		[0, 0.8, 0.8, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// Wordmark appears after scan passes center
	const wordmarkOpacity = interpolate(frame, [30, 50], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});
	const wordmarkY = interpolate(frame, [30, 50], [12, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Subtle glow settles after scan
	const glowOpacity = interpolate(frame, [30, 50], [0, 0.06], {
		extrapolateLeft: "clamp",
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
			}}
		>
			{/* Ambient glow */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(circle at 50% 42%, rgba(255, 140, 0, ${glowOpacity}) 0%, transparent 60%)`,
				}}
			/>

			{/* Logo */}
			<div style={{ position: "relative", width: 180, height: 180 }}>
				<Img
					src={staticFile("dispatch-icon-1024.png")}
					style={{
						width: 180,
						height: 180,
						borderRadius: 36,
						opacity: logoOpacity,
					}}
				/>

				{/* Scan pass */}
				{scanActive && (
					<ScanEffect
						direction="vertical"
						progress={scanProgress}
						intensity={scanIntensity}
						color="200, 205, 215"
						showTrail
						showScanlines
						scanlineOpacity={0.05}
						borderRadius={10}
					/>
				)}
			</div>

			{/* Wordmark */}
			<div
				style={{
					marginTop: 32,
					opacity: wordmarkOpacity,
					transform: `translateY(${wordmarkY}px)`,
					textAlign: "center",
				}}
			>
				<div
					style={{
						fontFamily: mono,
						color: "rgba(180, 185, 195, 0.55)",
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
