import { Composition, Still, Folder } from "remotion";
import { VideoMontage } from "./VideoMontage";
import { FullVideo } from "./FullVideo";
import { TerminalIntro } from "./intros/TerminalIntro";
import { MinimalIntro } from "./intros/MinimalIntro";
import { GlitchIntro } from "./intros/GlitchIntro";
import { AsciiIntro } from "./intros/AsciiIntro";
import { Thumbnail } from "./Thumbnail";

// Video settings
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// Timing
const INTRO_DURATION = 3 * FPS;  // 3 seconds
const TRANSITION_DURATION = 20;  // ~0.67 seconds

// Define your clips here - timestamps in seconds
export const CLIPS = [
  {
    start: 14,
    end: 100,
    zoom: {
      startAtOutput: 47,
      scale: 1.3,
      origin: { x: 25, y: 40 }
    }
  },
];

// Calculate durations
const calculateMainVideoFrames = () => {
  return CLIPS.reduce((total, clip) => {
    return total + (clip.end - clip.start) * FPS;
  }, 0);
};

const calculateFullVideoFrames = () => {
  const mainVideo = calculateMainVideoFrames();
  // Intro + main video - transition overlap
  return INTRO_DURATION + mainVideo - TRANSITION_DURATION;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* MAIN: Full Video with Intro */}
      <Composition
        id="FullVideo"
        component={FullVideo}
        durationInFrames={calculateFullVideoFrames()}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          clips: CLIPS,
          introDuration: INTRO_DURATION,
          transitionDuration: TRANSITION_DURATION,
        }}
      />

      {/* Video without intro (for testing) */}
      <Composition
        id="VideoMontage"
        component={VideoMontage}
        durationInFrames={calculateMainVideoFrames()}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          clips: CLIPS,
          transitionDuration: TRANSITION_DURATION,
        }}
      />

      {/* Intro Variants */}
      <Folder name="Intros">
        <Composition
          id="TerminalIntro"
          component={TerminalIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="MinimalIntro"
          component={MinimalIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="GlitchIntro"
          component={GlitchIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="AsciiIntro"
          component={AsciiIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>

      {/* Thumbnails */}
      <Folder name="Thumbnails">
        <Still
          id="ThumbnailTerminal"
          component={Thumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "DEMO",
            subtitle: "by arach",
            style: "terminal" as const,
          }}
        />
        <Still
          id="ThumbnailMinimal"
          component={Thumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "DEMO",
            subtitle: "by arach",
            style: "minimal" as const,
          }}
        />
        <Still
          id="ThumbnailCyberpunk"
          component={Thumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "DEMO",
            subtitle: "by arach",
            style: "cyberpunk" as const,
          }}
        />
      </Folder>
    </>
  );
};
