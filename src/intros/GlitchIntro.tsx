import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, random } from "remotion";

// Cyberpunk glitch-style intro
export const GlitchIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glitch effect - random offset every few frames
  const glitchActive = frame > 0.5 * fps && frame < 2 * fps;
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
  const logoScale = interpolate(frame, [0.3 * fps, 0.8 * fps], [1.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Text reveal
  const textOpacity = interpolate(frame, [1.5 * fps, 2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Flicker effect
  const flicker = random(`flicker-${Math.floor(frame / 2)}`) > 0.1 ? 1 : 0.7;

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0a0014",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
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

      {/* Main content */}
      <div
        style={{
          opacity: contentOpacity * flicker,
          transform: `translate(${glitchOffsetX}px, ${glitchOffsetY}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo with RGB split */}
        <div style={{ position: "relative", transform: `scale(${logoScale})` }}>
          {/* Red channel */}
          <Img
            src={staticFile("arach-circle.png")}
            style={{
              width: 200,
              height: 200,
              position: "absolute",
              top: 0,
              left: -rgbSplit,
              opacity: 0.5,
              filter: "grayscale(1) brightness(2)",
              mixBlendMode: "multiply",
            }}
          />
          {/* Main image */}
          <Img
            src={staticFile("arach-circle.png")}
            style={{
              width: 200,
              height: 200,
              filter: `hue-rotate(${frame}deg)`,
            }}
          />
          {/* Cyan channel */}
          <Img
            src={staticFile("arach-circle.png")}
            style={{
              width: 200,
              height: 200,
              position: "absolute",
              top: 0,
              left: rgbSplit,
              opacity: 0.5,
              filter: "grayscale(1) brightness(2)",
              mixBlendMode: "screen",
            }}
          />
        </div>

        {/* Text */}
        <div
          style={{
            marginTop: 50,
            opacity: textOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#e0f2fe",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textShadow: `
                ${rgbSplit}px 0 #f472b6,
                -${rgbSplit}px 0 #00ffd1
              `,
            }}
          >
            ARACH
          </div>
          <div
            style={{
              fontFamily: "monospace",
              color: "#f472b6",
              fontSize: 20,
              letterSpacing: "0.3em",
              marginTop: 10,
            }}
          >
            // DEMO
          </div>
        </div>
      </div>
    </div>
  );
};
