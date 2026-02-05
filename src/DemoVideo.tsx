import { staticFile, useVideoConfig, useCurrentFrame, interpolate, Sequence } from "remotion";
import { Video } from "@remotion/media";
import { AsciiIntro } from "./intros/AsciiIntro";

type DemoVideoProps = {
  videoFile: string;
  introDuration?: number; // in frames
  transitionDuration?: number; // overlap between intro and video
  videoScale?: number; // scale factor for the embedded video
};

export const DemoVideo: React.FC<DemoVideoProps> = ({
  videoFile,
  introDuration = 90, // 3 seconds at 30fps
  transitionDuration = 20,
  videoScale = 1.8, // scale up the video
}) => {
  const { durationInFrames, width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const videoStart = introDuration - transitionDuration;

  // Intro fades out during transition
  const introOpacity = interpolate(
    frame,
    [introDuration - transitionDuration, introDuration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Video fades in during transition
  const videoOpacity = interpolate(
    frame,
    [videoStart, videoStart + transitionDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtle scale animation on video entrance
  const videoScaleAnim = interpolate(
    frame - videoStart,
    [0, 30],
    [0.95, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{
      flex: 1,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(30, 30, 40, 1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(20, 25, 35, 0.8) 0%, transparent 40%),
            radial-gradient(ellipse at 20% 90%, rgba(25, 20, 35, 0.6) 0%, transparent 40%),
            linear-gradient(180deg, #0a0a0f 0%, #0f0f18 50%, #0a0a0f 100%)
          `,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.5,
        }}
      />

      {/* ASCII Intro */}
      <Sequence from={0} durationInFrames={introDuration}>
        <div style={{ position: "absolute", inset: 0, opacity: introOpacity }}>
          <AsciiIntro />
        </div>
      </Sequence>

      {/* Main video container */}
      <Sequence from={videoStart} durationInFrames={durationInFrames - videoStart}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: videoOpacity,
          }}
        >
          {/* Video with frame */}
          <div
            style={{
              transform: `scale(${videoScale * videoScaleAnim})`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.1),
                0 25px 50px -12px rgba(0,0,0,0.8),
                0 0 100px rgba(100,100,150,0.15)
              `,
            }}
          >
            <Video
              src={staticFile(videoFile)}
              style={{
                display: "block",
              }}
            />
          </div>
        </div>
      </Sequence>
    </div>
  );
};
