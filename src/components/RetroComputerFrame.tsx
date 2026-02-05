import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

interface RetroComputerFrameProps {
	children: React.ReactNode;
	monitorColor?: string;
	baseColor?: string;
	screenTint?: string;
	showScanlines?: boolean;
	showReflection?: boolean;
	showPowerLight?: boolean;
}

// Retro CRT computer frame - video content goes in the screen
export const RetroComputerFrame: React.FC<RetroComputerFrameProps> = ({
	children,
	monitorColor = "#e8e0d4", // Beige/cream
	baseColor = "#8b3a3a", // Burgundy red
	screenTint = "rgba(0, 20, 10, 0.15)", // Slight green CRT tint
	showScanlines = true,
	showReflection = true,
	showPowerLight = true,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Power light blink
	const powerLightOn = Math.floor(frame / (fps * 2)) % 2 === 0 || frame > fps * 3;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#1a1a1a",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* Computer unit */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				{/* Monitor */}
				<div
					style={{
						backgroundColor: monitorColor,
						borderRadius: 24,
						padding: 28,
						boxShadow: `
							0 4px 20px rgba(0, 0, 0, 0.4),
							inset 0 2px 0 rgba(255, 255, 255, 0.3),
							inset 0 -2px 0 rgba(0, 0, 0, 0.1)
						`,
						position: "relative",
					}}
				>
					{/* Screen bezel */}
					<div
						style={{
							backgroundColor: "#1a1a1a",
							borderRadius: 16,
							padding: 8,
							boxShadow: `
								inset 0 4px 12px rgba(0, 0, 0, 0.8),
								inset 0 0 0 2px rgba(0, 0, 0, 0.3)
							`,
						}}
					>
						{/* Screen area */}
						<div
							style={{
								width: 640,
								height: 480,
								borderRadius: 12,
								overflow: "hidden",
								position: "relative",
								backgroundColor: "#0a0a0a",
								boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.5)",
							}}
						>
							{/* Video content */}
							<div
								style={{
									position: "absolute",
									inset: 0,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
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
											rgba(0, 0, 0, 0.15) 2px,
											rgba(0, 0, 0, 0.15) 4px
										)`,
										pointerEvents: "none",
									}}
								/>
							)}

							{/* Screen curvature / vignette */}
							<div
								style={{
									position: "absolute",
									inset: 0,
									borderRadius: 12,
									boxShadow: `
										inset 0 0 100px 20px rgba(0, 0, 0, 0.4),
										inset 0 0 200px 60px rgba(0, 0, 0, 0.2)
									`,
									pointerEvents: "none",
								}}
							/>

							{/* Screen reflection */}
							{showReflection && (
								<div
									style={{
										position: "absolute",
										top: 20,
										left: 30,
										width: "40%",
										height: "25%",
										background: `linear-gradient(
											135deg,
											rgba(255, 255, 255, 0.08) 0%,
											rgba(255, 255, 255, 0.02) 50%,
											transparent 100%
										)`,
										borderRadius: 100,
										transform: "rotate(-5deg)",
										pointerEvents: "none",
									}}
								/>
							)}
						</div>
					</div>

					{/* Monitor brand badge */}
					<div
						style={{
							position: "absolute",
							bottom: 10,
							left: "50%",
							transform: "translateX(-50%)",
							fontSize: 10,
							fontFamily: "SF Pro Display, system-ui, sans-serif",
							color: "#666",
							letterSpacing: "0.15em",
							fontWeight: 600,
						}}
					>
						TALKIE
					</div>
				</div>

				{/* Monitor stand / neck */}
				<div
					style={{
						width: 80,
						height: 30,
						backgroundColor: baseColor,
						borderRadius: "0 0 8px 8px",
						boxShadow: `
							inset 0 2px 4px rgba(0, 0, 0, 0.3),
							0 4px 8px rgba(0, 0, 0, 0.2)
						`,
					}}
				/>

				{/* Keyboard base */}
				<div
					style={{
						width: 580,
						height: 50,
						backgroundColor: baseColor,
						borderRadius: 8,
						marginTop: 10,
						boxShadow: `
							0 4px 12px rgba(0, 0, 0, 0.3),
							inset 0 2px 0 rgba(255, 255, 255, 0.1),
							inset 0 -2px 0 rgba(0, 0, 0, 0.2)
						`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "8px 20px",
						position: "relative",
					}}
				>
					{/* Keyboard keys area */}
					<div
						style={{
							width: "100%",
							height: "100%",
							backgroundColor: "#2a2a2a",
							borderRadius: 4,
							display: "flex",
							flexWrap: "wrap",
							gap: 2,
							padding: 4,
							alignContent: "center",
							justifyContent: "center",
						}}
					>
						{/* Simplified keyboard keys */}
						{Array.from({ length: 40 }).map((_, i) => (
							<div
								key={i}
								style={{
									width: i % 10 === 9 ? 24 : 12,
									height: 8,
									backgroundColor: "#1a1a1a",
									borderRadius: 2,
									boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.1)",
								}}
							/>
						))}
					</div>

					{/* Power light */}
					{showPowerLight && (
						<div
							style={{
								position: "absolute",
								right: 16,
								top: "50%",
								transform: "translateY(-50%)",
								width: 8,
								height: 8,
								borderRadius: "50%",
								backgroundColor: powerLightOn ? "#4ade80" : "#1a3a1a",
								boxShadow: powerLightOn
									? "0 0 8px #4ade80, 0 0 16px rgba(74, 222, 128, 0.5)"
									: "none",
							}}
						/>
					)}
				</div>
			</div>
		</AbsoluteFill>
	);
};
