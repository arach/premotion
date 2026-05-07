import { AbsoluteFill } from "remotion";

export function ReferenceGrid() {
	const lines = Array.from({ length: 9 }, (_, index) => (index + 1) * 10);

	return (
		<AbsoluteFill style={{ pointerEvents: "none", zIndex: 1000 }}>
			{lines.map((position) => (
				<div
					key={`v-${position}`}
					style={{
						position: "absolute",
						left: `${position}%`,
						top: 0,
						bottom: 0,
						width: 1,
						background: "rgba(34, 211, 238, 0.25)",
					}}
				/>
			))}
			{lines.map((position) => (
				<div
					key={`h-${position}`}
					style={{
						position: "absolute",
						top: `${position}%`,
						left: 0,
						right: 0,
						height: 1,
						background: "rgba(34, 211, 238, 0.25)",
					}}
				/>
			))}
		</AbsoluteFill>
	);
}

export function ViewportTarget({
	left,
	top,
	width,
	height,
	label,
}: {
	left: number;
	top: number;
	width: number;
	height: number;
	label?: string;
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: `${left}%`,
				top: `${top}%`,
				width: `${width}%`,
				height: `${height}%`,
				border: "2px solid rgba(34, 211, 238, 0.9)",
				boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.65), 0 0 24px rgba(34, 211, 238, 0.35)",
				color: "rgb(165, 243, 252)",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
				fontSize: 18,
				fontWeight: 700,
				letterSpacing: 0,
				pointerEvents: "none",
				zIndex: 1001,
			}}
		>
			{label && (
				<div
					style={{
						position: "absolute",
						left: 8,
						top: 8,
						padding: "4px 6px",
						background: "rgba(0, 0, 0, 0.7)",
					}}
				>
					{label}
				</div>
			)}
		</div>
	);
}
