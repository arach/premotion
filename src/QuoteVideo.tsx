import { useCurrentFrame, useVideoConfig, interpolate, Audio, staticFile, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/SourceCodePro";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400"],
  subsets: ["latin"],
});

interface QuoteVideoProps {
  audioFile: string;
  handle?: string;
}

// The quote split into words with timing (frame numbers at 30fps)
// Audio duration: ~3.87s = ~116 frames. Adjust these to match your audio.
const WORDS = [
  { word: "why", start: 0, end: 9 },
  { word: "do", start: 9, end: 19 },
  { word: "you", start: 19, end: 28 },
  { word: "attack", start: 28, end: 38 },
  { word: "me,", start: 38, end: 47 },
  { word: "bro?", start: 47, end: 57 },
];

export const QuoteVideo: React.FC<QuoteVideoProps> = ({ audioFile, handle = "@badrobot" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Outro starts after the quote (around frame 120)
  const outroStart = 62;

  // Overall fade in
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Get current word index for highlighting
  const getCurrentWordIndex = () => {
    for (let i = WORDS.length - 1; i >= 0; i--) {
      if (frame >= WORDS[i].start) return i;
    }
    return -1;
  };

  const currentWordIndex = getCurrentWordIndex();

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        opacity: fadeIn,
      }}
    >
      {/* Audio */}
      {audioFile && <Audio src={staticFile(audioFile)} />}

      {/* Quote text */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px 24px",
          maxWidth: 900,
          lineHeight: 1.4,
        }}
      >
        {WORDS.map((item, index) => {
          const isActive = index <= currentWordIndex;
          const isCurrentWord = index === currentWordIndex;

          // Word highlight animation
          const wordOpacity = isActive ? 1 : 0.2;
          const wordScale = isCurrentWord
            ? interpolate(
                frame - item.start,
                [0, 5, 10],
                [1.1, 1.05, 1],
                { extrapolateRight: "clamp" }
              )
            : 1;

          return (
            <span
              key={index}
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 72,
                fontWeight: 600,
                color: isActive ? "#ffffff" : "#333333",
                opacity: wordOpacity,
                transform: `scale(${wordScale})`,
                transition: "color 0.1s",
                textShadow: isCurrentWord
                  ? "0 0 40px rgba(255, 255, 255, 0.3)"
                  : "none",
              }}
            >
              {item.word}
            </span>
          );
        })}
      </div>

      {/* Subtle accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          width: interpolate(frame, [0, 130], [0, 600], {
            extrapolateRight: "clamp",
          }),
          height: 2,
          backgroundColor: "#ffffff",
          opacity: 0.1,
        }}
      />

      {/* Outro overlay */}
      {frame >= outroStart && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#0a0a0a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily,
            opacity: interpolate(frame, [outroStart, outroStart + 15], [0, 1], {
              extrapolateRight: "clamp",
            }),
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

          {/* Handle with shimmer */}
          <div style={{ display: "flex", fontSize: 72, fontWeight: 300 }}>
            {handle.split("").map((char, i) => {
              const outroFrame = frame - outroStart;
              const shimmerPos = interpolate(outroFrame, [10, 60], [-5, handle.length + 5], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const distanceFromShimmer = Math.abs(i - shimmerPos);
              const shimmerIntensity = Math.max(0, 1 - distanceFromShimmer / 3);
              const brightness = 1 + shimmerIntensity * 0.4;
              const glow = shimmerIntensity * 12;

              return (
                <span
                  key={i}
                  style={{
                    color: "#ffffff",
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
              color: "#ffffff",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              opacity: interpolate(frame, [outroStart + 10, outroStart + 25], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              textShadow: "0 0 10px rgba(255, 255, 255, 0.4)",
            }}
          >
            follow for more
          </div>
        </div>
      )}
    </div>
  );
};
