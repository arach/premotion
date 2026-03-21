import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Audio,
	AbsoluteFill,
	Sequence,
	Easing,
} from "remotion";
import { MidjourneyComputerFrame } from "./MidjourneyComputerFrame";
import { TalkiePixelIntro } from "../intros/TalkiePixelIntro";
import { SCREEN_POSITION } from "../hooks/useScreenZoom";
import { ReferenceGrid, ViewportTarget } from "./debug";

// Voiceover options for A/B testing in Studio
const VOICEOVER_OPTIONS = [
	{ id: "vo1", file: "voiceover/talkie-intro-2.mp3", label: "Intro 2 (6.6s)" },
	{ id: "vo2", file: "voiceover/talkie-intro-4.mp3", label: "Intro 4 (2s)" },
	{ id: "vo3", file: "voiceover/talkie-script7-final.mp3", label: "Script 7 (6.2s)" },
	{ id: "vo4", file: "voiceover/talkie-ephemeral-final.mp3", label: "Ephemeral (9.5s)" },
];

interface TalkiePromoVideoProps {
	// Content
	contentFile?: string;
	// Audio
	musicTrack?: string;
	musicVolume?: number;
	voiceoverStartAt?: number; // seconds - when voiceovers start (default: start of content phase)
	// Voiceover volume toggles (0 = off, 1 = on) - toggle in Studio to A/B test
	vo1Volume?: number;  // Intro 2 (6.6s)
	vo2Volume?: number;  // Intro 4 (2s)
	vo3Volume?: number;  // Script 7 (6.2s)
	vo4Volume?: number;  // Ephemeral (9.5s)
	// Timing (in seconds)
	introDuration?: number;
	zoomDuration?: number;
	contentDuration?: number;
	outroDuration?: number;
	// Visual adjustments
	introScale?: number; // Scale of the logo/intro inside screen (default 0.7)
	showBezel?: boolean; // Show CRT bezel on fullscreen content
	bezelMargin?: number; // Bezel thickness as % of canvas (default 10)
	screenshotScale?: number; // Scale multiplier for screenshot (default 1.3)
	// Debug
	showViewportTarget?: boolean; // Show target viewport rectangle for alignment
	// Target offset adjustments (percentage of canvas)
	targetOffsetX?: number; // Negative = left, positive = right
	targetOffsetY?: number; // Negative = up, positive = down
}

// Glitch bars overlay - builds energy during intro and zoom
const GlitchBars: React.FC<{ intensity: number; seed?: number }> = ({ intensity, seed = 0 }) => {
	const frame = useCurrentFrame();

	if (intensity < 0.05) return null;

	const bars = [];
	const barCount = Math.floor(3 + intensity * 5);

	for (let i = 0; i < barCount; i++) {
		const t = frame * 0.15 + i * 73 + seed;
		const y = (Math.sin(t) * 0.5 + 0.5) * 100;
		const h = Math.abs(Math.sin(t * 1.7)) * 3 + 1;
		const shift = Math.sin(t * 0.5) * 15 * intensity;
		const alpha = 0.08 + Math.abs(Math.sin(t * 2.1)) * 0.12;

		bars.push(
			<div
				key={i}
				style={{
					position: "absolute",
					top: `${y}%`,
					left: 0,
					right: 0,
					height: h,
					backgroundColor: `rgba(255, 255, 255, ${alpha * intensity})`,
					transform: `translateX(${shift}px)`,
				}}
			/>
		);
	}

	return <>{bars}</>;
};

export const TalkiePromoVideo: React.FC<TalkiePromoVideoProps> = ({
	contentFile = "talkie-home.png",
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.15,
	voiceoverStartAt,  // defaults to content phase start if not set
	// Voiceover toggles - set one to 1 to enable, others to 0
	vo1Volume = 1,  // Intro 2 enabled by default
	vo2Volume = 0,
	vo3Volume = 0,
	vo4Volume = 0,
	introDuration = 5,
	zoomDuration = 1.5,
	contentDuration = 10,
	outroDuration = 2,
	introScale = 0.45,
	showBezel = true,
	bezelMargin = 26,
	screenshotScale = 1.2,
	showViewportTarget = false,
	targetOffsetX = 0,  // Fine-tune if screen calibration is off
	targetOffsetY = 0,  // Fine-tune if screen calibration is off
}) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames, width, height } = useVideoConfig();

	// === TIMING (in frames) ===
	const introFrames = introDuration * fps;
	const zoomFrames = zoomDuration * fps;
	const contentFrames = contentDuration * fps;

	// Phase boundaries
	const introEnd = introFrames;
	const zoomEnd = introEnd + zoomFrames;
	const contentEnd = zoomEnd + contentFrames;
	// outroEnd = durationInFrames

	// === SCREEN GEOMETRY (from MidjourneyComputerFrame calibration) ===
	// Screen position as percentages: left=17.8%, top=27%, width=36.4%, height=28.3%
	const screenLeft = (SCREEN_POSITION.left / 100) * width;
	const screenTop = (SCREEN_POSITION.top / 100) * height;
	const screenWidth = (SCREEN_POSITION.width / 100) * width;
	const screenHeight = (SCREEN_POSITION.height / 100) * height;

	// Screen center in pixels
	const screenCenterX = screenLeft + screenWidth / 2;
	const screenCenterY = screenTop + screenHeight / 2;

	// Canvas center
	const canvasCenterX = width / 2;
	const canvasCenterY = height / 2;

	// The target (content area) will fill the canvas at zoom end.
	// With bezelMargin=26, target is 48% of canvas.
	// Scale needed: 100 / 48 ≈ 2.08 makes target fill canvas.
	// Add small squeeze to zoom in a bit more.
	const targetWidthPct = 100 - 2 * bezelMargin;  // 48% with bezelMargin=26
	const SQUEEZE_FACTOR = 1.0;  // Perfect at 1.0
	const targetScale = (100 / targetWidthPct) * SQUEEZE_FACTOR;

	// === ZOOM ANIMATION ===
	// We need BOTH scale AND translate to:
	// 1. Scale up so screen fills canvas
	// 2. Translate so screen ends up centered (not offset)
	const getZoomTransform = () => {
		let scale = 1;
		let progress = 0; // 0 = start, 1 = fully zoomed

		if (frame < introEnd) {
			// Intro phase - no zoom yet
			scale = 1;
			progress = 0;
		} else if (frame < zoomEnd) {
			// Zooming in
			progress = interpolate(
				frame,
				[introEnd, zoomEnd],
				[0, 1],
				{ easing: Easing.inOut(Easing.cubic) }
			);
			scale = interpolate(progress, [0, 1], [1, targetScale]);
		} else if (frame < contentEnd) {
			// Fully zoomed
			scale = targetScale;
			progress = 1;
		} else {
			// Zooming out
			progress = interpolate(
				frame,
				[contentEnd, durationInFrames],
				[1, 0],
				{ easing: Easing.inOut(Easing.cubic) }
			);
			scale = interpolate(progress, [0, 1], [1, targetScale]);
		}

		// Calculate translation to center the screen on canvas
		// At progress=0: no translation (screen at original position)
		// At progress=1: screen center moves to canvas center
		// The targetOffset allows fine-tuning if screen calibration is slightly off
		const targetX = canvasCenterX + (targetOffsetX / 100) * width;
		const targetY = canvasCenterY + (targetOffsetY / 100) * height;
		const offsetX = (targetX - screenCenterX) * progress;
		const offsetY = (targetY - screenCenterY) * progress;

		return { scale, offsetX, offsetY, progress };
	};

	const { scale: zoomScale, offsetX, offsetY, progress: zoomProgress } = getZoomTransform();

	// === INTRO ENERGY BUILDUP ===
	// Glitch intensity builds during intro, peaks dramatically at zoom start
	const introGlitchIntensity = interpolate(
		frame,
		[fps * 3, introEnd - fps * 1, introEnd - fps * 0.3, introEnd, introEnd + fps * 0.2],
		[0, 0.3, 0.6, 1.0, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// === LAYER VISIBILITY ===
	// Intro content (TalkiePixelIntro inside screen) - visible during intro, fades back in for outro
	const introOpacity = (() => {
		if (frame < introEnd - fps * 0.3) {
			return 1;
		} else if (frame < introEnd + fps * 0.2) {
			// Fade out at end of intro
			return interpolate(frame, [introEnd - fps * 0.3, introEnd + fps * 0.2], [1, 0]);
		} else if (frame < contentEnd) {
			return 0;
		} else if (frame < contentEnd + fps * 0.5) {
			// Fade back in for outro
			return interpolate(frame, [contentEnd, contentEnd + fps * 0.5], [0, 1]);
		} else {
			return 1;
		}
	})();

	// Main content (screenshot) - fades in during zoom, visible during content phase, fades out for outro
	const contentOpacity = interpolate(
		frame,
		[introEnd, zoomEnd, contentEnd, contentEnd + fps * 0.3],
		[0, 1, 1, 0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Frame layer visibility - fades out as we approach full zoom, back in for outro
	const frameOpacity = (() => {
		if (frame < zoomEnd - fps * 0.15) {
			return 1;
		} else if (frame < zoomEnd) {
			return interpolate(frame, [zoomEnd - fps * 0.15, zoomEnd], [1, 0]);
		} else if (frame < contentEnd) {
			return 0;
		} else if (frame < contentEnd + fps * 0.2) {
			return interpolate(frame, [contentEnd, contentEnd + fps * 0.2], [0, 1]);
		} else {
			return 1;
		}
	})();

	// Full-screen content layer visibility (only during zoomed-in content phase)
	const fullscreenOpacity = (() => {
		if (frame < zoomEnd - fps * 0.1) {
			return 0;
		} else if (frame < zoomEnd) {
			return interpolate(frame, [zoomEnd - fps * 0.1, zoomEnd], [0, 1]);
		} else if (frame < contentEnd) {
			return 1;
		} else if (frame < contentEnd + fps * 0.15) {
			return interpolate(frame, [contentEnd, contentEnd + fps * 0.15], [1, 0]);
		} else {
			return 0;
		}
	})();

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0c" }}>
			{/* Background music */}
			<Audio
				src={staticFile(musicTrack)}
				volume={(f) => {
					const fadeIn = interpolate(f, [0, fps * 0.5], [0, musicVolume], { extrapolateRight: "clamp" });
					const fadeOut = interpolate(f, [durationInFrames - fps, durationInFrames], [musicVolume, 0], { extrapolateLeft: "clamp" });
					return Math.min(fadeIn, fadeOut);
				}}
			/>

			{/* Voiceover options - toggle volumes in Studio to A/B test */}
			{/* Only renders enabled voiceovers to reduce timeline clutter */}
			{(() => {
				const voVolumes = [vo1Volume, vo2Volume, vo3Volume, vo4Volume];
				const voStart = voiceoverStartAt !== undefined ? voiceoverStartAt * fps : zoomEnd;
				return VOICEOVER_OPTIONS.map((track, i) =>
					voVolumes[i] > 0 ? (
						<Sequence key={track.id} from={voStart} name={`VO: ${track.label}`}>
							<Audio src={staticFile(track.file)} volume={voVolumes[i]} />
						</Sequence>
					) : null
				);
			})()}

			{/* SFX: Tap sound before zoom starts */}
			<Sequence from={introEnd - Math.round(fps * 0.3)} name="SFX: Pre-zoom tap">
				<Audio src={staticFile("sfx/tap.wav")} volume={0.6} />
			</Sequence>

			{/* SFX: Tap sound at content to outro transition */}
			<Sequence from={contentEnd - Math.round(fps * 0.3)} name="SFX: Outro tap">
				<Audio src={staticFile("sfx/tap.wav")} volume={0.6} />
			</Sequence>

			{/* Phase markers for timeline visibility */}
			<Sequence from={0} durationInFrames={introEnd} name="1. Intro">
				<></>
			</Sequence>
			<Sequence from={introEnd} durationInFrames={zoomEnd - introEnd} name="2. Zoom In">
				<></>
			</Sequence>
			<Sequence from={zoomEnd} durationInFrames={contentEnd - zoomEnd} name="3. Content">
				<></>
			</Sequence>
			<Sequence from={contentEnd} durationInFrames={durationInFrames - contentEnd} name="4. Outro">
				<></>
			</Sequence>

			{/* LAYER 1: Computer frame with zoom + translate */}
			<AbsoluteFill style={{ opacity: frameOpacity }}>
				<div
					style={{
						width: "100%",
						height: "100%",
						transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoomScale})`,
						transformOrigin: `${screenCenterX}px ${screenCenterY}px`,
					}}
				>
					<MidjourneyComputerFrame wordmarkText="TALKIE" powerOnEffect={frame < fps * 0.5}>
						{/* Screen content */}
						<AbsoluteFill style={{ backgroundColor: "#0a0a0c" }}>
							{/* Intro: TalkiePixelIntro plays inside (scaled down to fit screen) */}
							<AbsoluteFill style={{ opacity: introOpacity }}>
								<div
									style={{
										width: "100%",
										height: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										transform: `scale(${introScale}) translateY(8%)`,
									}}
								>
									<TalkiePixelIntro animationDuration={introDuration} />
								</div>
							</AbsoluteFill>

							{/* Content preview inside screen (fades in during zoom) */}
							<AbsoluteFill style={{ opacity: contentOpacity }}>
								<div
									style={{
										width: "100%",
										height: "100%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										overflow: "hidden",
									}}
								>
									<Img
										src={staticFile(contentFile)}
										style={{
											width: `${screenshotScale * 100}%`,
											height: `${screenshotScale * 100}%`,
											objectFit: "cover",
										}}
									/>
								</div>
							</AbsoluteFill>

							{/* Glitch overlay inside screen */}
							<GlitchBars intensity={introGlitchIntensity} seed={42} />
						</AbsoluteFill>
					</MidjourneyComputerFrame>
				</div>

				{/* Glitch overlay on top of everything during intro buildup */}
				<AbsoluteFill style={{ pointerEvents: "none" }}>
					<GlitchBars intensity={introGlitchIntensity * 0.5} seed={137} />
				</AbsoluteFill>
			</AbsoluteFill>

			{/* LAYER 2: CRT frame with screenshot inside (matches zoom end exactly) */}
			<AbsoluteFill style={{ opacity: fullscreenOpacity, backgroundColor: "#0a0a0c" }}>
				{/* CRT computer frame at zoom end position */}
				<div
					style={{
						width: "100%",
						height: "100%",
						transform: `translate(${canvasCenterX - screenCenterX}px, ${canvasCenterY - screenCenterY}px) scale(${targetScale})`,
						transformOrigin: `${screenCenterX}px ${screenCenterY}px`,
					}}
				>
					<MidjourneyComputerFrame wordmarkText="TALKIE" powerOnEffect={false}>
						{/* Screenshot inside the CRT screen - scaled up to fill frame better */}
						<div
							style={{
								width: "100%",
								height: "100%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								overflow: "hidden",
							}}
						>
							<Img
								src={staticFile(contentFile)}
								style={{
									width: `${screenshotScale * 100}%`,
									height: `${screenshotScale * 100}%`,
									objectFit: "cover",
								}}
							/>
						</div>
					</MidjourneyComputerFrame>
				</div>
			</AbsoluteFill>

			{/* Debug overlays - toggle with showViewportTarget prop in Studio */}
			{showViewportTarget && <ReferenceGrid />}
			{showViewportTarget && frame < zoomEnd && (
				<ViewportTarget
					left={SCREEN_POSITION.left + targetOffsetX}
					top={SCREEN_POSITION.top + targetOffsetY}
					width={SCREEN_POSITION.width}
					height={SCREEN_POSITION.height}
					label="TARGET (screen area) → becomes full canvas"
				/>
			)}
		</AbsoluteFill>
	);
};
