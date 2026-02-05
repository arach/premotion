import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Easing,
	AbsoluteFill,
} from "remotion";

interface TacticalIntroProps {
	title?: string;
	subtitle?: string;
	iconSrc?: string;
}

// Reusable tactical intro - snappy guide frame with icon + wordmark
export const TacticalIntro: React.FC<TacticalIntroProps> = ({
	title = "TALKIE",
	subtitle = "Voice Engine v4.0",
	iconSrc = "talkie-icon-1024.png",
}) => {
	const frame = useCurrentFrame();
	const { fps, height, durationInFrames } = useVideoConfig();

	const iconSize = 260;
	const guideMargin = 70;

	// === TIMING ===
	const guidesAppear = 0;
	const guidesSettled = 0.3 * fps;
	const gridAppear = 0;
	const gridSettled = 0.3 * fps;
	const iconAppear = 0.4 * fps;
	const iconSettled = 1.0 * fps;
	const talkieAppear = iconAppear;
	const talkieSettled = iconSettled;
	const textAppear = iconAppear;
	const textSettled = iconSettled;

	// Fade out at the end
	const fadeOut = interpolate(
		frame,
		[durationInFrames - 0.5 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Grid
	const gridOpacity = interpolate(
		frame,
		[gridAppear, gridSettled],
		[0, 0.03],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Guide lines
	const guideOpacity = interpolate(
		frame,
		[guidesAppear, guidesSettled],
		[0, 0.5],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Scanline
	const scanlineOpacity = interpolate(
		frame,
		[gridAppear, gridSettled],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;
	const scanlineY = (frame * 2.5) % height;

	// Icon
	const iconOpacity = interpolate(frame, [iconAppear, iconSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	}) * fadeOut;

	const iconScale = interpolate(frame, [iconAppear, iconSettled], [0.92, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Corner HUD text
	const textOpacity = interpolate(
		frame,
		[textAppear, textSettled],
		[0, 0.75],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// TALKIE text
	const talkieOpacity = interpolate(frame, [talkieAppear, talkieSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	}) * fadeOut;

	const recDotVisible = Math.floor(frame / (fps * 0.5)) % 2 === 0;
	const guideColor = "rgba(160, 170, 190, 0.45)";
	const textColor = "rgba(175, 185, 200, 0.8)";

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#0a0a0e",
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
					opacity: scanlineOpacity,
					pointerEvents: "none",
				}}
			/>

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, opacity: guideOpacity, backgroundColor: guideColor }} />

			{/* Top-left: System name */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					left: guideMargin + 14,
					opacity: textOpacity,
					fontSize: 12,
					letterSpacing: "0.05em",
					lineHeight: 1.8,
				}}
			>
				<div style={{ fontWeight: 600, color: "#d8d8e0" }}>{title}</div>
				<div style={{ color: textColor }}>{subtitle}</div>
			</div>

			{/* Top-right: Status */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					right: guideMargin + 14,
					opacity: textOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					lineHeight: 1.8,
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
					bottom: guideMargin + 12,
					left: guideMargin + 14,
					opacity: textOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
				}}
			>
				<div>v4.0.0-beta</div>
			</div>

			{/* Bottom-right: Status indicator */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					right: guideMargin + 14,
					opacity: textOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<span style={{ color: recDotVisible ? "#6a8" : "#555" }}>●</span>
				<span>REC</span>
			</div>

			{/* Center content: Icon + Title */}
			<AbsoluteFill
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div style={{ opacity: iconOpacity, transform: `scale(${iconScale})` }}>
					<Img
						src={staticFile(iconSrc)}
						style={{
							width: iconSize,
							height: iconSize,
							borderRadius: iconSize * 0.22,
						}}
					/>
				</div>

				<div style={{ marginTop: 28, opacity: talkieOpacity, textAlign: "center" }}>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#dddde8",
							fontSize: 34,
							fontWeight: 400,
							letterSpacing: "0.25em",
							paddingLeft: "0.25em",
						}}
					>
						{title}
					</div>
				</div>
			</AbsoluteFill>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.45) 100%)",
					pointerEvents: "none",
				}}
			/>
		</AbsoluteFill>
	);
};
