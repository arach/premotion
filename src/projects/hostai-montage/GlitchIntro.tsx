import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, random } from "remotion";
import { config } from "./config";

// Glitch intro with HostAI logo
export const GlitchIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glitch effect - random offset every few frames
  const glitchActive = frame > 0.3 * fps && frame < 2.2 * fps;
  const glitchFrame = Math.floor(frame / 3);
  const glitchOffsetX = glitchActive ? (random(`glitch-x-${glitchFrame}`) - 0.5) * 20 : 0;
  const glitchOffsetY = glitchActive ? (random(`glitch-y-${glitchFrame}`) - 0.5) * 10 : 0;

  // RGB split effect
  const rgbSplit = glitchActive ? 3 + random(`rgb-${glitchFrame}`) * 5 : 0;

  // Main content fade
  const contentOpacity = interpolate(frame, [0, 0.3 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Logo scale with bounce
  const logoScale = interpolate(frame, [0.2 * fps, 0.6 * fps], [1.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline reveal - earlier and part of the same motion
  const taglineOpacity = interpolate(frame, [0.4 * fps, 0.7 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Flicker effect
  const flicker = random(`flicker-${Math.floor(frame / 2)}`) > 0.1 ? 1 : 0.7;

  // Progress bar
  const progressStart = 0.6 * fps;
  const progressEnd = 2.2 * fps;
  const progress = interpolate(frame, [progressStart, progressEnd], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const filledBlocks = Math.floor((progress / 100) * 20);
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(20 - filledBlocks);

  const statusBarOpacity = interpolate(frame, [0.5 * fps, 0.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const readyOpacity = interpolate(frame, [progressEnd, progressEnd + 0.15 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0a0014",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      {/* Noise overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(244, 114, 182, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(244, 114, 182, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Horizontal glitch lines */}
      {glitchActive && (
        <>
          <div
            style={{
              position: "absolute",
              top: `${30 + random(`line1-${glitchFrame}`) * 40}%`,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: "#f472b6",
              opacity: 0.8,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: `${50 + random(`line2-${glitchFrame}`) * 30}%`,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "#00ffd1",
              opacity: 0.6,
            }}
          />
        </>
      )}

      {/* Main content - logo + tagline together */}
      <div
        style={{
          opacity: contentOpacity * flicker,
          transform: `translate(${glitchOffsetX}px, ${glitchOffsetY}px) scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo with RGB split */}
        <div style={{ position: "relative" }}>
          {/* Red channel offset */}
          <Img
            src={staticFile("hostai-logo-light.svg")}
            style={{
              width: 280,
              height: "auto",
              position: "absolute",
              top: 0,
              left: -rgbSplit,
              opacity: 0.5,
              filter: "brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)",
            }}
          />
          {/* Main logo */}
          <Img
            src={staticFile("hostai-logo-light.svg")}
            style={{
              width: 280,
              height: "auto",
            }}
          />
          {/* Cyan channel offset */}
          <Img
            src={staticFile("hostai-logo-light.svg")}
            style={{
              width: 280,
              height: "auto",
              position: "absolute",
              top: 0,
              left: rgbSplit,
              opacity: 0.5,
              filter: "brightness(2) sepia(1) hue-rotate(120deg) saturate(5)",
            }}
          />
        </div>

        {/* Tagline - part of the same glitchy block */}
        <div
          style={{
            marginTop: 20,
            opacity: taglineOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "SF Mono, Monaco, Consolas, monospace",
              color: "#f472b6",
              fontSize: 13,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              textShadow: `
                ${rgbSplit * 0.5}px 0 #f472b6,
                -${rgbSplit * 0.5}px 0 #00ffd1
              `,
            }}
          >
            {config.intro.tagline}
          </div>
        </div>
      </div>

      {/* Bottom status bar - centered progress only */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          opacity: statusBarOpacity,
          fontFamily: "SF Mono, Monaco, Consolas, monospace",
        }}
      >
        <span
          style={{
            color: "#e0f2fe",
            fontSize: 13,
            letterSpacing: "0.15em",
          }}
        >
          {progressBar}
        </span>
        <span
          style={{
            color: "#f472b6",
            fontSize: 11,
            letterSpacing: "0.2em",
            opacity: readyOpacity,
            textShadow: "0 0 10px rgba(244, 114, 182, 0.6)",
          }}
        >
          READY
        </span>
      </div>
    </div>
  );
};
