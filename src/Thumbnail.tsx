import { staticFile, Img } from "remotion";

type ThumbnailProps = {
  title?: string;
  subtitle?: string;
  style?: "terminal" | "minimal" | "cyberpunk";
};

// Thumbnail component for video previews
export const Thumbnail: React.FC<ThumbnailProps> = ({
  title = "DEMO",
  subtitle = "by arach",
  style = "terminal",
}) => {
  if (style === "minimal") {
    return <MinimalThumbnail title={title} subtitle={subtitle} />;
  }
  if (style === "cyberpunk") {
    return <CyberpunkThumbnail title={title} subtitle={subtitle} />;
  }
  return <TerminalThumbnail title={title} subtitle={subtitle} />;
};

const TerminalThumbnail: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
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
    }}
  >
    {/* Grid overlay */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 180, 216, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 180, 216, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    />

    {/* Corner decorations */}
    <div style={{ position: "absolute", top: 30, left: 30, color: "#00b4d8", fontSize: 20 }}>┌─</div>
    <div style={{ position: "absolute", top: 30, right: 30, color: "#00b4d8", fontSize: 20 }}>─┐</div>
    <div style={{ position: "absolute", bottom: 30, left: 30, color: "#00b4d8", fontSize: 20 }}>└─</div>
    <div style={{ position: "absolute", bottom: 30, right: 30, color: "#00b4d8", fontSize: 20 }}>─┘</div>

    {/* Logo */}
    <Img
      src={staticFile("arach-circle.png")}
      style={{
        width: 120,
        height: 120,
        border: "2px solid #00b4d8",
        borderRadius: "50%",
        boxShadow: "0 0 30px rgba(0, 180, 216, 0.3)",
      }}
    />

    {/* Title */}
    <div
      style={{
        marginTop: 30,
        color: "#ffffff",
        fontSize: 48,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {title}
    </div>

    {/* Subtitle */}
    <div
      style={{
        marginTop: 10,
        color: "#00b4d8",
        fontSize: 18,
        letterSpacing: "0.2em",
      }}
    >
      {subtitle}
    </div>

    {/* Status indicator */}
    <div
      style={{
        position: "absolute",
        bottom: 30,
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "#00b4d8",
        fontSize: 14,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#22c55e",
          boxShadow: "0 0 10px #22c55e",
        }}
      />
      ONLINE
    </div>
  </div>
);

const MinimalThumbnail: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
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
    {/* Subtle gradient */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 50% 50%, rgba(0, 180, 216, 0.05) 0%, transparent 70%)",
      }}
    />

    <Img
      src={staticFile("arach-circle.png")}
      style={{ width: 100, height: 100 }}
    />

    <div
      style={{
        marginTop: 30,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#ffffff",
        fontSize: 42,
        fontWeight: 300,
        letterSpacing: "0.15em",
      }}
    >
      {title.toLowerCase()}
    </div>

    <div
      style={{
        marginTop: 10,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 16,
        letterSpacing: "0.3em",
        textTransform: "uppercase",
      }}
    >
      {subtitle}
    </div>
  </div>
);

const CyberpunkThumbnail: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
  <div
    style={{
      flex: 1,
      backgroundColor: "#0a0014",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    }}
  >
    {/* Neon glow background */}
    <div
      style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(244, 114, 182, 0.2) 0%, transparent 70%)",
        filter: "blur(60px)",
      }}
    />

    <Img
      src={staticFile("arach-circle.png")}
      style={{
        width: 130,
        height: 130,
        filter: "hue-rotate(30deg)",
      }}
    />

    <div
      style={{
        marginTop: 30,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#e0f2fe",
        fontSize: 52,
        fontWeight: 800,
        letterSpacing: "0.05em",
        textShadow: "3px 0 #f472b6, -3px 0 #00ffd1",
      }}
    >
      {title}
    </div>

    <div
      style={{
        marginTop: 10,
        fontFamily: "monospace",
        color: "#f472b6",
        fontSize: 18,
        letterSpacing: "0.2em",
      }}
    >
      // {subtitle}
    </div>
  </div>
);
