import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	random,
	Easing,
} from "remotion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// === CHARACTER FAMILIES ===
// Layer 2 (logo stroke): dense ASCII chars for the thin path outline
const STROKE_CHARS = "@#W%&MBOQXkbd";
// Layer 1 (background): braille dots — visually distinct, always animated
const BG_DOTS = "⠁⠂⠄⠈⠐⠠⠃⠅⠉⠑⠡⠆⠊⠒⠢⠌⠔⠤⠘⠨⠰·.";
// Full ASCII ramp for image sampling
const ASCII_CHARS = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

type AsciiCell = { char: string; brightness: number };

// === LOGO PATH ===
// Cubic bezier: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
function sampleCubic(
	p0: [number, number], p1: [number, number],
	p2: [number, number], p3: [number, number],
	steps: number,
): [number, number][] {
	const pts: [number, number][] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const u = 1 - t;
		const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
		const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
		pts.push([x, y]);
	}
	return pts;
}

const LOGO_CURVES: [number, number][][] = [
	[[842.671, 505.537], [850.408, 496.898], [932.785, 188.771], [910.076, 24.664]],
	[[910.076, 24.664], [904.038, -18.96], [752.937, 100.157], [786.658, 71.828]],
	[[786.658, 71.828], [823.085, 41.23], [915.165, -30.007], [921.924, 17.081]],
	[[921.924, 17.081], [944.318, 173.081], [893.478, 351.604], [853.424, 525.081]],
	[[853.424, 525.081], [745.585, 460.04], [633.535, 348.616], [510.392, 374.98]],
	[[510.392, 374.98], [397.424, 392.581], [12.924, 586.581], [1.424, 525.081]],
	[[1.424, 525.081], [2.345, 494.028], [5.481, 467.638], [8.177, 436.689]],
	[[8.177, 436.689], [16.703, 338.686], [29.063, 240.806], [48.051, 144.284]],
	[[48.051, 144.284], [55.209, 107.904], [59.605, 63.569], [88.874, 40.803]],
	[[88.874, 40.803], [144.668, -2.593], [232.968, 62.743], [292.038, 101.562]],
	[[292.038, 101.562], [400.313, 178.642], [500.054, 265.366], [842.671, 505.537]],
];

const PATH_MIN_X = 1.424;
const PATH_MAX_X = 944.318;
const PATH_MIN_Y = -30.007;
const PATH_MAX_Y = 586.581;
const PATH_W = PATH_MAX_X - PATH_MIN_X;
const PATH_H = PATH_MAX_Y - PATH_MIN_Y;
const PATH_NUDGE_Y = 0.04;

function sampleLogoPoints(iconSize: number): [number, number][] {
	const pts: [number, number][] = [];
	const scale = iconSize / Math.max(PATH_W, PATH_H) * 0.95;
	const offsetX = (iconSize - PATH_W * scale) / 2;
	const offsetY = (iconSize - PATH_H * scale) / 2 + iconSize * PATH_NUDGE_Y;

	for (const curve of LOGO_CURVES) {
		const [p0, p1, p2, p3] = curve as [[number, number], [number, number], [number, number], [number, number]];
		// Dense sampling for thin stroke accuracy
		const sampled = sampleCubic(p0, p1, p2, p3, 40);
		for (const [x, y] of sampled) {
			pts.push([
				(x - PATH_MIN_X) * scale + offsetX,
				(y - PATH_MIN_Y) * scale + offsetY,
			]);
		}
	}
	return pts;
}

// Ray-casting point-in-polygon test.
// polygon is an ordered array of [x, y] vertices forming a closed shape.
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i][0], yi = polygon[i][1];
		const xj = polygon[j][0], yj = polygon[j][1];
		if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
			inside = !inside;
		}
	}
	return inside;
}

// Build both distance map and inside/outside map in one pass.
type CellMaps = { dist: number[][]; inside: boolean[][] };

function buildCellMaps(
	cols: number, rows: number, charW: number, charH: number, iconSize: number,
): CellMaps {
	const points = sampleLogoPoints(iconSize);

	// Build polygon from the sampled points (ordered along the path)
	const polygon = points;

	const dist: number[][] = [];
	const inside: boolean[][] = [];

	for (let r = 0; r < rows; r++) {
		const rowDists: number[] = [];
		const rowInside: boolean[] = [];
		for (let c = 0; c < cols; c++) {
			const px = c * charW + charW / 2;
			const py = r * charH + charH / 2;

			// Distance to nearest path point
			let minDist = Infinity;
			for (const [sx, sy] of points) {
				const dx = px - sx;
				const dy = py - sy;
				const d = dx * dx + dy * dy;
				if (d < minDist) minDist = d;
			}
			rowDists.push(Math.sqrt(minDist));

			// Inside/outside test
			rowInside.push(pointInPolygon(px, py, polygon));
		}
		dist.push(rowDists);
		inside.push(rowInside);
	}

	return { dist, inside };
}

// Hook to sample the icon at a fixed resolution
const useAsciiGrid = (src: string, cols: number, rows: number) => {
	const [grid, setGrid] = useState<AsciiCell[][]>([]);
	const loadedRef = useRef(false);

	const processImage = useCallback(() => {
		if (loadedRef.current) return;

		const canvas = document.createElement("canvas");
		canvas.width = cols;
		canvas.height = rows;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			ctx.drawImage(img, 0, 0, cols, rows);
			const imageData = ctx.getImageData(0, 0, cols, rows);
			const pixels = imageData.data;

			const newGrid: AsciiCell[][] = [];
			for (let r = 0; r < rows; r++) {
				const row: AsciiCell[] = [];
				for (let c = 0; c < cols; c++) {
					const idx = (r * cols + c) * 4;
					const red = pixels[idx];
					const green = pixels[idx + 1];
					const blue = pixels[idx + 2];
					const alpha = pixels[idx + 3];

					const brightness = alpha > 10
						? (0.299 * red + 0.587 * green + 0.114 * blue) / 255
						: 0;

					const charIndex = Math.floor((1 - brightness) * (ASCII_CHARS.length - 1));
					const char = alpha > 10 ? ASCII_CHARS[Math.min(charIndex, ASCII_CHARS.length - 1)] : " ";

					row.push({ char, brightness });
				}
				newGrid.push(row);
			}

			setGrid(newGrid);
			loadedRef.current = true;
		};
		img.src = src;
	}, [src, cols, rows]);

	useEffect(() => {
		processImage();
	}, [processImage]);

	return grid;
};

// Thin stroke: cells within this many pixels of the path are "on the stroke"
// charW=7, so 7px ≈ 1 char wide
const STROKE_RADIUS = 7;

// Interior fill: cells inside the closed path get a softer fill treatment.
// No radius limit — if it's inside the polygon, it gets filled.
const FILL_RADIUS = 999;

export const TalkieAsciiIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const iconSize = 360;
	const charW = 7;
	const charH = 12;
	const fontSize = 8;
	const cols = Math.ceil(iconSize / charW);  // ~51
	const rows = Math.ceil(iconSize / charH);  // ~30

	// === TIMING ===
	// 0-0.6s:  Layer 1 only — animated background noise
	// 0.6-2.0s: Curtain sweeps top→bottom, revealing Layer 2 (thin logo stroke)
	// 2.0-2.2s: Full stroke visible, bg still animating
	// 2.2-2.5s: ASCII → Real icon crossfade
	// 2.5-3.0s: Clean icon + TALKIE

	const resolveEnd = 2.2 * fps;
	const crossfadeEnd = 2.5 * fps;
	const textStart = 2.55 * fps;

	const iconSrc = staticFile("talkie-icon-1024.png");
	const grid = useAsciiGrid(iconSrc, cols, rows);

	// Precomputed maps: distance to path + inside/outside polygon
	const cellMaps = useMemo(
		() => buildCellMaps(cols, rows, charW, charH, iconSize),
		[cols, rows, charW, charH, iconSize],
	);

	// === LAYER 3: CURTAIN — top-to-bottom sweep ===
	// Returns 0 (top) to 1 (bottom). Rows above this = revealed.
	const curtainProgress = interpolate(
		frame,
		[0.6 * fps, 2.0 * fps],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
	);

	// Curtain edge brightness: the scan line itself glows
	// It's a ~3-row band that travels with the curtain
	const curtainRow = curtainProgress * (rows - 1);

	// === LAYER 1: BACKGROUND ===
	// Background animation rate: starts as fast scrambling letters,
	// transitions to animated dots but keeps some letter mix throughout
	const bgLetterMix = interpolate(
		frame,
		[0, 0.6 * fps, 1.6 * fps],
		[1, 0.5, 0.15],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Background brightness: stays visible and present throughout
	// so the logo area always feels alive up to the crossfade
	const bgAlpha = interpolate(
		frame,
		[0, 0.4 * fps, resolveEnd],
		[0.28, 0.24, 0.18],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// === LAYER 2: STROKE ===
	// Stroke brightness — subtle, just a hint brighter than background
	const strokeGlow = interpolate(
		frame,
		[0.6 * fps, 1.6 * fps],
		[0.3, 0.55],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// ASCII opacity (fades out during crossfade)
	const asciiOpacity = interpolate(
		frame,
		[resolveEnd, crossfadeEnd],
		[1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Real icon
	const iconOpacity = interpolate(
		frame,
		[resolveEnd, crossfadeEnd],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Overall fade in
	const overallOpacity = interpolate(frame, [0, 6], [0, 1], {
		extrapolateRight: "clamp",
	});

	// TALKIE text
	const talkieOpacity = interpolate(frame, [textStart, textStart + 12], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Flicker
	const flickerSeed = random(`flk-${Math.floor(frame / 3)}`);
	const flicker = frame < resolveEnd && flickerSeed > 0.93 ? 0.85 : 1;

	// Animation ticks
	const fastSlot = Math.floor(frame / 2);
	const slowSlot = Math.floor(frame / 3);

	return (
		<div
			style={{
				flex: 1,
				backgroundColor: "#08080c",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* Subtle scanlines */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: interpolate(frame, [0, crossfadeEnd], [0.04, 0.01], { extrapolateRight: "clamp" }),
					background: `repeating-linear-gradient(
						0deg,
						transparent,
						transparent 2px,
						rgba(0, 0, 0, 0.25) 2px,
						rgba(0, 0, 0, 0.25) 4px
					)`,
					pointerEvents: "none",
				}}
			/>

			{/* Logo area */}
			<div
				style={{
					position: "relative",
					width: iconSize,
					height: iconSize,
					opacity: overallOpacity,
				}}
			>
				{/* === THREE-LAYER ASCII GRID === */}
				{asciiOpacity > 0 && grid.length > 0 && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							opacity: asciiOpacity * flicker,
							fontFamily: "SF Mono, Monaco, Consolas, monospace",
							fontSize,
							lineHeight: `${charH}px`,
							whiteSpace: "pre",
							overflow: "hidden",
						}}
					>
						{grid.map((row, r) => (
							<div key={r} style={{ display: "flex", height: charH }}>
								{row.map((cell, c) => {
									const rawDist = cellMaps.dist[r]?.[c] ?? 999;
									const isInside = cellMaps.inside[r]?.[c] ?? false;
									const onStroke = rawDist <= STROKE_RADIUS;

									// Interior fill: inside the closed path, not on the stroke itself
									const inFill = isInside && rawDist > STROKE_RADIUS;

									// Has the curtain passed this row?
									const rowNorm = r / (rows - 1);
									const revealed = curtainProgress >= rowNorm;

									// Curtain edge: is this row near the current scan line?
									const distFromCurtain = Math.abs(r - curtainRow);
									const onCurtainEdge = distFromCurtain < 2 && curtainProgress > 0 && curtainProgress < 1;

									let displayChar: string;
									let color: string;

									// Transparent cells: image has no content here
									if (cell.char === " " && !onStroke && !inFill) {
										return (
											<span
												key={c}
												style={{ width: charW, textAlign: "center", color: "transparent" }}
											>
												{"\u00A0"}
											</span>
										);
									}

									if (revealed && onStroke) {
										// === LAYER 2: LOGO STROKE ===
										// Subtle — medium gray, just enough to hint at structure
										const charIdx = Math.floor(
											random(`st-${r}-${c}`) * STROKE_CHARS.length
										);
										displayChar = STROKE_CHARS[charIdx];

										const alpha = 0.25 + strokeGlow * 0.2;
										color = `rgba(160, 158, 175, ${alpha})`;
									} else if (revealed && inFill) {
										// === INTERIOR FILL ===
										// Even subtler — barely visible structure inside the path
										const maxInteriorDist = 80;
										const fillFalloff = Math.max(0, 1 - rawDist / maxInteriorDist);
										const charIdx = Math.floor(
											random(`fl-${r}-${c}`) * STROKE_CHARS.length
										);
										displayChar = STROKE_CHARS[charIdx];
										const fillAlpha = 0.08 + fillFalloff * 0.15;
										color = `rgba(140, 138, 155, ${fillAlpha})`;
									} else if (onCurtainEdge) {
										// === LAYER 3: CURTAIN EDGE ===
										// Gentle scan line, not attention-grabbing
										const edgeIdx = Math.floor(
											random(`ce-${r}-${c}-${fastSlot}`) * BG_DOTS.length
										);
										displayChar = BG_DOTS[edgeIdx];
										const edgeBrightness = 0.22 * (1 - distFromCurtain / 2);
										color = `rgba(150, 150, 165, ${edgeBrightness})`;
									} else {
										// === LAYER 1: BACKGROUND ===
										// Always present, always animated
										const useLetter = random(`bgm-${r}-${c}-${fastSlot}`) < bgLetterMix;

										if (useLetter) {
											// Early phase: random letters (same pool as stroke but scrambled)
											const charIdx = Math.floor(
												random(`bgl-${r}-${c}-${fastSlot}`) * STROKE_CHARS.length
											);
											displayChar = STROKE_CHARS[charIdx];
										} else {
											// Later phase: braille dots, gentle animation
											const dotIdx = Math.floor(
												random(`bgd-${r}-${c}-${slowSlot}`) * BG_DOTS.length
											);
											displayChar = BG_DOTS[dotIdx];
										}

										color = `rgba(120, 120, 140, ${bgAlpha})`;
									}

									return (
										<span
											key={c}
											style={{
												width: charW,
												textAlign: "center",
												color,
											}}
										>
											{displayChar}
										</span>
									);
								})}
							</div>
						))}
					</div>
				)}

				{/* Real icon - crossfades in */}
				<Img
					src={staticFile("talkie-icon-1024.png")}
					style={{
						position: "absolute",
						width: iconSize,
						height: iconSize,
						borderRadius: iconSize * 0.22,
						opacity: iconOpacity,
					}}
				/>

				{/* Border */}
				<div
					style={{
						position: "absolute",
						inset: -2,
						borderRadius: iconSize * 0.22 + 2,
						border: `1px solid rgba(200, 200, 220, ${interpolate(frame, [crossfadeEnd - 10, crossfadeEnd], [0, 0.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
						pointerEvents: "none",
					}}
				/>
			</div>

			{/* TALKIE */}
			<div
				style={{
					marginTop: 36,
					opacity: talkieOpacity,
					textAlign: "center",
				}}
			>
				<div
					style={{
						fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif",
						color: "#dddde8",
						fontSize: 38,
						fontWeight: 400,
						letterSpacing: "0.25em",
						paddingLeft: "0.25em",
					}}
				>
					TALKIE
				</div>
			</div>

			{/* Vignette */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};
