import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface MidjourneyComputerFrameProps {
	children: React.ReactNode;
	// Screen position as percentages of the frame image (fine-tune these)
	screenLeft?: number;
	screenTop?: number;
	screenWidth?: number;
	screenHeight?: number;
	// Effects
	showScanlines?: boolean;
	showScreenGlow?: boolean;
	screenTint?: string;
	// Animation
	powerOnEffect?: boolean;
	// Debug
	calibrationMode?: boolean;
	// Wordmark
	showWordmark?: boolean;
	wordmarkText?: string;
}

// Uses the Midjourney retro computer image as a frame
// Video content is positioned in the main CRT monitor screen area
export const MidjourneyComputerFrame: React.FC<MidjourneyComputerFrameProps> = ({
	children,
	// Screen coordinates as percentages (calibrated for 1080x1080)
	// Pixel values: x=192-585, y=292-598
	screenLeft = 17.8,
	screenTop = 27.0,
	screenWidth = 36.4,
	screenHeight = 28.3,
	showScanlines = true,
	showScreenGlow = true,
	screenTint = "rgba(0, 40, 30, 0.12)",
	powerOnEffect = true,
	calibrationMode = false,
	showWordmark = true,
	wordmarkText = "TALKIE",
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Power-on animation
	const powerOn = powerOnEffect
		? interpolate(frame, [0, 0.5 * fps], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
		  })
		: 1;

	// Screen flicker on startup
	const flicker = powerOnEffect && frame < fps * 0.8
		? 0.7 + Math.random() * 0.3
		: 1;

	// Scanline movement
	const scanlineOffset = (frame * 2) % 100;

	return (
		<AbsoluteFill style={{ backgroundColor: "#c8c4bc" }}>
			{/* Screen content layer - positioned behind the frame */}
			<div
				style={{
					position: "absolute",
					left: `${screenLeft}%`,
					top: `${screenTop}%`,
					width: `${screenWidth}%`,
					height: `${screenHeight}%`,
					overflow: "hidden",
					borderRadius: 8,
					backgroundColor: "#0a1a15",
				}}
			>
				{/* Video content */}
				<div
					style={{
						width: "100%",
						height: "100%",
						opacity: powerOn * flicker,
						transform: `scale(${0.95 + powerOn * 0.05})`,
					}}
				>
					{children}
				</div>

				{/* CRT screen tint */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundColor: screenTint,
						pointerEvents: "none",
						mixBlendMode: "multiply",
					}}
				/>

				{/* Scanlines */}
				{showScanlines && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							backgroundImage: `repeating-linear-gradient(
								0deg,
								transparent,
								transparent 2px,
								rgba(0, 0, 0, 0.1) 2px,
								rgba(0, 0, 0, 0.1) 4px
							)`,
							backgroundPosition: `0 ${scanlineOffset}%`,
							pointerEvents: "none",
							opacity: 0.6,
						}}
					/>
				)}

				{/* Screen curvature / edge darkening */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						boxShadow: `
							inset 0 0 80px 20px rgba(0, 0, 0, 0.4),
							inset 0 0 150px 50px rgba(0, 0, 0, 0.2)
						`,
						borderRadius: 8,
						pointerEvents: "none",
					}}
				/>

				{/* Screen glow */}
				{showScreenGlow && (
					<div
						style={{
							position: "absolute",
							inset: -20,
							boxShadow: `0 0 60px 20px rgba(100, 200, 180, ${0.15 * powerOn})`,
							pointerEvents: "none",
							borderRadius: 20,
						}}
					/>
				)}


				{/* Calibration overlay */}
				{calibrationMode && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							border: "3px solid #ff0000",
							backgroundColor: "rgba(255, 0, 0, 0.2)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							fontFamily: "SF Mono, monospace",
							color: "#ff0000",
							fontSize: 14,
							fontWeight: "bold",
							textShadow: "0 0 4px #000",
						}}
					>
						<div>SCREEN AREA</div>
						<div style={{ fontSize: 11, marginTop: 8, opacity: 0.9 }}>
							L: {screenLeft}% | T: {screenTop}%
						</div>
						<div style={{ fontSize: 11, opacity: 0.9 }}>
							W: {screenWidth}% | H: {screenHeight}%
						</div>
					</div>
				)}
			</div>

			{/* Frame image - on top, the screen area is see-through in the original */}
			<Img
				src={staticFile("retro-computer-frame.png")}
				style={{
					width: "100%",
					height: "100%",
					objectFit: "contain",
					pointerEvents: "none",
				}}
			/>

			{/* Wordmark in the bottom console area */}
			{showWordmark && (
				<div
					style={{
						position: "absolute",
						bottom: "12%",
						left: 0,
						right: 0,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						pointerEvents: "none",
					}}
				>
					<div
						style={{
							fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
							fontSize: 28,
							fontWeight: 500,
							letterSpacing: "0.25em",
							paddingLeft: "0.25em",
							color: "#3a3632",
							textShadow: "0 1px 0 rgba(255, 255, 255, 0.3)",
						}}
					>
						{wordmarkText}
					</div>
				</div>
			)}
		</AbsoluteFill>
	);
};
