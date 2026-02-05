import { staticFile, useVideoConfig, useCurrentFrame, interpolate, Sequence, Img, Audio } from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/InstrumentSerif";
import { GlitchIntro } from "./GlitchIntro";
import {
  config,
  FPS,
  INTRO_FRAMES,
  TRANSITION_FRAMES,
  ACT1_FRAMES,
  ACT2_FRAMES,
  ACT3_FRAMES,
  ACT1_PLAYBACK_RATE,
  ACT2_PLAYBACK_RATE,
  ACT3_PLAYBACK_RATE,
} from "./config";

const { fontFamily: instrumentSerif } = loadFont();

export const HostAIMontage: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Timeline calculations
  const act1Start = INTRO_FRAMES - TRANSITION_FRAMES;
  const act1End = act1Start + ACT1_FRAMES;
  const act2Start = act1End - TRANSITION_FRAMES;
  const act2End = act2Start + ACT2_FRAMES;
  const act3Start = act2End - TRANSITION_FRAMES;

  // Intro fades out
  const introOpacity = interpolate(
    frame,
    [INTRO_FRAMES - TRANSITION_FRAMES, INTRO_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Act 1 fades in/out
  const act1FadeIn = interpolate(frame, [act1Start, act1Start + TRANSITION_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act1FadeOut = interpolate(frame, [act1End - TRANSITION_FRAMES, act1End], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act1Opacity = Math.min(act1FadeIn, act1FadeOut);

  // Act 2 fades in/out
  const act2FadeIn = interpolate(frame, [act2Start, act2Start + TRANSITION_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act2FadeOut = interpolate(frame, [act2End - TRANSITION_FRAMES, act2End], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act2Opacity = Math.min(act2FadeIn, act2FadeOut);

  // Act 3 fades in
  const act3Opacity = interpolate(frame, [act3Start, act3Start + TRANSITION_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scale animations
  const act1Scale = interpolate(frame - act1Start, [0, 20], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act2Scale = interpolate(frame - act2Start, [0, 20], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const act3Scale = interpolate(frame - act3Start, [0, 20], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Background music */}
      <Audio
        src={staticFile("kugelsicher-by-tremoxbeatz-302838.mp3")}
        volume={0.4}
        startFrom={230}
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

      {/* Grid pattern */}
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

      {/* Act 1: Video 1 - generating report */}
      <Sequence from={act1Start} durationInFrames={ACT1_FRAMES}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: act1Opacity }}>
          <VideoWithSignature
            videoFile={config.acts[0].file}
            scale={config.videoScale * act1Scale}
            playbackRate={ACT1_PLAYBACK_RATE}
            startFrom={config.acts[0].startTime * FPS}
          />
        </div>
      </Sequence>

      {/* Act 2: Video 2 part 1 - navigating data */}
      <Sequence from={act2Start} durationInFrames={ACT2_FRAMES}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: act2Opacity }}>
          <VideoWithSignature
            videoFile={config.acts[1].file}
            scale={config.videoScale * act2Scale}
            playbackRate={ACT2_PLAYBACK_RATE}
            startFrom={config.acts[1].startTime * FPS}
          />
        </div>
      </Sequence>

      {/* Act 3: Video 2 part 2 - the actual report */}
      <Sequence from={act3Start} durationInFrames={durationInFrames - act3Start}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: act3Opacity }}>
          <VideoWithSignature
            videoFile={config.acts[2].file}
            scale={config.videoScale * act3Scale}
            playbackRate={ACT3_PLAYBACK_RATE}
            startFrom={config.acts[2].startTime * FPS}
          />
        </div>
      </Sequence>
    </div>
  );
};

// Reusable video component with signature
const VideoWithSignature: React.FC<{
  videoFile: string;
  scale: number;
  playbackRate?: number;
  startFrom?: number;
}> = ({ videoFile, scale, playbackRate = 1, startFrom = 0 }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        transform: `scale(${scale})`,
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
          src={staticFile(videoFile)}
          playbackRate={playbackRate}
          trimBefore={startFrom}
          style={{ display: "block" }}
        />
      </div>

      {/* Signature */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: instrumentSerif, fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.5)" }}>
          Prepared by
        </span>
        <span style={{ fontFamily: instrumentSerif, fontSize: 13, fontStyle: "italic", color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(255,255,255,0.4))" }}>
          {config.signature.preparedBy}
        </span>
        <span style={{ fontFamily: instrumentSerif, fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.5)" }}>
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
  );
};
