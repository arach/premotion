import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Easing,
	AbsoluteFill,
} from "remotion";

interface TacticalOutroProps {
	title?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
}

// Reusable tactical outro - Coming Soon with spinner → release date
export const TacticalOutro: React.FC<TacticalOutroProps> = ({
	title = "TALKIE",
	tagline = "Coming Soon",
	releaseDate = "Q1 2026",
	iconSrc = "talkie-icon-1024.png",
}) => {
	const frame = useCurrentFrame();
	const { fps, height, durationInFrames } = useVideoConfig();

	const iconSize = 220;
	const guideMargin = 70;

	// === TIMING ===
	const fadeInEnd = 0.5 * fps;
	const iconAppear = 0.3 * fps;
	const iconSettled = 0.8 * fps;
	const taglineAppear = 0.6 * fps;
	const taglineSettled = 1.0 * fps;
	const dateAppear = 2.5 * fps;
	const dateSettled = 3.0 * fps;

	// Fade in/out
	const fadeIn = interpolate(frame, [0, fadeInEnd], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const fadeOut = interpolate(
		frame,
		[durationInFrames - 0.8 * fps, durationInFrames],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);
	const fade = fadeIn * fadeOut;

	// Grid
	const gridOpacity = 0.025 * fade;

	// Guide lines
	const guideOpacity = interpolate(frame, [0, fadeInEnd], [0, 0.4], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	}) * fadeOut;

	// Scanline
	const scanlineY = (frame * 2.5) % height;

	// Icon
	const iconOpacity = interpolate(frame, [iconAppear, iconSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	}) * fadeOut;

	const iconScale = interpolate(frame, [iconAppear, iconSettled], [0.95, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
		easing: Easing.out(Easing.cubic),
	});

	// Tagline (Coming Soon)
	const taglineOpacity = interpolate(frame, [taglineAppear, taglineSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	}) * fadeOut;

	// Braille spinner
	const brailleFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	const spinnerIndex = Math.floor(frame / 3) % brailleFrames.length;
	const spinnerChar = brailleFrames[spinnerIndex];
	const spinnerOpacity = interpolate(
		frame,
		[taglineSettled, taglineSettled + 5, dateAppear - 10, dateAppear],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) * fadeOut;

	// Release date
	const dateOpacity = interpolate(frame, [dateAppear, dateSettled], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	}) * fadeOut;

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
					opacity: fade,
					pointerEvents: "none",
				}}
			/>

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, opacity: guideOpacity, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, opacity: guideOpacity, backgroundColor: guideColor }} />

			{/* Center content */}
			<AbsoluteFill
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{/* Icon */}
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

				{/* Title */}
				<div style={{ marginTop: 24, opacity: iconOpacity, textAlign: "center" }}>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#dddde8",
							fontSize: 30,
							fontWeight: 400,
							letterSpacing: "0.25em",
							paddingLeft: "0.25em",
						}}
					>
						{title}
					</div>
				</div>

				{/* Tagline */}
				<div style={{ marginTop: 16, opacity: taglineOpacity, textAlign: "center" }}>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							color: "#c8c8d0",
							fontSize: 15,
							fontWeight: 500,
							letterSpacing: "0.14em",
							textTransform: "uppercase",
						}}
					>
						{tagline}
					</div>
				</div>

				{/* Spinner / Release date */}
				<div
					style={{
						marginTop: 12,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: 24,
						position: "relative",
					}}
				>
					<div
						style={{
							position: "absolute",
							opacity: spinnerOpacity,
							fontFamily: "SF Mono, Monaco, Consolas, monospace",
							color: "#a0a0a8",
							fontSize: 16,
						}}
					>
						{spinnerChar}
					</div>

					<div
						style={{
							position: "absolute",
							opacity: dateOpacity,
							fontFamily: "SF Mono, Monaco, Consolas, monospace",
							color: "#b8b8c0",
							fontSize: 14,
							fontWeight: 500,
							letterSpacing: "0.12em",
							whiteSpace: "nowrap",
						}}
					>
						{releaseDate}
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
