import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

interface iPhoneFrameProps {
	children: React.ReactNode;
	/** Frame color — dark titanium default */
	frameColor?: string;
	/** Screen corner radius (iPhone 15 Pro is ~55pt at native res) */
	screenRadius?: number;
	/** Show the Dynamic Island notch */
	showDynamicIsland?: boolean;
	/** Show side buttons (volume, power) */
	showButtons?: boolean;
	/** Power-on fade effect */
	powerOnEffect?: boolean;
	/** Subtle glow behind the phone */
	showGlow?: boolean;
	glowColor?: string;
	/** How much of the parent height the phone should occupy (0-1) */
	phoneSizePct?: number;
}

export const IPhoneFrame: React.FC<iPhoneFrameProps> = ({
	children,
	frameColor = "#1c1c1e",
	screenRadius = 44,
	showDynamicIsland = true,
	showButtons = true,
	powerOnEffect = true,
	showGlow = true,
	glowColor = "rgba(80, 140, 255, 0.06)",
	phoneSizePct = 0.88,
}) => {
	const frame = useCurrentFrame();
	const { fps, width, height } = useVideoConfig();

	const powerOn = powerOnEffect
		? interpolate(frame, [0, 0.6 * fps], [0, 1], {
				extrapolateLeft: "clamp",
				extrapolateRight: "clamp",
				easing: Easing.out(Easing.cubic),
			})
		: 1;

	// Phone dimensions — fit to parent height
	const phoneAspect = 1126 / 2436; // iPhone Pro
	const phoneH = height * phoneSizePct;
	const phoneW = phoneH * phoneAspect;
	const bezelW = 6;
	const outerRadius = screenRadius + bezelW;

	// Center in canvas
	const phoneLeft = (width - phoneW) / 2;
	const phoneTop = (height - phoneH) / 2;

	return (
		<AbsoluteFill>
			{/* Ambient glow */}
			{showGlow && (
				<div
					style={{
						position: "absolute",
						left: phoneLeft - 40,
						top: phoneTop + phoneH * 0.1,
						width: phoneW + 80,
						height: phoneH * 0.8,
						background: `radial-gradient(ellipse at 50% 50%, ${glowColor}, transparent 60%)`,
						opacity: powerOn * 0.6,
						filter: "blur(50px)",
						zIndex: 0,
					}}
				/>
			)}

			{/* Phone housing */}
			<div
				style={{
					position: "absolute",
					left: phoneLeft - bezelW,
					top: phoneTop - bezelW,
					width: phoneW + bezelW * 2,
					height: phoneH + bezelW * 2,
					borderRadius: outerRadius,
					backgroundColor: frameColor,
					boxShadow: `
						0 4px 60px rgba(0, 0, 0, 0.5),
						0 0 0 1px rgba(255, 255, 255, 0.06),
						inset 0 1px 0 rgba(255, 255, 255, 0.08),
						inset 0 -1px 0 rgba(0, 0, 0, 0.3)
					`,
					zIndex: 1,
				}}
			>
				{/* Side buttons — left side (silent switch + volume) */}
				{showButtons && (
					<>
						{/* Silent switch */}
						<div
							style={{
								position: "absolute",
								left: -3,
								top: phoneH * 0.12,
								width: 3,
								height: 18,
								backgroundColor: frameColor,
								borderRadius: "2px 0 0 2px",
								boxShadow: "-1px 0 2px rgba(0,0,0,0.3)",
							}}
						/>
						{/* Volume up */}
						<div
							style={{
								position: "absolute",
								left: -3,
								top: phoneH * 0.19,
								width: 3,
								height: 32,
								backgroundColor: frameColor,
								borderRadius: "2px 0 0 2px",
								boxShadow: "-1px 0 2px rgba(0,0,0,0.3)",
							}}
						/>
						{/* Volume down */}
						<div
							style={{
								position: "absolute",
								left: -3,
								top: phoneH * 0.26,
								width: 3,
								height: 32,
								backgroundColor: frameColor,
								borderRadius: "2px 0 0 2px",
								boxShadow: "-1px 0 2px rgba(0,0,0,0.3)",
							}}
						/>
						{/* Power button — right side */}
						<div
							style={{
								position: "absolute",
								right: -3,
								top: phoneH * 0.22,
								width: 3,
								height: 48,
								backgroundColor: frameColor,
								borderRadius: "0 2px 2px 0",
								boxShadow: "1px 0 2px rgba(0,0,0,0.3)",
							}}
						/>
					</>
				)}

				{/* Screen area */}
				<div
					style={{
						position: "absolute",
						left: bezelW,
						top: bezelW,
						width: phoneW,
						height: phoneH,
						borderRadius: screenRadius,
						overflow: "hidden",
						backgroundColor: "#000",
					}}
				>
					{/* Video content */}
					<div style={{ position: "absolute", inset: 0, opacity: powerOn }}>
						{children}
					</div>

					{/* Dynamic Island */}
					{showDynamicIsland && (
						<div
							style={{
								position: "absolute",
								top: 10,
								left: "50%",
								transform: "translateX(-50%)",
								width: phoneW * 0.28,
								height: 22,
								backgroundColor: "#000",
								borderRadius: 14,
								zIndex: 10,
								boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
							}}
						/>
					)}

					{/* Subtle screen reflection */}
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "55%",
							height: "25%",
							background: "linear-gradient(145deg, rgba(255,255,255,0.02) 0%, transparent 60%)",
							pointerEvents: "none",
							zIndex: 5,
						}}
					/>

					{/* Edge vignette */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							boxShadow: "inset 0 0 40px 5px rgba(0,0,0,0.1)",
							borderRadius: screenRadius,
							pointerEvents: "none",
							zIndex: 5,
						}}
					/>
				</div>
			</div>
		</AbsoluteFill>
	);
};
