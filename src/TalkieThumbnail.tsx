import { staticFile, Img } from "remotion";

interface TalkieThumbnailProps {
	title?: string;
	subtitle?: string;
	tagline?: string;
	version?: string;
	iconSrc?: string;
}

export const TalkieThumbnail: React.FC<TalkieThumbnailProps> = ({
	title = "TALKIE",
	subtitle = "Voice Engine v2.22",
	tagline = "Full Demo",
	version = "v2.22.0-beta",
	iconSrc = "talkie-icon-1024.png",
}) => {
	const iconSize = 180;
	const guideMargin = 40;
	const guideColor = "rgba(255, 255, 255, 0.7)";
	const textColor = "rgba(175, 185, 200, 0.8)";

	return (
		<div
			style={{
				flex: 1,
				backgroundColor: "#0a0a0e",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: "SF Mono, Monaco, Consolas, monospace",
				position: "relative",
			}}
		>
			{/* Grid */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.03,
					backgroundImage: `
						linear-gradient(rgba(160, 170, 190, 0.35) 1px, transparent 1px),
						linear-gradient(90deg, rgba(160, 170, 190, 0.35) 1px, transparent 1px)
					`,
					backgroundSize: "50px 50px",
				}}
			/>

			{/* Guide lines */}
			<div style={{ position: "absolute", top: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", bottom: guideMargin, left: guideMargin, right: guideMargin, height: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, left: guideMargin, width: 1, backgroundColor: guideColor }} />
			<div style={{ position: "absolute", top: guideMargin, bottom: guideMargin, right: guideMargin, width: 1, backgroundColor: guideColor }} />

			{/* Top-left: System name */}
			<div
				style={{
					position: "absolute",
					top: guideMargin + 12,
					left: guideMargin + 14,
					opacity: 0.75,
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
					opacity: 0.75,
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
					opacity: 0.75,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
				}}
			>
				<div>{version}</div>
			</div>

			{/* Bottom-right: Status indicator */}
			<div
				style={{
					position: "absolute",
					bottom: guideMargin + 12,
					right: guideMargin + 14,
					opacity: 0.75,
					color: textColor,
					fontSize: 12,
					letterSpacing: "0.05em",
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<span style={{ color: "#888" }}>●</span>
				<span>IDLE</span>
			</div>

			{/* Center: Icon */}
			<Img
				src={staticFile(iconSrc)}
				style={{
					width: iconSize,
					height: iconSize,
					borderRadius: iconSize * 0.22,
				}}
			/>

			{/* Title below icon */}
			<div style={{ marginTop: 24, textAlign: "center" }}>
				<div
					style={{
						fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
						color: "#dddde8",
						fontSize: 28,
						fontWeight: 400,
						letterSpacing: "0.25em",
						paddingLeft: "0.25em",
					}}
				>
					{title}
				</div>
				<div
					style={{
						marginTop: 8,
						color: "rgba(180, 185, 200, 0.7)",
						fontSize: 14,
						letterSpacing: "0.15em",
						paddingLeft: "0.15em",
						textTransform: "uppercase",
					}}
				>
					{tagline}
				</div>
			</div>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.45) 100%)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};
