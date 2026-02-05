import { staticFile, useVideoConfig, useCurrentFrame, interpolate, Sequence, Img, Audio } from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/InstrumentSerif";
import { GlitchIntro } from "./GlitchIntro";
import { config, INTRO_FRAMES, TRANSITION_FRAMES } from "./config";

const { fontFamily: instrumentSerif } = loadFont();

export const AuditDemo: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const videoStart = INTRO_FRAMES - TRANSITION_FRAMES;

  // Intro fades out during transition
  const introOpacity = interpolate(
    frame,
    [INTRO_FRAMES - TRANSITION_FRAMES, INTRO_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Video fades in during transition
  const videoOpacity = interpolate(
    frame,
    [videoStart, videoStart + TRANSITION_FRAMES],
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
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background music - beat drop (10s) aligned with transition (~2.3s) */}
      <Audio
        src={staticFile("kugelsicher-by-tremoxbeatz-302838.mp3")}
        volume={0.4}
        startFrom={230} // skip to ~7.7s so beat drops at transition (frame 70)
      />
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

      {/* Intro */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <div style={{ position: "absolute", inset: 0, opacity: introOpacity }}>
          <GlitchIntro />
        </div>
      </Sequence>

      {/* Main video */}
      <Sequence from={videoStart} durationInFrames={durationInFrames - videoStart}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: videoOpacity,
          }}
        >
          {/* Video + signature container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              transform: `scale(${config.videoScale * videoScaleAnim})`,
            }}
          >
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: `
                  0 0 0 1px rgba(255,255,255,0.1),
                  0 25px 50px -12px rgba(0,0,0,0.8),
                  0 0 100px ${config.colors.accent}
                `,
              }}
            >
              <Video
                src={staticFile(config.videoFile)}
                style={{
                  display: "block",
                }}
              />
            </div>

            {/* Prepared by @arach for HostAI - one liner */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: instrumentSerif,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Prepared by
              </span>
              <span
                style={{
                  fontFamily: instrumentSerif,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "#ffffff",
                  filter: "drop-shadow(0 0 6px rgba(255,255,255,0.4))",
                }}
              >
                @arach
              </span>
              <span
                style={{
                  fontFamily: instrumentSerif,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                for
              </span>
              <Img
                src={staticFile("hostai-logo-light.svg")}
                style={{
                  width: 65,
                  height: "auto",
                  opacity: 1,
                  filter: "drop-shadow(0 0 12px rgba(255,255,255,0.5)) drop-shadow(0 0 4px rgba(255,255,255,0.3))",
                  position: "relative",
                  top: 1,
                }}
              />
            </div>
          </div>
        </div>
      </Sequence>
    </div>
  );
};
