import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

interface MonitorFrameProps {
	children: React.ReactNode;
	// Bezel
	bezelColor?: string;
	bezelWidth?: number; // px around the screen
	bezelRadius?: number;
	// Stand — short neck that peeks below the monitor
	showStand?: boolean;
	standColor?: string;
	standHeight?: number;
	// Effects
	showReflection?: boolean;
	showScreenGlow?: boolean;
	glowColor?: string;
	powerOnEffect?: boolean;
	// Wordmark
	wordmark?: string;
	wordmarkColor?: string;
	// Background
	bgColor?: string;
	// Screen
	screenRadius?: number;
	// Layout — fine-tune monitor position
	monitorWidthPct?: number;
	monitorHeightPct?: number;
	monitorTopPct?: number;
	// Chin — thicker bottom bezel like a real monitor
	chinHeight?: number;
}

export const MonitorFrame: React.FC<MonitorFrameProps> = ({
	children,
	bezelColor = "#1a1a1e",
	bezelWidth = 14,
	bezelRadius = 16,
	showStand = true,
	standColor = "#2a2a2e",
	standHeight = 40,
	showReflection = true,
	showScreenGlow = true,
	glowColor = "rgba(100, 160, 255, 0.08)",
	powerOnEffect = true,
	wordmark = "",
	wordmarkColor = "rgba(255, 255, 255, 0.25)",
	bgColor = "#0a0a0e",
	screenRadius = 6,
	monitorWidthPct = 96,
	monitorHeightPct = 80,
	monitorTopPct = 5,
	chinHeight,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Power-on: screen fades in
	const powerOn = powerOnEffect
		? interpolate(frame, [0, 0.6 * fps], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
				easing: Easing.out(Easing.cubic),
			})
		: 1;

	return (
		<AbsoluteFill style={{ backgroundColor: bgColor }}>
			{/* Monitor body */}
			<div
				style={{
					position: "absolute",
					left: `${(100 - monitorWidthPct) / 2}%`,
					top: `${monitorTopPct}%`,
					width: `${monitorWidthPct}%`,
					height: `${monitorHeightPct}%`,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				{/* Monitor housing */}
				<div
					style={{
						width: "100%",
						flex: 1,
						backgroundColor: bezelColor,
						borderRadius: bezelRadius,
						padding: `${bezelWidth}px ${bezelWidth}px ${chinHeight ?? bezelWidth * 2.5}px ${bezelWidth}px`,
						position: "relative",
						boxShadow: `
							0 2px 40px rgba(0, 0, 0, 0.6),
							0 0 0 1px rgba(255, 255, 255, 0.04),
							inset 0 1px 0 rgba(255, 255, 255, 0.06)
						`,
						display: "flex",
						flexDirection: "column",
					}}
				>
					{/* Screen area */}
					<div
						style={{
							flex: 1,
							borderRadius: screenRadius,
							overflow: "hidden",
							position: "relative",
							backgroundColor: "#000",
						}}
					>
						{/* Video content */}
						<div
							style={{
								position: "absolute",
								inset: 0,
								opacity: powerOn,
							}}
						>
							{children}
						</div>

						{/* Subtle screen reflection — top-left highlight */}
						{showReflection && (
							<div
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "60%",
									height: "30%",
									background: `linear-gradient(
										145deg,
										rgba(255, 255, 255, 0.025) 0%,
										transparent 60%
									)`,
									pointerEvents: "none",
								}}
							/>
						)}

						{/* Edge vignette */}
						<div
							style={{
								position: "absolute",
								inset: 0,
								boxShadow: "inset 0 0 60px 10px rgba(0, 0, 0, 0.15)",
								borderRadius: screenRadius,
								pointerEvents: "none",
							}}
						/>
					</div>

					{/* Bottom chin with wordmark — centered in the chin area */}
					{wordmark && (
						<div
							style={{
								position: "absolute",
								bottom: 0,
								left: 0,
								right: 0,
								height: chinHeight ?? bezelWidth * 2.5,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<span
								style={{
									fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
									fontSize: 9,
									fontWeight: 500,
									letterSpacing: "0.2em",
									color: wordmarkColor,
									textTransform: "uppercase",
								}}
							>
								{wordmark}
							</span>
						</div>
					)}
				</div>

				{/* Stand — short neck that extends below the monitor */}
				{showStand && (
					<div
						style={{
							width: 50,
							height: standHeight,
							background: `linear-gradient(
								90deg,
								${standColor} 0%,
								rgba(55, 55, 60, 1) 50%,
								${standColor} 100%
							)`,
							borderRadius: "0 0 3px 3px",
							boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
						}}
					/>
				)}
			</div>

			{/* Ambient screen glow behind monitor */}
			{showScreenGlow && (
				<div
					style={{
						position: "absolute",
						left: `${(100 - monitorWidthPct) / 2 + 5}%`,
						top: `${monitorTopPct + 2}%`,
						width: `${monitorWidthPct - 10}%`,
						height: `${monitorHeightPct - 4}%`,
						background: `radial-gradient(ellipse at 50% 50%, ${glowColor}, transparent 60%)`,
						opacity: powerOn * 0.5,
						filter: "blur(40px)",
						zIndex: -1,
					}}
				/>
			)}
		</AbsoluteFill>
	);
};
