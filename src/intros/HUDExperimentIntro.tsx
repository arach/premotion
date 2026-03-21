import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
	AbsoluteFill,
} from "remotion";

interface HUDExperimentIntroProps {
	title?: string;
	subtitle?: string;
}

// HUD-style experiment intro - tactical feel without branding
export const HUDExperimentIntro: React.FC<HUDExperimentIntroProps> = ({
	title = "HUD EXPERIMENT",
	subtitle = "Prototype v0.1",
}) => {
	const frame = useCurrentFrame();
	const { fps, height, durationInFrames } = useVideoConfig();

	const guideMargin = 70;

	// === TIMING ===
	const guidesAppear = 0;
	const guidesSettled = 0.3 * fps;
	const gridAppear = 0;
	const gridSettled = 0.3 * fps;
	const textAppear = 0.2 * fps;
	const textSettled = 0.8 * fps;

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
		[0, 0.04],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Guide lines
	const guideOpacity = interpolate(
		frame,
		[guidesAppear, guidesSettled],
		[0, 0.6],
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

	// Text animations
	const titleOpacity = interpolate(frame, [textAppear, textSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	}) * fadeOut;

	const titleY = interpolate(frame, [textAppear, textSettled], [20, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Corner HUD text
	const hudTextOpacity = interpolate(
		frame,
		[textAppear, textSettled],
		[0, 0.75],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	const guideColor = "rgba(200, 210, 220, 0.5)";
	const textColor = "rgba(175, 185, 200, 0.8)";
	const accentColor = "#6ae";

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#08080c",
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
					backgroundColor: "rgba(160, 170, 190, 0.03)",
					opacity: scanlineOpacity,
					pointerEvents: "none",
				}}
			/>

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, opacity: guideOpacity, backgroundColor: guideColor }} />

			{/* Top-left: System */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					left: guideMargin + 14,
					opacity: hudTextOpacity,
					fontSize: 12,
					letterSpacing: "0.05em",
					lineHeight: 1.8,
				}}
			>
				<div style={{ fontWeight: 600, color: "#d8d8e0" }}>SYSTEM</div>
				<div style={{ color: textColor }}>Experimental Build</div>
			</div>

			{/* Top-right: Status */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					right: guideMargin + 14,
					opacity: hudTextOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					lineHeight: 1.8,
					textAlign: "right",
				}}
			>
				<div>60fps / 1080p</div>
				<div>SwiftUI + Metal</div>
			</div>

			{/* Bottom-left: Build */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					left: guideMargin + 14,
					opacity: hudTextOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
				}}
			>
				<div>build 2026.02.13</div>
			</div>

			{/* Bottom-right: Status */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					right: guideMargin + 14,
					opacity: hudTextOpacity,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<span style={{ color: accentColor }}>●</span>
				<span>LIVE</span>
			</div>

			{/* Center: Title */}
			<AbsoluteFill
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div
					style={{
						opacity: titleOpacity,
						transform: `translateY(${titleY}px)`,
						textAlign: "center",
					}}
				>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#e8e8f0",
							fontSize: 48,
							fontWeight: 500,
							letterSpacing: "0.15em",
							paddingLeft: "0.15em",
						}}
					>
						{title}
					</div>
					<div
						style={{
							marginTop: 16,
							color: "rgba(180, 190, 210, 0.7)",
							fontSize: 16,
							letterSpacing: "0.2em",
							paddingLeft: "0.2em",
							textTransform: "uppercase",
						}}
					>
						{subtitle}
					</div>
				</div>
			</AbsoluteFill>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%)",
					pointerEvents: "none",
				}}
			/>
		</AbsoluteFill>
	);
};
