import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

// Screen position from MidjourneyComputerFrame (calibrated percentages)
// screenLeft=17.8%, screenTop=27.0%, screenWidth=36.4%, screenHeight=28.3%
const MIDJOURNEY_SCREEN = {
	left: 17.8,
	top: 27.0,
	width: 36.4,
	height: 28.3,
	// Computed center point
	centerX: 17.8 + 36.4 / 2, // 36%
	centerY: 27.0 + 28.3 / 2, // 41.15%
};

// ~2.8x scale makes the screen fill a 1080x1080 canvas
const FULLSCREEN_SCALE = 2.8;

interface ScreenZoomOptions {
	// Zoom IN timing (in seconds)
	zoomInDelay?: number;
	zoomInDuration?: number;
	// Zoom OUT timing (in seconds from end)
	zoomOutDuration?: number;
	zoomOutEndEarly?: number;
	// Zoom range
	startScale?: number;
	endScale?: number;
	// Whether to zoom back out at the end
	zoomOut?: boolean;
	// Easing
	easing?: (t: number) => number;
	// Custom screen position (defaults to Midjourney frame)
	screenCenterX?: number;
	screenCenterY?: number;
}

interface ScreenZoomResult {
	scale: number;
	transformOrigin: string;
	style: React.CSSProperties;
	// Helper to know which phase we're in
	phase: "intro" | "zoomed" | "outro";
}

/**
 * Hook for cinematic zoom into (and out of) the CRT screen area.
 * Pattern: Frame visible → zoom into screen → (optional) zoom back out
 *
 * Usage:
 * ```tsx
 * const { style } = useScreenZoom({ zoomOut: true });
 * return (
 *   <div style={{ width: "100%", height: "100%", ...style }}>
 *     <MidjourneyComputerFrame>...</MidjourneyComputerFrame>
 *   </div>
 * );
 * ```
 */
export function useScreenZoom(options: ScreenZoomOptions = {}): ScreenZoomResult {
	const frame = useCurrentFrame();
	const { fps, durationInFrames } = useVideoConfig();

	const {
		zoomInDelay = 0.2,
		zoomInDuration = 1.5,
		zoomOutDuration = 1.2,
		zoomOutEndEarly = 0,
		startScale = 1,
		endScale = FULLSCREEN_SCALE,
		zoomOut = false,
		easing = Easing.inOut(Easing.cubic),
		screenCenterX = MIDJOURNEY_SCREEN.centerX,
		screenCenterY = MIDJOURNEY_SCREEN.centerY,
	} = options;

	// Zoom IN phase
	const zoomInStart = zoomInDelay * fps;
	const zoomInEnd = zoomInStart + zoomInDuration * fps;

	// Zoom OUT phase (from the end)
	const zoomOutEnd = durationInFrames - zoomOutEndEarly * fps;
	const zoomOutStart = zoomOutEnd - zoomOutDuration * fps;

	let scale: number;
	let phase: "intro" | "zoomed" | "outro";

	if (frame < zoomInStart) {
		// Before zoom starts
		scale = startScale;
		phase = "intro";
	} else if (frame < zoomInEnd) {
		// Zooming in
		scale = interpolate(
			frame,
			[zoomInStart, zoomInEnd],
			[startScale, endScale],
			{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing }
		);
		phase = "intro";
	} else if (!zoomOut || frame < zoomOutStart) {
		// Fully zoomed in (main content)
		scale = endScale;
		phase = "zoomed";
	} else {
		// Zooming out
		scale = interpolate(
			frame,
			[zoomOutStart, zoomOutEnd],
			[endScale, startScale],
			{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing }
		);
		phase = "outro";
	}

	const transformOrigin = `${screenCenterX}% ${screenCenterY}%`;

	return {
		scale,
		transformOrigin,
		style: {
			transform: `scale(${scale})`,
			transformOrigin,
		},
		phase,
	};
}

// Export screen constants for reference
export const SCREEN_POSITION = MIDJOURNEY_SCREEN;
