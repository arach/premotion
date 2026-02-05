import { useVideoConfig, staticFile, interpolate, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Audio } from "@remotion/media";
import { AsciiIntro } from "./intros/AsciiIntro";
import { Outro } from "./intros/Outro";
import { VideoMontage } from "./VideoMontage";

type FullVideoProps = {
  clips: Array<{
    start: number;
    end: number;
    zoom?: {
      startAtOutput: number;
      scale: number;
      origin?: { x: number; y: number };
    };
  }>;
  introDuration: number;
  outroDuration: number;
  transitionDuration: number;
  handle?: string;
};

export const FullVideo: React.FC<FullVideoProps> = ({
  clips,
  introDuration,
  outroDuration,
  transitionDuration,
  handle = "@arachh",
}) => {
  const { fps } = useVideoConfig();

  // Calculate main video duration
  const mainVideoDuration = clips.reduce((total, clip) => {
    return total + (clip.end - clip.start) * fps;
  }, 0);

  // Total duration for audio fade calculations
  const totalDuration = introDuration + mainVideoDuration + outroDuration - (2 * transitionDuration);

  return (
    <>
      {/* Background Music */}
      <Audio
        src={staticFile("kugelsicher-by-tremoxbeatz-302838.mp3")}
        // Skip first 15 seconds of song to get past the buildup
        startFrom={15 * fps}
        volume={(f) => {
          // Fade out at the very end
          const fadeOut = interpolate(
            f,
            [totalDuration - 2 * fps, totalDuration],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Volume curve:
          // - Full volume during intro (0-3s)
          // - Gradual 3 second fade down after intro (3-6s)
          // - Very low during talking (6-55s)
          // - Gradual 3 second ramp back up (55-58s)
          const talkingStart = 3 * fps;   // Start fading as intro ends
          const talkingEnd = 55 * fps;    // Ramp up at 55 seconds
          const fadeTime = 3 * fps;       // 3 second transitions

          const baseVolume = interpolate(
            f,
            [0, talkingStart, talkingStart + fadeTime, talkingEnd, talkingEnd + fadeTime],
            [0.5, 0.5, 0.02, 0.02, 0.5],  // 50% intro, 2% during talking (barely there), back to 50%
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return fadeOut * baseVolume;
        }}
      />

      <TransitionSeries>
      {/* ASCII Intro */}
      <TransitionSeries.Sequence durationInFrames={introDuration}>
        <AsciiIntro />
      </TransitionSeries.Sequence>

      {/* Transition from intro to main video */}
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Main Video Content */}
      <TransitionSeries.Sequence durationInFrames={mainVideoDuration}>
        <VideoMontage clips={clips} transitionDuration={transitionDuration} />
      </TransitionSeries.Sequence>

      {/* Transition from main video to outro */}
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: transitionDuration })}
      />

      {/* Outro */}
      <TransitionSeries.Sequence durationInFrames={outroDuration}>
        <Outro handle={handle} />
      </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
