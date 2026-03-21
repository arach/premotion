import { useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily } = loadFont();

interface TacticalVideoBezelProps {
	children: React.ReactNode;
	bezelSize?: number;
	showCornerBrackets?: boolean;
	showStatusBar?: boolean;
	title?: string;
	statusText?: string;
	matteColor?: string;
}

/**
 * A tactical/HUD-style bezel that wraps video content.
 * Features corner brackets, subtle grid, and optional status elements.
 */
export const TacticalVideoBezel: React.FC<TacticalVideoBezelProps> = ({
	children,
	bezelSize = 12,
	showCornerBrackets = true,
	showStatusBar = true,
	title = "HUD FEED",
	statusText = "LIVE",
	matteColor = "rgba(20, 22, 28, 0.95)",
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const guideColor = "rgba(180, 190, 210, 0.5)";
	const labelColor = "rgba(180, 190, 210, 0.6)";
	const bgColor = "rgba(8, 8, 12, 0.95)";

	// Blinking indicator
	const indicatorOn = Math.floor(frame / (fps * 0.6)) % 2 === 0;

	const cornerSize = 24;
	const cornerThickness = 2;

	return (
		<div
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				backgroundColor: bgColor,
				fontFamily: `${fontFamily}, SF Mono, Monaco, monospace`,
			}}
		>
			{/* Bezel/matte padding area */}
			<div
				style={{
					position: "absolute",
					top: bezelSize + 20,
					left: bezelSize,
					right: bezelSize,
					bottom: bezelSize,
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "center",
				}}
			>
				{/* Inner border wraps tightly around video */}
				<div
					style={{
						position: "relative",
						display: "inline-flex",
						flexDirection: "column",
						borderRadius: "10px 10px 22px 22px",
						border: "1px solid rgba(180, 190, 210, 0.4)",
						overflow: "hidden",
					}}
				>
					{/* Clip container to hide top white bar and trim bottom */}
					<div
						style={{
							marginTop: -6,
							marginBottom: -5,
							overflow: "hidden",
						}}
					>
						{children}
					</div>
				</div>
			</div>


			{/* Top status bar */}
			{showStatusBar && (
				<div
					style={{
						position: "absolute",
						top: 8,
						left: bezelSize,
						right: bezelSize,
						height: bezelSize + 6,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 12px",
					}}
				>
					{/* Left: Title */}
					<div
						style={{
							fontSize: 12,
							color: labelColor,
							letterSpacing: "0.15em",
							fontWeight: 300,
						}}
					>
						{title}
					</div>

					{/* Right: Status with indicator */}
					<div
						style={{
							fontSize: 12,
							color: labelColor,
							letterSpacing: "0.1em",
							fontWeight: 300,
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
					>
						<span
							style={{
								width: 5,
								height: 5,
								borderRadius: "50%",
								backgroundColor: indicatorOn ? "#4ade80" : "transparent",
								border: "1px solid #4ade80",
							}}
						/>
						{statusText}
					</div>
				</div>
			)}

			{/* Subtle edge glow */}
			<div
				style={{
					position: "absolute",
					top: bezelSize,
					left: bezelSize,
					right: bezelSize,
					bottom: bezelSize,
					borderRadius: 2,
					boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.5)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};
