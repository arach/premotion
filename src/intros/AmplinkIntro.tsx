import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	spring,
	Easing,
} from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadDisplay } from "@remotion/google-fonts/InstrumentSerif";
import { ScanEffect } from "../components/ScanEffect";

const { fontFamily: mono } = loadMono("normal", { weights: ["400"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"] });

// Amplink brand
const AMBER = "200, 95, 50";
const HUD_COLOR = "200, 160, 120"; // warm HUD tint
const GUIDE_COLOR = `rgba(${HUD_COLOR}, 0.45)`;
const TEXT_COLOR = `rgba(${HUD_COLOR}, 0.8)`;

export const AmplinkIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, width, height } = useVideoConfig();

	// === TIMING ===
	const guidesAppear = 0.1 * fps;
	const guidesSettled = 0.5 * fps;
	const logoRevealStart = 0.25 * fps;
	const logoRevealEnd = 1.5 * fps;
	const textAppear = 0.7 * fps;
	const textSettled = 1.1 * fps;
	const statusTypingEnd = 1.5 * fps;
	const resolveStart = 1.7 * fps;
	const wordmarkStart = 1.8 * fps;
	const wordmarkSettled = 2.3 * fps;

	const guideMargin = 72;

	// === GUIDE LINES — camera safe area ===
	const guideOpacity = interpolate(
		frame,
		[guidesAppear, guidesSettled, resolveStart, resolveStart + 12],
		[0, 0.5, 0.5, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// === GRID ===
	const gridOpacity = interpolate(
		frame,
		[0, guidesSettled, resolveStart, resolveStart + 12],
		[0.04, 0.03, 0.03, 0.006],
		{ extrapolateRight: "clamp" },
	);

	// === CORNER TEXT ===
	const cornerOpacity = interpolate(
		frame,
		[textAppear, textSettled, resolveStart, resolveStart + 12],
		[0, 0.75, 0.75, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// === STATUS TYPING ===
	const statusText = "BRIDGE ACTIVE // SESSION READY // ON-DEVICE";
	const typedChars = Math.floor(
		interpolate(frame, [textSettled, statusTypingEnd], [0, statusText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		}),
	);
	const statusDisplay = statusText.slice(0, typedChars);
	const cursorVisible = Math.floor(frame / (fps * 0.4)) % 2 === 0;
	const statusOpacity = interpolate(
		frame,
		[textSettled, textSettled + 5, resolveStart, resolveStart + 12],
		[0, 0.65, 0.65, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// === REC DOT ===
	const recDotVisible = Math.floor(frame / (fps * 0.55)) % 2 === 0;

	// === SCANLINE ===
	const scanlineY = (frame * 2.5) % height;

	// === LOGO — diagonal mask reveal ===
	const revealProgress = interpolate(
		frame,
		[logoRevealStart, logoRevealEnd],
		[0, 1],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
			easing: Easing.out(Easing.cubic),
		},
	);

	const logoScale = spring({
		frame: frame - 0.3 * fps,
		fps,
		config: { damping: 22, stiffness: 80, mass: 1 },
	});
	const scale = interpolate(logoScale, [0, 1], [0.94, 1]);

	const logoOpacity = interpolate(
		frame,
		[logoRevealStart, logoRevealStart + 0.3 * fps],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// Diagonal gradient mask
	const maskPos = interpolate(revealProgress, [0, 1], [-20, 120]);
	const maskImage = `linear-gradient(135deg, black ${maskPos - 15}%, transparent ${maskPos}%)`;

	// === SCAN PASS over logo ===
	const scanStart = logoRevealEnd * 0.6;
	const scanEnd = logoRevealEnd * 0.95;
	const scanProgress = interpolate(frame, [scanStart, scanEnd], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.inOut(Easing.ease),
	});
	const scanActive = frame >= scanStart && frame <= scanEnd + 4;
	const scanIntensity = interpolate(
		scanProgress,
		[0, 0.05, 0.9, 1],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	// === GLOW on resolve ===
	const isResolved = revealProgress >= 0.95;
	const glowIntensity = isResolved
		? interpolate(revealProgress, [0.95, 1], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
			})
		: 0;

	// Breathing after settled
	const breathe =
		frame > logoRevealEnd
			? Math.sin((frame - logoRevealEnd) / 25) * 0.03
			: 0;

	// === WORDMARK ===
	const wordmarkOpacity = interpolate(
		frame,
		[wordmarkStart, wordmarkSettled],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const wordmarkY = interpolate(
		frame,
		[wordmarkStart, wordmarkSettled],
		[18, 0],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
			easing: Easing.out(Easing.cubic),
		},
	);

	// === AMBIENT GLOW ===
	const ambientOpacity = interpolate(
		frame,
		[logoRevealStart, logoRevealEnd],
		[0, 0.1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	const logoSize = Math.min(width, height) * 0.48;
	const logoBorderRadius = logoSize * 0.085;

	return (
		<div
			style={{
				flex: 1,
				backgroundColor: "#08080b",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				overflow: "hidden",
				fontFamily: mono,
			}}
		>
			{/* Grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: gridOpacity,
					backgroundImage: `
						linear-gradient(rgba(${HUD_COLOR}, 0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(${HUD_COLOR}, 0.35) 1px, transparent 1px)
					`,
					backgroundSize: "56px 56px",
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
					backgroundColor: `rgba(${HUD_COLOR}, 0.03)`,
					pointerEvents: "none",
				}}
			/>

			{/* Full-viewport scan pass */}
			{scanActive && (
				<ScanEffect
					direction="vertical"
					progress={scanProgress}
					intensity={scanIntensity * 0.7}
					color={AMBER}
					showTrail
				/>
			)}

			{/* Ambient glow */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(ellipse 55% 45% at 50% 45%, rgba(${AMBER}, ${ambientOpacity + breathe}) 0%, transparent 70%)`,
				}}
			/>

			{/* === CAMERA GUIDE LINES === */}
			{[
				// top
				{ top: guideMargin, left: guideMargin, right: guideMargin, height: 1 },
				// bottom
				{ bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1 },
				// left
				{ top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1 },
				// right
				{ top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1 },
			].map((style, i) => (
				<div
					key={i}
					style={{
						position: "absolute" as const,
						...style,
						opacity: guideOpacity,
						backgroundColor: GUIDE_COLOR,
					}}
				/>
			))}

			{/* === CORNER TEXT READOUTS === */}
			{/* Top-left: System */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 14,
					left: guideMargin + 16,
					opacity: cornerOpacity,
					color: TEXT_COLOR,
					fontSize: 12,
					letterSpacing: "0.06em",
					lineHeight: 1.9,
				}}
			>
				<div style={{ fontWeight: 300 }}>AMPLINK</div>
				<div>Bridge Protocol v1.0</div>
			</div>

			{/* Top-right: Specs */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 14,
					right: guideMargin + 16,
					opacity: cornerOpacity,
					color: TEXT_COLOR,
					fontSize: 12,
					letterSpacing: "0.06em",
					lineHeight: 1.9,
					textAlign: "right",
				}}
			>
				<div>WebSocket / TLS</div>
				<div>Mobile Viewport</div>
			</div>

			{/* Bottom-left: Version */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 14,
					left: guideMargin + 16,
					opacity: cornerOpacity,
					color: TEXT_COLOR,
					fontSize: 12,
					letterSpacing: "0.06em",
				}}
			>
				v1.0.0
			</div>

			{/* Bottom-right: Status + rec dot */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 14,
					right: guideMargin + 16,
					opacity: cornerOpacity,
					color: TEXT_COLOR,
					fontSize: 12,
					letterSpacing: "0.06em",
					display: "flex",
					alignItems: "center",
					gap: 8,
				}}
			>
				<span style={{ color: `rgba(${AMBER}, ${recDotVisible ? 0.9 : 0.3})` }}>
					●
				</span>
				<span>LINKED</span>
			</div>

			{/* Bottom center: Status typing */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 14,
					left: 0,
					right: 0,
					textAlign: "center",
					opacity: statusOpacity,
					color: TEXT_COLOR,
					fontSize: 11,
					letterSpacing: "0.04em",
				}}
			>
				<span>{statusDisplay}</span>
				{cursorVisible && typedChars < statusText.length && (
					<span style={{ opacity: 0.6 }}>▋</span>
				)}
			</div>

			{/* === LOGO === */}
			<div
				style={{
					opacity: logoOpacity,
					transform: `scale(${scale})`,
					WebkitMaskImage: maskImage,
					maskImage,
					position: "relative",
					zIndex: 1,
				}}
			>
				<div
					style={{
						position: "relative",
						width: logoSize,
						height: logoSize,
					}}
				>
					<Img
						src={staticFile("amplink-logo.svg")}
						style={{
							width: logoSize,
							height: logoSize,
						}}
					/>

					{/* Scan pass over logo */}
					{scanActive && (
						<ScanEffect
							direction="vertical"
							progress={scanProgress}
							intensity={scanIntensity}
							color={AMBER}
							showScanlines
							scanlineOpacity={0.05}
							borderRadius={logoBorderRadius}
						/>
					)}

					{/* Resolve glow */}
					<div
						style={{
							position: "absolute",
							inset: -3,
							borderRadius: logoBorderRadius + 3,
							boxShadow: `0 0 ${glowIntensity * 24}px rgba(${AMBER}, ${glowIntensity * 0.12})`,
							border: `1px solid rgba(${AMBER}, ${glowIntensity * 0.15})`,
							pointerEvents: "none",
						}}
					/>
				</div>
			</div>

			{/* === WORDMARK === */}
			<div
				style={{
					marginTop: 36,
					opacity: wordmarkOpacity,
					transform: `translateY(${wordmarkY}px)`,
					textAlign: "center",
					position: "relative",
					zIndex: 1,
				}}
			>
				<div
					style={{
						fontFamily: display,
						color: "#e8e4e0",
						fontSize: 52,
						fontWeight: 400,
						letterSpacing: "0.06em",
						paddingLeft: "0.06em",
						fontStyle: "italic",
					}}
				>
					Amplink
				</div>
			</div>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};
