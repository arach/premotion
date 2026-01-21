import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, Sequence } from "remotion";

// Tactical terminal-style intro with typing effect
export const TerminalIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing
  const typingStart = 0.3 * fps;
  const typingEnd = 1.5 * fps;
  const logoFadeStart = 1 * fps;
  const logoFadeEnd = 1.5 * fps;

  // Scanline effect
  const scanlineY = (frame * 3) % 1080;

  // Text typing effect
  const fullText = "> INITIALIZING SYSTEM...";
  const typedChars = Math.floor(
    interpolate(frame, [typingStart, typingEnd], [0, fullText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const displayText = fullText.slice(0, typedChars);

  // Cursor blink
  const cursorVisible = Math.floor(frame / (fps * 0.5)) % 2 === 0;

  // Logo fade in
  const logoOpacity = interpolate(frame, [logoFadeStart, logoFadeEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo scale
  const logoScale = interpolate(frame, [logoFadeStart, logoFadeEnd], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Status text fade
  const statusOpacity = interpolate(frame, [1.8 * fps, 2.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0a0a0b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "SF Mono, Monaco, Consolas, monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Scanline effect */}
      <div
        style={{
          position: "absolute",
          top: scanlineY,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: "rgba(0, 180, 216, 0.1)",
          pointerEvents: "none",
        }}
      />

      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 180, 216, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 180, 216, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          pointerEvents: "none",
        }}
      />

      {/* Terminal text */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 100,
          color: "#00b4d8",
          fontSize: 24,
          letterSpacing: "0.05em",
        }}
      >
        {displayText}
        {cursorVisible && <span style={{ opacity: 0.8 }}>▋</span>}
      </div>

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <Img
          src={staticFile("arach-circle.png")}
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "2px solid #00b4d8",
            boxShadow: "0 0 40px rgba(0, 180, 216, 0.3)",
          }}
        />
      </div>

      {/* Status text */}
      <div
        style={{
          marginTop: 40,
          opacity: statusOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          ARACH
        </div>
        <div
          style={{
            color: "#00b4d8",
            fontSize: 18,
            letterSpacing: "0.2em",
            marginTop: 10,
          }}
        >
          SYSTEMS ONLINE
        </div>
      </div>

      {/* Corner decorations */}
      <div style={{ position: "absolute", top: 40, left: 40, color: "#00b4d8", fontSize: 14, opacity: 0.5 }}>
        ┌──────────
      </div>
      <div style={{ position: "absolute", top: 40, right: 40, color: "#00b4d8", fontSize: 14, opacity: 0.5, textAlign: "right" }}>
        ──────────┐
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 40, color: "#00b4d8", fontSize: 14, opacity: 0.5 }}>
        └──────────
      </div>
      <div style={{ position: "absolute", bottom: 40, right: 40, color: "#00b4d8", fontSize: 14, opacity: 0.5, textAlign: "right" }}>
        ──────────┘
      </div>
    </div>
  );
};
