import {
	useVideoConfig,
	Sequence,
	AbsoluteFill,
	Audio,
	staticFile,
	interpolate,
	OffthreadVideo,
} from "remotion";
import { HUDExperimentIntro } from "./intros/HUDExperimentIntro";
import { Outro } from "./intros/Outro";
import { TacticalCaptionBar } from "./components/TacticalCaptionBar";
import { TacticalVideoBezel } from "./components/TacticalVideoBezel";

export interface HUDExperimentVideoProps {
	videoSrc?: string;
	title?: string;
	subtitle?: string;
	outroTitle?: string;
	outroTagline?: string;
	introDuration?: number;
	outroDuration?: number;
	musicTrack?: string;
	musicVolume?: number;
	musicFadeOutStart?: number; // seconds into content when music fades out
	videoVolume?: number; // volume of original video audio
	// Captions
	showCaptions?: boolean;
	transcriptFile?: string;
	captionBarHeight?: number;
	// Bezel
	showBezel?: boolean;
	bezelSize?: number;
}

export const HUDExperimentVideo: React.FC<HUDExperimentVideoProps> = ({
	videoSrc = "demos/hud-long.mp4",
	title = "HUD EXPERIMENT",
	subtitle = "Prototype v0.1",
	outroTitle = "EXPERIMENT",
	outroTagline = "Work in Progress",
	introDuration = 5,
	outroDuration = 5,
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.35,
	musicFadeOutStart = 1, // fade out music 1 second into video content
	videoVolume = 0.5, // lower the original video audio
	showCaptions = false,
	transcriptFile,
	captionBarHeight = 120,
	showBezel = false,
	bezelSize = 12,
}) => {
	const { fps, durationInFrames, height } = useVideoConfig();

	// Calculate video area height when captions are enabled
	const videoHeight = showCaptions ? height - captionBarHeight : height;

	const introFrames = Math.floor(introDuration * fps);
	const outroFrames = Math.floor(outroDuration * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;
	const contentStart = introFrames;
	const outroStart = introFrames + contentFrames;

	// Music fades out early in the content
	const musicFadeOutFrame = introFrames + Math.floor(musicFadeOutStart * fps);
	const musicEndFrame = musicFadeOutFrame + Math.floor(1.5 * fps); // 1.5s fade

	return (
		<AbsoluteFill style={{ backgroundColor: "#08080c" }}>
			{/* Layer 1: Background Music - fades out early */}
			<Sequence name="Music" from={0} durationInFrames={musicEndFrame}>
				<Audio
					src={staticFile(musicTrack)}
					volume={(f) => {
						const fadeInEnd = 0.8 * fps;
						if (f < fadeInEnd) {
							return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
						}
						if (f > musicFadeOutFrame) {
							return interpolate(
								f,
								[musicFadeOutFrame, musicEndFrame],
								[musicVolume, 0],
								{ extrapolateRight: "clamp" }
							);
						}
						return musicVolume;
					}}
				/>
			</Sequence>

			{/* Layer 2: Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<HUDExperimentIntro title={title} subtitle={subtitle} />
			</Sequence>

			{/* Layer 3: Main Content - NOT muted, original audio plays */}
			<Sequence name="Content" from={contentStart} durationInFrames={contentFrames}>
				<AbsoluteFill
					style={{
						flexDirection: "column",
						display: "flex",
					}}
				>
					{/* Video area */}
					<div style={{ height: videoHeight, position: "relative" }}>
						{showBezel ? (
							<TacticalVideoBezel
								bezelSize={bezelSize}
								title={title}
								statusText="LIVE"
							>
								<OffthreadVideo
									src={staticFile(videoSrc)}
									style={{
										maxWidth: "100%",
										maxHeight: "100%",
										objectFit: "contain",
									}}
									volume={(f) => {
										const videoFadeIn = Math.floor(musicFadeOutStart * fps);
										const videoFadeEnd = videoFadeIn + Math.floor(1.5 * fps);
										if (f < videoFadeIn) return 0;
										if (f < videoFadeEnd) {
											return interpolate(f, [videoFadeIn, videoFadeEnd], [0, videoVolume]);
										}
										return videoVolume;
									}}
								/>
							</TacticalVideoBezel>
						) : (
							<OffthreadVideo
								src={staticFile(videoSrc)}
								style={{
									width: "100%",
									height: "100%",
									objectFit: "cover",
								}}
								volume={(f) => {
									const videoFadeIn = Math.floor(musicFadeOutStart * fps);
									const videoFadeEnd = videoFadeIn + Math.floor(1.5 * fps);
									if (f < videoFadeIn) return 0;
									if (f < videoFadeEnd) {
										return interpolate(f, [videoFadeIn, videoFadeEnd], [0, videoVolume]);
									}
									return videoVolume;
								}}
							/>
						)}
					</div>
					{/* Caption bar */}
					{showCaptions && transcriptFile && (
						<TacticalCaptionBar
							transcriptFile={transcriptFile}
							height={captionBarHeight}
							enabled={showCaptions}
						/>
					)}
				</AbsoluteFill>
			</Sequence>

			{/* Layer 4: Outro - follow me style */}
			<Sequence name="Outro" from={outroStart} durationInFrames={outroFrames}>
				<Outro handle="@arach" />
				{/* Click sound at outro start */}
				<Audio src={staticFile("sfx/tap.wav")} volume={0.5} />
				{/* Music fades back in for outro */}
				<Audio
					src={staticFile(musicTrack)}
					volume={(f) => {
						const fadeInEnd = 1 * fps;
						const fadeOutStart = outroFrames - 1 * fps;
						if (f < fadeInEnd) {
							return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
						}
						if (f > fadeOutStart) {
							return interpolate(f, [fadeOutStart, outroFrames], [musicVolume, 0]);
						}
						return musicVolume;
					}}
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

export function calculateHUDFrames(
	contentDurationSec: number,
	fps: number,
	introDuration = 2,
	outroDuration = 3
): number {
	return Math.floor((introDuration + contentDurationSec + outroDuration) * fps);
}
