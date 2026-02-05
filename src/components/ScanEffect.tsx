import React from "react";

interface ScanEffectProps {
	direction: "horizontal" | "vertical";
	progress: number;
	width?: number;
	color?: string;
	intensity?: number;
	showTrail?: boolean;
	showScanlines?: boolean;
	scanlineOpacity?: number;
	borderRadius?: number;
}

export const ScanEffect: React.FC<ScanEffectProps> = ({
	direction,
	progress,
	width = 2,
	color = "200, 210, 240",
	intensity = 1,
	showTrail = true,
	showScanlines = false,
	scanlineOpacity = 0.06,
	borderRadius = 0,
}) => {
	// Auto-fade at edges
	const edgeFade =
		progress < 0.05
			? progress / 0.05
			: progress > 0.9
				? (1 - progress) / 0.1
				: 1;
	const effectiveIntensity = intensity * edgeFade;

	const pos = progress * 100;
	const isVertical = direction === "vertical";

	// Scan line bar
	const lineStyle: React.CSSProperties = {
		position: "absolute",
		...(isVertical
			? { top: 0, left: `${pos}%`, width, height: "100%", transform: "translateX(-50%)" }
			: { left: 0, top: `${pos}%`, height: width, width: "100%", transform: "translateY(-50%)" }),
		background: `linear-gradient(
			${isVertical ? "180deg" : "90deg"},
			transparent 0%,
			rgba(${color}, ${0.5 * effectiveIntensity}) 15%,
			rgba(${color}, ${0.8 * effectiveIntensity}) 50%,
			rgba(${color}, ${0.5 * effectiveIntensity}) 85%,
			transparent 100%
		)`,
		boxShadow: `
			0 0 8px rgba(${color}, ${0.3 * effectiveIntensity}),
			0 0 20px rgba(${color}, ${0.15 * effectiveIntensity})
		`,
		borderRadius: width / 2,
		pointerEvents: "none",
	};

	// Glow trail behind the line
	const trailStyle: React.CSSProperties = {
		position: "absolute",
		...(isVertical
			? { top: 0, left: 0, width: `${pos}%`, height: "100%" }
			: { left: 0, top: 0, width: "100%", height: `${pos}%` }),
		background: `linear-gradient(
			${isVertical ? "90deg" : "180deg"},
			transparent 70%,
			rgba(${color}, ${0.04 * effectiveIntensity}) 100%
		)`,
		borderRadius,
		pointerEvents: "none",
	};

	// CRT scanlines overlay
	const scanlinesStyle: React.CSSProperties = {
		position: "absolute",
		inset: 0,
		borderRadius,
		opacity: scanlineOpacity,
		background: `repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(0, 0, 0, 0.3) 2px,
			rgba(0, 0, 0, 0.3) 4px
		)`,
		pointerEvents: "none",
	};

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				borderRadius,
				overflow: "hidden",
				pointerEvents: "none",
			}}
		>
			<div style={lineStyle} />
			{showTrail && effectiveIntensity > 0 && <div style={trailStyle} />}
			{showScanlines && <div style={scanlinesStyle} />}
		</div>
	);
};
