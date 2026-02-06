import { useCurrentFrame, useVideoConfig, AbsoluteFill, Img, staticFile } from "remotion";
import { SCREEN_POSITION } from "../hooks/useScreenZoom";

interface CRTBezelOverlayProps {
	// The frame image to use
	frameImage?: string;
	// How much bezel to show as percentage of canvas (on each edge)
	bezelMargin?: number;
	// Optional: show scanlines on top
	showScanlines?: boolean;
	scanlineOpacity?: number;
	// Target offset adjustments (percentage of canvas) to match zoom target
	offsetX?: number;
	offsetY?: number;
}

/**
 * Overlay that shows the actual CRT monitor bezel from the frame image.
 * Positions the frame image zoomed in so the bezel edges frame the content.
 * The frame image has a transparent screen area, so only the bezel shows.
 */
export const CRTBezelOverlay: React.FC<CRTBezelOverlayProps> = ({
	frameImage = "retro-computer-frame.png",
	bezelMargin = 4,
	showScanlines = true,
	scanlineOpacity = 0.04,
	offsetX: targetOffsetX = 0,
	offsetY: targetOffsetY = 0,
}) => {
	const frame = useCurrentFrame();
	const { width, height } = useVideoConfig();

	// Screen geometry
	const screenWidthPct = SCREEN_POSITION.width;

	// Calculate scale to show bezel margin
	// If bezelMargin = 4%, the screen fills (100 - 2*4)% = 92% of canvas
	const contentWidthPct = 100 - 2 * bezelMargin;
	const bezelScale = contentWidthPct / screenWidthPct;

	// Screen position in pixels
	const screenLeft = (SCREEN_POSITION.left / 100) * width;
	const screenTop = (SCREEN_POSITION.top / 100) * height;
	const screenWidth = (SCREEN_POSITION.width / 100) * width;
	const screenHeight = (SCREEN_POSITION.height / 100) * height;

	// Screen center
	const screenCenterX = screenLeft + screenWidth / 2;
	const screenCenterY = screenTop + screenHeight / 2;

	// Canvas center + target offset (to match zoom animation end position)
	const canvasCenterX = width / 2;
	const canvasCenterY = height / 2;
	const targetX = canvasCenterX + (targetOffsetX / 100) * width;
	const targetY = canvasCenterY + (targetOffsetY / 100) * height;

	// Translation from screen center to target position
	const translateX = targetX - screenCenterX;
	const translateY = targetY - screenCenterY;

	// Animated scanline offset
	const scanlineOffset = (frame * 1.5) % 100;

	return (
		<AbsoluteFill style={{ pointerEvents: "none" }}>
			{/* The frame image, zoomed in to show bezel edges */}
			<div
				style={{
					position: "absolute",
					width: "100%",
					height: "100%",
					transform: `translate(${translateX}px, ${translateY}px) scale(${bezelScale})`,
					transformOrigin: `${screenCenterX}px ${screenCenterY}px`,
				}}
			>
				<Img
					src={staticFile(frameImage)}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "contain",
					}}
				/>
			</div>

			{/* Scanlines on top */}
			{showScanlines && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage: `repeating-linear-gradient(
							0deg,
							transparent,
							transparent 2px,
							rgba(0, 0, 0, ${scanlineOpacity}) 2px,
							rgba(0, 0, 0, ${scanlineOpacity}) 4px
						)`,
						backgroundPosition: `0 ${scanlineOffset}%`,
					}}
				/>
			)}
		</AbsoluteFill>
	);
};
