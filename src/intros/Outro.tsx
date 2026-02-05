import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/SourceCodePro";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400"],
  subsets: ["latin"],
});

type OutroProps = {
  handle?: string;
};

export const Outro: React.FC<OutroProps> = ({ handle = "@arach" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const mainColor = "#ffffff";

  // Fade in
  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Shimmer position for handle
  const shimmerPos = interpolate(frame, [0.3 * fps, 2 * fps], [-5, handle.length + 5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Status bar appears
  const statusOpacity = interpolate(frame, [0.3 * fps, 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "FINISHED" typing effect
  const finishedText = "FINISHED";
  const typedChars = Math.floor(
    interpolate(frame, [0.5 * fps, 1.2 * fps], [0, finishedText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const displayFinished = finishedText.slice(0, typedChars);

  // Fade out at the end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 0.5 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const finalOpacity = opacity * fadeOut;

  // CRT flicker
  const flicker = 0.98 + Math.random() * 0.02;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0a0a0b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        position: "relative",
        opacity: finalOpacity * flicker,
      }}
    >
      {/* CRT scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          )`,
          pointerEvents: "none",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle, transparent 50%, rgba(0,0,0,0.5) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Handle with shimmer */}
      <div style={{ display: "flex", fontSize: 72, fontWeight: 300 }}>
        {handle.split("").map((char, i) => {
          const distanceFromShimmer = Math.abs(i - shimmerPos);
          const shimmerIntensity = Math.max(0, 1 - distanceFromShimmer / 3);
          const brightness = 1 + shimmerIntensity * 0.4;
          const glow = shimmerIntensity * 12;

          return (
            <span
              key={i}
              style={{
                color: mainColor,
                filter: `brightness(${brightness})`,
                textShadow: glow > 0 ? `0 0 ${glow}px rgba(255, 255, 255, ${shimmerIntensity * 0.6})` : "none",
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 20,
          fontSize: 18,
          color: mainColor,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          opacity: statusOpacity,
          textShadow: "0 0 10px rgba(255, 255, 255, 0.4)",
        }}
      >
        follow for more
      </div>

      {/* Bottom status bar - matching intro style */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: statusOpacity,
          color: mainColor,
          fontSize: 12,
          letterSpacing: "0.1em",
          textShadow: "0 0 8px rgba(255, 255, 255, 0.3)",
        }}
      >
        <span>SESSION COMPLETE</span>
        <span style={{ fontFamily: "monospace" }}>████████████████ 100%</span>
        <span>{displayFinished}</span>
      </div>
    </div>
  );
};
