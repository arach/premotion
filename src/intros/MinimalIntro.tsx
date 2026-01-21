import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, spring } from "remotion";

// Clean minimal intro with elegant fade
export const MinimalIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation with spring
  const logoProgress = spring({
    frame: frame - 0.3 * fps,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);

  // Text fade in
  const textOpacity = interpolate(frame, [1.2 * fps, 1.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textY = interpolate(frame, [1.2 * fps, 1.8 * fps], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle background gradient pulse
  const gradientOpacity = interpolate(
    Math.sin(frame / 30),
    [-1, 1],
    [0.02, 0.05]
  );

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#0a0a0b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Subtle radial gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(0, 180, 216, ${gradientOpacity}) 0%, transparent 70%)`,
        }}
      />

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
            width: 180,
            height: 180,
          }}
        />
      </div>

      {/* Name */}
      <div
        style={{
          marginTop: 50,
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#ffffff",
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: "0.15em",
          }}
        >
          arach
        </div>
        <div
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 18,
            letterSpacing: "0.3em",
            marginTop: 15,
            textTransform: "uppercase",
          }}
        >
          presents
        </div>
      </div>
    </div>
  );
};
