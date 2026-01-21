import { useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AsciiIntro } from "./intros/AsciiIntro";
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
  transitionDuration: number;
};

export const FullVideo: React.FC<FullVideoProps> = ({
  clips,
  introDuration,
  transitionDuration,
}) => {
  const { fps } = useVideoConfig();

  // Calculate main video duration
  const mainVideoDuration = clips.reduce((total, clip) => {
    return total + (clip.end - clip.start) * fps;
  }, 0);

  return (
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
    </TransitionSeries>
  );
};
