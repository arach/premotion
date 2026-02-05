import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	random,
	Easing,
} from "remotion";
import { ScanEffect } from "../components/ScanEffect";

// Tactical intro - camera viewfinder style with guide lines and readable HUD text
export const TalkieTacticalIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, height } = useVideoConfig();

	const iconSize = 280;

	// === TIMING ===
	const guidesAppear = 0.2 * fps;
	const guidesSettled = 0.6 * fps;
	const iconAppear = 0.4 * fps;
	const iconSettled = 0.8 * fps;
	const textAppear = 0.8 * fps;
	const textSettled = 1.2 * fps;
	const statusTypingEnd = 1.6 * fps;
	const resolveStart = 1.65 * fps;
	const talkieStart = 1.75 * fps;

	// Guide lines - camera safe-area markers
	// Offset from edges, forming a rectangle
	const guideMargin = 80;
	const guideOpacity = interpolate(
		frame,
		[guidesAppear, guidesSettled, resolveStart, resolveStart + 10],
		[0, 0.55, 0.55, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Icon
	const iconOpacity = interpolate(frame, [iconAppear, iconSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Corner text readouts
	const textOpacity = interpolate(
		frame,
		[textAppear, textSettled, resolveStart, resolveStart + 10],
		[0, 0.8, 0.8, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Status typing - bottom center
	const statusText = "INPUT ACTIVE // 48kHz STEREO // ON-DEVICE";
	const typedChars = Math.floor(
		interpolate(frame, [textSettled, statusTypingEnd], [0, statusText.length], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		})
	);
	const statusDisplay = statusText.slice(0, typedChars);
	const cursorVisible = Math.floor(frame / (fps * 0.4)) % 2 === 0;
	const statusOpacity = interpolate(
		frame,
		[textSettled, textSettled + 5, resolveStart, resolveStart + 10],
		[0, 0.7, 0.7, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// TALKIE text
	const talkieOpacity = interpolate(frame, [talkieStart, talkieStart + 8], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Scanline
	const scanlineY = (frame * 3) % height;

	// Grid
	const gridOpacity = interpolate(
		frame,
		[0, guidesSettled, resolveStart, resolveStart + 10],
		[0.05, 0.035, 0.035, 0.008],
		{ extrapolateRight: "clamp" }
	);

	// Vertical scan pass during icon appearance
	const scanProgress = interpolate(
		frame,
		[iconAppear, iconSettled + 6],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) }
	);
	const scanActive = frame >= iconAppear && frame <= iconSettled + 10;
	const scanIntensity = interpolate(
		scanProgress,
		[0, 0.05, 0.9, 1],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	const guideColor = "rgba(180, 190, 210, 0.5)";
	const textColor = "rgba(190, 200, 220, 0.85)";

	// Recording dot blink
	const recDotVisible = Math.floor(frame / (fps * 0.6)) % 2 === 0;

	return (
		<div
			style={{
				flex: 1,
				backgroundColor: "#0a0a0e",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				overflow: "hidden",
				fontFamily: "SF Mono, Monaco, Consolas, monospace",
			}}
		>
			{/* Grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: gridOpacity,
					backgroundImage: `
						linear-gradient(rgba(180, 190, 210, 0.4) 1px, transparent 1px),
						linear-gradient(90deg, rgba(180, 190, 210, 0.4) 1px, transparent 1px)
					`,
					backgroundSize: "60px 60px",
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
					backgroundColor: "rgba(180, 190, 210, 0.035)",
					pointerEvents: "none",
				}}
			/>

			{/* Vertical scan pass */}
			{scanActive && (
				<ScanEffect
					direction="horizontal"
					progress={scanProgress}
					intensity={scanIntensity}
					color="180, 190, 210"
					showTrail={true}
				/>
			)}

			{/* === CAMERA GUIDE LINES === */}
			{/* Top horizontal guide */}
			<div
				style={{
					position: "absolute",
					top: guideMargin,
					left: guideMargin,
					right: guideMargin,
					height: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>
			{/* Bottom horizontal guide */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin,
					left: guideMargin,
					right: guideMargin,
					height: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>
			{/* Left vertical guide */}
			<div
				style={{
					position: "absolute",
					top: guideMargin,
					bottom: guideMargin,
					left: guideMargin,
					width: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>
			{/* Right vertical guide */}
			<div
				style={{
					position: "absolute",
					top: guideMargin,
					bottom: guideMargin,
					right: guideMargin,
					width: 1,
					opacity: guideOpacity,
					backgroundColor: guideColor,
				}}
			/>

			{/* === CORNER TEXT - tucked inside the guides === */}
			{/* Top-left: System name */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 14,
					left: guideMargin + 16,
					opacity: textOpacity,
					color: textColor,
					fontSize: 13,
					letterSpacing: "0.06em",
					lineHeight: 1.9,
				}}
			>
				<div style={{ fontWeight: 600 }}>TALKIE</div>
				<div>Voice Engine v4.0</div>
			</div>

			{/* Top-right: Specs */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 14,
					right: guideMargin + 16,
					opacity: textOpacity,
					color: textColor,
					fontSize: 13,
					letterSpacing: "0.06em",
					lineHeight: 1.9,
					textAlign: "right",
				}}
			>
				<div>48kHz / 24-bit</div>
				<div>Neural Engine</div>
			</div>

			{/* Bottom-left: Version */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 14,
					left: guideMargin + 16,
					opacity: textOpacity,
					color: textColor,
					fontSize: 13,
					letterSpacing: "0.06em",
				}}
			>
				<div>v4.0.0</div>
			</div>

			{/* Bottom-right: Status */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 14,
					right: guideMargin + 16,
					opacity: textOpacity,
					color: textColor,
					fontSize: 13,
					letterSpacing: "0.06em",
					display: "flex",
					alignItems: "center",
					gap: 8,
				}}
			>
				<span>{recDotVisible ? "●" : "○"}</span>
				<span>IDLE</span>
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
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.04em",
				}}
			>
				<span>{statusDisplay}</span>
				{cursorVisible && typedChars < statusText.length && (
					<span style={{ opacity: 0.6 }}>▋</span>
				)}
			</div>

			{/* Icon */}
			<div
				style={{
					opacity: iconOpacity,
					position: "relative",
				}}
			>
				<div
					style={{
						position: "relative",
						width: iconSize,
						height: iconSize,
					}}
				>
					<Img
						src={staticFile("talkie-icon-1024.png")}
						style={{
							width: iconSize,
							height: iconSize,
							borderRadius: iconSize * 0.22,
						}}
					/>
				</div>
			</div>

			{/* TALKIE */}
			<div
				style={{
					marginTop: 36,
					opacity: talkieOpacity,
					textAlign: "center",
				}}
			>
				<div
					style={{
						fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
						color: "#dddde8",
						fontSize: 38,
						fontWeight: 400,
						letterSpacing: "0.25em",
						paddingLeft: "0.25em",
					}}
				>
					TALKIE
				</div>
			</div>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};
