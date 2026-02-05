import { staticFile, useVideoConfig, useCurrentFrame, interpolate, Sequence, Audio } from "remotion";
import { Video } from "@remotion/media";

type QuickPreviewProps = {
  videoFile: string;
  title?: string;
  handle?: string;
  showIntro?: boolean;
  introDuration?: number; // in frames
};

export const QuickPreview: React.FC<QuickPreviewProps> = ({
  videoFile,
  title,
  handle = "@arach",
  showIntro = true,
  introDuration = 45, // 1.5 seconds at 30fps
}) => {
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const videoStart = showIntro ? introDuration : 0;

  return (
    <div style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Optional minimal intro */}
      {showIntro && (
        <Sequence from={0} durationInFrames={introDuration + 15}>
          <MinimalIntro title={title} handle={handle} introDuration={introDuration} />
        </Sequence>
      )}

      {/* Main video */}
      <Sequence from={videoStart} durationInFrames={durationInFrames - videoStart}>
        <VideoWithFadeIn videoFile={videoFile} fadeFrames={15} />
      </Sequence>
    </div>
  );
};

const MinimalIntro: React.FC<{
  title?: string;
  handle: string;
  introDuration: number;
}> = ({ title, handle, introDuration }) => {
  const frame = useCurrentFrame();

  // Fade in
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [introDuration - 15, introDuration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        opacity: opacity * fadeOut,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: "SF Pro Display, -apple-system, sans-serif",
            fontSize: 48,
            fontWeight: 600,
            color: "#fff",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          fontFamily: "SF Mono, Menlo, monospace",
          fontSize: 24,
          color: "#666",
        }}
      >
        {handle}
      </div>
    </div>
  );
};

const VideoWithFadeIn: React.FC<{
  videoFile: string;
  fadeFrames: number;
}> = ({ videoFile, fadeFrames }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width: "100%", height: "100%", opacity }}>
      <Video
        src={staticFile(videoFile)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};
