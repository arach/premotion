import { staticFile, useVideoConfig, useCurrentFrame, interpolate, Sequence } from "remotion";
import { Video } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

type Clip = {
  start: number;
  end: number;
  zoom?: {
    startAtOutput: number;  // When to start zooming (output seconds)
    scale: number;          // How much to zoom (e.g., 1.3 = 130%)
    origin?: { x: number; y: number };  // Zoom focal point (% from left, % from top)
  };
};

type VideoMontageProps = {
  clips: Clip[];
  transitionDuration: number;
};

// Cycle through different transition types for variety
const getTransition = (index: number) => {
  const transitions = [
    fade(),
    slide({ direction: "from-right" }),
    fade(),
    slide({ direction: "from-bottom" }),
  ];
  return transitions[index % transitions.length];
};

export const VideoMontage: React.FC<VideoMontageProps> = ({
  clips,
  transitionDuration,
}) => {
  const { fps } = useVideoConfig();

  // Build alternating sequence of clips and transitions
  const elements: React.ReactNode[] = [];

  clips.forEach((clip, index) => {
    const clipDurationFrames = (clip.end - clip.start) * fps;

    elements.push(
      <TransitionSeries.Sequence key={`clip-${index}`} durationInFrames={clipDurationFrames}>
        <VideoClip
          startSeconds={clip.start}
          endSeconds={clip.end}
          zoom={clip.zoom}
        />
      </TransitionSeries.Sequence>
    );

    // Add transition after each clip except the last
    if (index < clips.length - 1) {
      elements.push(
        <TransitionSeries.Transition
          key={`transition-${index}`}
          presentation={getTransition(index)}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />
      );
    }
  });

  return <TransitionSeries>{elements}</TransitionSeries>;
};

type VideoClipProps = {
  startSeconds: number;
  endSeconds: number;
  zoom?: {
    startAtOutput: number;
    scale: number;
    origin?: { x: number; y: number };
  };
};

const VideoClip: React.FC<VideoClipProps> = ({ startSeconds, endSeconds, zoom }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const clipDuration = (endSeconds - startSeconds) * fps;

  // Calculate zoom scale
  let scale = 1;
  if (zoom) {
    const zoomStartFrame = zoom.startAtOutput * fps;
    const zoomEndFrame = clipDuration;

    scale = interpolate(
      frame,
      [zoomStartFrame, zoomEndFrame],
      [1, zoom.scale],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  const originX = zoom?.origin?.x ?? 50;
  const originY = zoom?.origin?.y ?? 50;

  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflow: "hidden",
    }}>
      <Video
        src={staticFile("source-video.mp4")}
        trimBefore={startSeconds * fps}
        trimAfter={endSeconds * fps}
        volume={1}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: `${originX}% ${originY}%`,
        }}
      />
    </div>
  );
};
