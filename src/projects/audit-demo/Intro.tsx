import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/SourceCodePro";
import { config } from "./config";

const { fontFamily } = loadFont("normal", {
  weights: ["300"],
  subsets: ["latin"],
});

// ASCII art - customize these for different projects
const ARACH_ART = [
  "\u00A0█████╗ ██████╗  █████╗  ██████╗██╗  ██╗",
  "██╔══██╗██╔══██╗██╔══██╗██╔════╝██║  ██║",
  "███████║██████╔╝███████║██║     ███████║",
  "██╔══██║██╔══██╗██╔══██║██║     ██╔══██║",
  "██║  ██║██║  ██║██║  ██║╚██████╗██║  ██║",
  "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝",
];

const DOT_ART = [
  "   ",
  "   ",
  "   ",
  "   ",
  "██╗",
  "╚═╝",
];

const DEV_ART = [
  "██████╗ ███████╗██╗   ██╗",
  "██╔══██╗██╔════╝██║   ██║",
  "██║  ██║█████╗  ██║   ██║",
  "██║  ██║██╔══╝  ╚██╗ ██╔╝",
  "██████╔╝███████╗ ╚████╔╝\u00A0",
  "╚═════╝ ╚══════╝  ╚═══╝\u00A0",
];

const DOT_MARGIN_LEFT = 6;
const DOT_MARGIN_RIGHT = 4;

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainColor = config.colors.primary;
  const { tagline, loadingText } = config.intro;

  // ASCII art fade in
  const asciiOpacity = interpolate(frame, [0, 0.3 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const asciiScale = interpolate(frame, [0, 0.3 * fps], [0.95, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline fade in
  const taglineOpacity = interpolate(frame, [0.5 * fps, 0.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom status bar appears early
  const statusBarOpacity = interpolate(frame, [0.3 * fps, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Progress bar animation
  const progressStart = 0.5 * fps;
  const progressEnd = 2 * fps;
  const progress = interpolate(frame, [progressStart, progressEnd], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const filledBlocks = Math.floor((progress / 100) * 16);
  const progressBar = "█".repeat(filledBlocks) + "░".repeat(16 - filledBlocks);

  // "READY" appears after progress hits 100
  const readyOpacity = interpolate(frame, [progressEnd, progressEnd + 0.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shimmer position
  const shimmerPos = interpolate(frame, [0.2 * fps, 2.5 * fps], [-15, 85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CRT flicker
  const flicker = 0.98 + Math.random() * 0.02;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: config.colors.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "SF Mono, Monaco, Consolas, monospace",
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

      {/* ASCII Art with shimmer */}
      <div
        style={{
          opacity: asciiOpacity * flicker,
          transform: `scale(${asciiScale})`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {ARACH_ART.map((_, lineIndex) => {
          const arachLine = ARACH_ART[lineIndex];
          const dotLine = DOT_ART[lineIndex];
          const devLine = DEV_ART[lineIndex];

          const renderChars = (text: string, startOffset: number) => {
            return text.split('').map((char, i) => {
              const charIndex = startOffset + i;
              const distanceFromShimmer = Math.abs(charIndex - shimmerPos);
              const shimmerIntensity = Math.max(0, 1 - distanceFromShimmer / 12);
              const brightness = 1 + shimmerIntensity * 0.25;
              const glow = shimmerIntensity * 6;

              return (
                <span
                  key={charIndex}
                  style={{
                    color: mainColor,
                    filter: `brightness(${brightness})`,
                    textShadow: glow > 0 ? `0 0 ${glow}px rgba(255, 255, 255, ${shimmerIntensity * 0.8})` : 'none',
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              );
            });
          };

          return (
            <div
              key={lineIndex}
              style={{
                display: "flex",
                fontSize: 18,
                lineHeight: 1.1,
                fontFamily,
                fontWeight: 300,
              }}
            >
              <span>{renderChars(arachLine, 0)}</span>
              <span style={{ marginLeft: DOT_MARGIN_LEFT, marginRight: DOT_MARGIN_RIGHT }}>
                {renderChars(dotLine, arachLine.length)}
              </span>
              <span>{renderChars(devLine, arachLine.length + dotLine.length)}</span>
            </div>
          );
        })}
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 40,
          opacity: taglineOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: mainColor,
            fontSize: 18,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            textShadow: `0 0 10px rgba(255, 255, 255, 0.4)`,
          }}
        >
          {tagline}
        </div>
      </div>

      {/* Bottom status bar */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: statusBarOpacity,
          color: mainColor,
          fontSize: 12,
          letterSpacing: "0.1em",
          textShadow: `0 0 8px rgba(255, 255, 255, 0.3)`,
        }}
      >
        <span>{loadingText}</span>
        <span style={{ fontFamily: "monospace" }}>
          {progressBar} {Math.floor(progress)}%
        </span>
        <span style={{ opacity: readyOpacity }}>READY</span>
      </div>
    </div>
  );
};
