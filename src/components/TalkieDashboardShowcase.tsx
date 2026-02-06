import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	staticFile,
	Img,
	Audio,
	AbsoluteFill,
	Sequence,
} from "remotion";
import { MidjourneyComputerFrame } from "./MidjourneyComputerFrame";
import { useScreenZoom, SCREEN_POSITION } from "../hooks/useScreenZoom";

// All voiceover options for A/B testing
const VOICEOVER_TRACKS = [
	{ id: "vo1", file: "voiceover/talkie-intro-1.mp3", label: "Keyboard bottleneck" },
	{ id: "vo2", file: "voiceover/talkie-intro-2.mp3", label: "Why type to computer" },
	{ id: "vo3", file: "voiceover/talkie-intro-3.mp3", label: "Mind faster than fingers" },
	{ id: "vo4", file: "voiceover/talkie-intro-4.mp3", label: "Stop typing (short)" },
	{ id: "vo5", file: "voiceover/talkie-intro-5.mp3", label: "Keyboard compromise" },
];

interface TalkieDashboardShowcaseProps {
	// Content
	screenshotFile?: string;
	// Audio
	musicTrack?: string;
	musicVolume?: number;
	// Timing (in seconds)
	zoomInDuration?: number;
	contentHoldDuration?: number;
	zoomOutDuration?: number;
	// Enable individual voiceover tracks (all default to 0 so you can toggle in Studio)
	vo1Volume?: number;
	vo2Volume?: number;
	vo3Volume?: number;
	vo4Volume?: number;
	vo5Volume?: number;
}

export const TalkieDashboardShowcase: React.FC<TalkieDashboardShowcaseProps> = ({
	screenshotFile = "talkie-home.png",
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.12,
	zoomInDuration = 1.5,
	contentHoldDuration = 10,
	zoomOutDuration = 1.5,
	vo1Volume = 0,
	vo2Volume = 0,
	vo3Volume = 0,
	vo4Volume = 1,
	vo5Volume = 0,
}) => {
	const frame = useCurrentFrame();
	const { fps, durationInFrames, width, height } = useVideoConfig();

	// === TIMING (in frames) ===
	const zoomInFrames = zoomInDuration * fps;
	const contentFrames = contentHoldDuration * fps;
	const zoomOutFrames = zoomOutDuration * fps;
	const crossfadeDuration = 0.3 * fps; // Quick crossfade

	// Phase boundaries
	const zoomInEnd = zoomInFrames;
	const contentStart = zoomInEnd - crossfadeDuration; // Overlap for crossfade
	const contentEnd = contentStart + contentFrames;
	const zoomOutStart = contentEnd - crossfadeDuration; // Overlap for crossfade

	// === SCREEN COORDINATES (exact pixels for 1080x1080) ===
	// From MidjourneyComputerFrame calibration:
	// screenLeft=17.8%, screenTop=27.0%, screenWidth=36.4%, screenHeight=28.3%
	const screenLeft = (SCREEN_POSITION.left / 100) * width;   // 192px
	const screenTop = (SCREEN_POSITION.top / 100) * height;    // 292px
	const screenWidth = (SCREEN_POSITION.width / 100) * width; // 393px
	const screenHeight = (SCREEN_POSITION.height / 100) * height; // 306px

	// Center of the screen area
	const screenCenterX = screenLeft + screenWidth / 2;  // 388.5px
	const screenCenterY = screenTop + screenHeight / 2;  // 445px

	// Scale needed to fill canvas width with screen content
	const fillScale = width / screenWidth; // ~2.75

	// === ZOOM ANIMATIONS ===
	// Zoom IN phase
	const zoomInScale = interpolate(
		frame,
		[0, zoomInFrames],
		[1, fillScale],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// Zoom OUT phase
	const zoomOutScale = interpolate(
		frame,
		[zoomOutStart, durationInFrames],
		[fillScale, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" }
	);

	// === LAYER OPACITIES ===
	// Frame layer: visible during zoom-in and zoom-out, fades during transitions
	const frameOpacity = (() => {
		if (frame < contentStart) {
			// Full opacity during zoom in
			return 1;
		} else if (frame < contentStart + crossfadeDuration) {
			// Fade out as content takes over
			return interpolate(frame, [contentStart, contentStart + crossfadeDuration], [1, 0]);
		} else if (frame < zoomOutStart) {
			// Hidden during content hold
			return 0;
		} else if (frame < zoomOutStart + crossfadeDuration) {
			// Fade back in for zoom out
			return interpolate(frame, [zoomOutStart, zoomOutStart + crossfadeDuration], [0, 1]);
		} else {
			// Full opacity during zoom out
			return 1;
		}
	})();

	// Content layer: appears during content phase
	const contentOpacity = (() => {
		if (frame < contentStart) {
			return 0;
		} else if (frame < contentStart + crossfadeDuration) {
			return interpolate(frame, [contentStart, contentStart + crossfadeDuration], [0, 1]);
		} else if (frame < zoomOutStart) {
			return 1;
		} else if (frame < zoomOutStart + crossfadeDuration) {
			return interpolate(frame, [zoomOutStart, zoomOutStart + crossfadeDuration], [1, 0]);
		} else {
			return 0;
		}
	})();

	// Which scale to use based on phase
	const currentScale = frame < contentEnd ? zoomInScale : zoomOutScale;

	const voVolumes = [vo1Volume, vo2Volume, vo3Volume, vo4Volume, vo5Volume];

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0c" }}>
			{/* Background music */}
			<Audio
				src={staticFile(musicTrack)}
				volume={(f) => {
					const fadeIn = interpolate(f, [0, fps], [0, musicVolume], { extrapolateRight: "clamp" });
					const fadeOut = interpolate(f, [durationInFrames - fps, durationInFrames], [musicVolume, 0], { extrapolateLeft: "clamp" });
					return Math.min(fadeIn, fadeOut);
				}}
			/>

			{/* Voiceover tracks */}
			{VOICEOVER_TRACKS.map((track, i) => (
				<Sequence key={track.id} name={`VO: ${track.label}`} from={0}>
					<Audio src={staticFile(track.file)} volume={voVolumes[i]} />
				</Sequence>
			))}

			{/* LAYER 1: Computer frame with zoom */}
			<AbsoluteFill style={{ opacity: frameOpacity }}>
				<div
					style={{
						width: "100%",
						height: "100%",
						transform: `scale(${currentScale})`,
						transformOrigin: `${screenCenterX}px ${screenCenterY}px`,
					}}
				>
					<MidjourneyComputerFrame wordmarkText="TALKIE" powerOnEffect={false}>
						<Img
							src={staticFile(screenshotFile)}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
						/>
					</MidjourneyComputerFrame>
				</div>
			</AbsoluteFill>

			{/* LAYER 2: Full-screen content (screenshot/video) */}
			<AbsoluteFill style={{ opacity: contentOpacity }}>
				<Img
					src={staticFile(screenshotFile)}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "contain",
						backgroundColor: "#0a0a0c",
					}}
				/>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
