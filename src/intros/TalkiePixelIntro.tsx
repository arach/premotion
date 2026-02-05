import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Easing,
} from "remotion";
import { useCallback, useEffect, useRef } from "react";
import { ScanEffect } from "../components/ScanEffect";

// Pixelation intro — continuously animates resolution using canvas
// Draws the icon at a small size then scales up with nearest-neighbor,
// producing smooth pixelation that resolves to the clean image.
export const TalkiePixelIntro: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const imgLoadedRef = useRef(false);

	const iconSize = 320;
	const borderRadius = iconSize * 0.22;
	const totalSec = durationInFrames / fps;

	// Load the source image once
	const iconSrc = staticFile("talkie-icon-1024.png");

	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			imgRef.current = img;
			imgLoadedRef.current = true;
		};
		img.src = iconSrc;
	}, [iconSrc]);

	// === TIMING (scales to duration) ===
	// Shorter compositions: resolve takes ~75% of duration
	// Longer compositions (>4s): resolve takes ~60% so we don't linger on micro-details
	const isLong = totalSec > 4;
	const resolveEnd = isLong ? totalSec * 0.6 : totalSec * 0.75;
	const textStart = (resolveEnd + 0.15) * fps;

	// Animated resolution: 3 → iconSize (320)
	// Starts extremely chunky, smoothly increases
	// Stronger ease-in for longer versions so chunky pixels dominate
	// and the final refinement happens quickly
	const easingFn = isLong
		? (t: number) => t * t * t * t  // quartic — very slow start, fast finish
		: Easing.in(Easing.cubic);       // cubic — moderate

	const resolution = interpolate(
		frame,
		[0, resolveEnd * fps],
		[3, iconSize],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
			easing: easingFn,
		}
	);

	// Fade in
	const fadeIn = interpolate(frame, [0, 8], [0, 1], {
		extrapolateRight: "clamp",
	});

	// Once resolution is close enough, show the real <Img> for crispness
	const isClean = resolution >= iconSize * 0.95;
	const imgOpacity = isClean
		? interpolate(
				resolution,
				[iconSize * 0.95, iconSize],
				[0, 1],
				{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
			)
		: 0;

	// Draw pixelated frame onto canvas
	const drawFrame = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imgRef.current;
		if (!canvas || !img || !imgLoadedRef.current) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear
		ctx.clearRect(0, 0, iconSize, iconSize);

		// Round resolution to integer for clean pixel grid
		const res = Math.max(2, Math.round(resolution));

		if (res >= iconSize) {
			// Full resolution — just draw the image directly
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(img, 0, 0, iconSize, iconSize);
		} else {
			// Step 1: Draw image small (downsampled)
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "low";
			ctx.drawImage(img, 0, 0, res, res);

			// Step 2: Grab the small version
			const smallData = ctx.getImageData(0, 0, res, res);

			// Step 3: Clear and redraw scaled up with no smoothing (nearest-neighbor)
			ctx.clearRect(0, 0, iconSize, iconSize);
			ctx.imageSmoothingEnabled = false;

			// Create a temp canvas for the small image
			const tmpCanvas = document.createElement("canvas");
			tmpCanvas.width = res;
			tmpCanvas.height = res;
			const tmpCtx = tmpCanvas.getContext("2d");
			if (tmpCtx) {
				tmpCtx.putImageData(smallData, 0, 0);
				ctx.drawImage(tmpCanvas, 0, 0, res, res, 0, 0, iconSize, iconSize);
			}
		}
	}, [resolution, iconSize]);

	// Redraw every frame
	useEffect(() => {
		drawFrame();
	}, [drawFrame]);

	// TALKIE
	const talkieOpacity = interpolate(frame, [textStart, textStart + 12], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// === SCAN LINE EFFECT ===
	// Sweeps left→right in the final stretch of pixelation, before clean crossfade
	// Scan starts when resolution hits ~70% and completes at ~95%
	const scanStart = resolveEnd * fps * 0.75;
	const scanEnd = resolveEnd * fps * 0.98;
	const scanProgress = interpolate(
		frame,
		[scanStart, scanEnd],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) }
	);
	const scanActive = frame >= scanStart && frame <= scanEnd + 4;

	// Scan line intensity (fades in, stays, fades out at edges)
	const scanIntensity = interpolate(
		scanProgress,
		[0, 0.05, 0.9, 1],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Subtle horizontal scanlines (CRT effect) during the scan pass
	const crtOpacity = interpolate(
		frame,
		[scanStart, scanStart + 6, scanEnd - 4, scanEnd],
		[0, 0.06, 0.06, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Subtle glow as it resolves
	const glowIntensity = isClean ? interpolate(
		resolution,
		[iconSize * 0.95, iconSize],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	) : 0;

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
			{/* Icon area */}
			<div
				style={{
					position: "relative",
					width: iconSize,
					height: iconSize,
					opacity: fadeIn,
				}}
			>
				{/* Canvas — draws the pixelated version */}
				<canvas
					ref={canvasRef}
					width={iconSize}
					height={iconSize}
					style={{
						width: iconSize,
						height: iconSize,
						borderRadius,
						opacity: isClean ? 1 - imgOpacity : 1,
					}}
				/>

				{/* Real <Img> for final clean frame (avoids canvas anti-aliasing) */}
				<Img
					src={iconSrc}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: iconSize,
						height: iconSize,
						borderRadius,
						opacity: imgOpacity,
					}}
				/>

				{/* Scan effect */}
				{scanActive && (
					<ScanEffect
						direction="vertical"
						progress={scanProgress}
						intensity={scanIntensity}
						showScanlines={crtOpacity > 0}
						scanlineOpacity={crtOpacity}
						borderRadius={borderRadius}
					/>
				)}

				{/* Subtle glow when clean */}
				<div
					style={{
						position: "absolute",
						inset: -4,
						borderRadius: borderRadius + 4,
						boxShadow: `0 0 ${glowIntensity * 20}px rgba(180, 180, 200, ${glowIntensity * 0.08})`,
						border: `1px solid rgba(200, 200, 220, ${glowIntensity * 0.1})`,
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
