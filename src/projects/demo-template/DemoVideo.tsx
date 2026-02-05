import {
	useVideoConfig,
	Sequence,
	AbsoluteFill,
	Audio,
	staticFile,
	interpolate,
	OffthreadVideo,
} from "remotion";
import { TacticalIntro } from "./TacticalIntro";
import { TacticalOutro } from "./TacticalOutro";
import { RetroComputerFrame } from "../../components/RetroComputerFrame";
import { MidjourneyComputerFrame } from "../../components/MidjourneyComputerFrame";

export interface DemoVideoProps {
	// Content
	videoSrc?: string;
	title?: string;
	subtitle?: string;
	tagline?: string;
	releaseDate?: string;
	iconSrc?: string;
	// Timing (in seconds)
	introDuration?: number;
	outroDuration?: number;
	// Audio
	musicTrack?: string;
	musicVolume?: number;
	// Style
	frameStyle?: "none" | "retro" | "midjourney";
	retroMonitorColor?: string;
	retroBaseColor?: string;
}

// Reusable demo video template: Intro → Content → Outro
export const DemoVideo: React.FC<DemoVideoProps> = ({
	videoSrc = "demos/placeholder.mp4",
	title = "TALKIE",
	subtitle = "Voice Engine v4.0",
	tagline = "Coming Soon",
	releaseDate = "Q1 2026",
	iconSrc = "talkie-icon-1024.png",
	introDuration = 2,
	outroDuration = 5,
	musicTrack = "tracks/futuristic-synthwave.mp3",
	musicVolume = 0.4,
	frameStyle = "none",
	retroMonitorColor = "#e8e0d4",
	retroBaseColor = "#8b3a3a",
}) => {
	const { fps, durationInFrames } = useVideoConfig();

	const introFrames = Math.floor(introDuration * fps);
	const outroFrames = Math.floor(outroDuration * fps);
	const contentFrames = durationInFrames - introFrames - outroFrames;
	const contentStart = introFrames;
	const outroStart = introFrames + contentFrames;

	const sfxVolume = 0.35;

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
			{/* Layer 1: Background Music */}
			<Sequence name="Music" from={0} durationInFrames={durationInFrames}>
				<Audio
					src={staticFile(musicTrack)}
					volume={(f) => {
						const fadeInEnd = 1.0 * fps;
						const fadeOutStart = durationInFrames - 1.5 * fps;
						if (f < fadeInEnd) return interpolate(f, [0, fadeInEnd], [0, musicVolume]);
						if (f > fadeOutStart) return interpolate(f, [fadeOutStart, durationInFrames], [musicVolume, 0]);
						return musicVolume;
					}}
				/>
			</Sequence>

			{/* Layer 2: Sound Effects */}
			<Sequence name="SFX" from={0} durationInFrames={durationInFrames}>
				{/* Intro tap */}
				<Sequence from={0} durationInFrames={30}>
					<Audio src={staticFile("sfx/tap.wav")} volume={sfxVolume * 0.7} />
				</Sequence>

				{/* Outro cortex wave */}
				<Sequence from={outroStart + Math.floor(0.5 * fps)} durationInFrames={45}>
					<Audio src={staticFile("sfx/cortex_wave.wav")} volume={sfxVolume * 0.5} />
				</Sequence>
			</Sequence>

			{/* Layer 3: Intro */}
			<Sequence name="Intro" from={0} durationInFrames={introFrames}>
				<TacticalIntro
					title={title}
					subtitle={subtitle}
					iconSrc={iconSrc}
				/>
			</Sequence>

			{/* Layer 4: Main Content */}
			<Sequence name="Content" from={contentStart} durationInFrames={contentFrames}>
				{frameStyle === "retro" ? (
					<RetroComputerFrame
						monitorColor={retroMonitorColor}
						baseColor={retroBaseColor}
					>
						<OffthreadVideo
							src={staticFile(videoSrc)}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
						/>
					</RetroComputerFrame>
				) : frameStyle === "midjourney" ? (
					<MidjourneyComputerFrame>
						<OffthreadVideo
							src={staticFile(videoSrc)}
							style={{ width: "100%", height: "100%", objectFit: "cover" }}
						/>
					</MidjourneyComputerFrame>
				) : (
					<AbsoluteFill>
						<OffthreadVideo
							src={staticFile(videoSrc)}
							style={{ width: "100%", height: "100%" }}
						/>
					</AbsoluteFill>
				)}
			</Sequence>

			{/* Layer 5: Outro */}
			<Sequence name="Outro" from={outroStart} durationInFrames={outroFrames}>
				<TacticalOutro
					title={title}
					tagline={tagline}
					releaseDate={releaseDate}
					iconSrc={iconSrc}
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

// Calculate total frames for a demo video
export function calculateDemoFrames(
	contentDurationSec: number,
	fps: number,
	introDuration = 2,
	outroDuration = 5
): number {
	return Math.floor((introDuration + contentDurationSec + outroDuration) * fps);
}
