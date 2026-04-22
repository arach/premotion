// Auto-generated composition for lattices-snap-zones
// Highlight reel showcasing the snap zone functionality in Lattices. Features two key segments from the source footage: the initial snap zone demo (4-20s) and a secondary demonstration (30-40s). Tactical intro establishes the product identity, with subtle zoom effects drawing attention to the snap zone actions panel during key moments. Clean monospace captions reinforce the technical aesthetic.
// Generated: 2026-04-22T00:16:30.297Z

import {
  AbsoluteFill,
  Sequence,
  Audio,
  OffthreadVideo,
  staticFile,
  interpolate,
  useVideoConfig,
  useCurrentFrame,
} from "remotion";
import { TacticalIntro } from "../../src/projects/demo-template/TacticalIntro";
import { TacticalOutro } from "../../src/projects/demo-template/TacticalOutro";

// ── Plan constants ──────────────────────────────────────────────

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION_SEC = 30;
const DURATION_FRAMES = Math.round(DURATION_SEC * FPS);
const INTRO_FRAMES = Math.round(2 * FPS);
const OUTRO_FRAMES = Math.round(2 * FPS);
const TRANSITION_FRAMES = 0;

const CLIPS = [
  {
    src: "demos/lattices-snap-zones-2026-04-19.mp4",
    startFrom: 4,
    duration: 16,
    label: "Snap Zone Demo - Initial",
    videoVolume: 1,
    zoom: { scale: 1.2, originX: 0.7, originY: 0.3, startAtSec: 2 },
  },
  {
    src: "demos/lattices-snap-zones-2026-04-19.mp4",
    startFrom: 30,
    duration: 10,
    label: "Snap Zone Demo - Secondary",
    videoVolume: 1,

  }
];

const AUDIO_TRACKS = [

];

const TEXT_OVERLAYS = [
  {
    text: "LATTICES SNAP ZONES",
    startAt: 0,
    duration: 2,
    position: "center",
    style: "title",
  },
  {
    text: "Window management, reimagined",
    startAt: 0.5,
    duration: 1.5,
    position: "center",
    style: "subtitle",
  },
  {
    text: "Snap Zone Activated",
    startAt: 4,
    duration: 3,
    position: "bottom-center",
    style: "caption",
  },
  {
    text: "Tiling Active",
    startAt: 9,
    duration: 3,
    position: "bottom-center",
    style: "caption",
  },
  {
    text: "Zone Boundary Set",
    startAt: 32,
    duration: 3,
    position: "bottom-center",
    style: "caption",
  }
];

// ── Clip component ──────────────────────────────────────────────

const ClipSegment: React.FC<{
  clip: typeof CLIPS[number];
  clipDurationFrames: number;
}> = ({ clip, clipDurationFrames }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const fadeIn = TRANSITION_FRAMES > 0
    ? interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const fadeOut = TRANSITION_FRAMES > 0
    ? interpolate(frame, [clipDurationFrames - TRANSITION_FRAMES, clipDurationFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const opacity = fadeIn * fadeOut;

  // Zoom
  let scale = 1;
  let originX = 50;
  let originY = 50;
  if (clip.zoom) {
    const zoomStartFrame = clip.zoom.startAtSec * fps;
    scale = interpolate(
      frame,
      [zoomStartFrame, clipDurationFrames],
      [1, clip.zoom.scale],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    originX = clip.zoom.originX;
    originY = clip.zoom.originY;
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(clip.src)}
        startFrom={Math.round(clip.startFrom * fps)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: `${originX}% ${originY}%`,
        }}
        volume={clip.videoVolume}
      />
      {clip.label && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 48,
            fontFamily: "SF Mono, Monaco, Consolas, monospace",
            color: "#e0e0e8",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.12em",
            opacity: interpolate(frame, [0.3 * fps, 0.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {clip.label}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── Text overlay component ──────────────────────────────────────

const TextOverlay: React.FC<{
  overlay: typeof TEXT_OVERLAYS[number];
}> = ({ overlay }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const totalFrames = overlay.duration * fps;
  const fadeOut = interpolate(frame, [totalFrames - 0.4 * fps, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const positionStyles: Record<string, React.CSSProperties> = {
    "center": { display: "flex", alignItems: "center", justifyContent: "center" },
    "bottom-left": { display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: 48 },
    "bottom-center": { display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 48 },
    "top-left": { display: "flex", alignItems: "flex-start", justifyContent: "flex-start", padding: 48 },
    "top-center": { display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48 },
  };

  const fontSizes: Record<string, number> = {
    title: 48, subtitle: 28, caption: 18, label: 14,
  };

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, ...positionStyles[overlay.position] }}>
      <div
        style={{
          fontFamily: "SF Mono, Monaco, Consolas, monospace",
          color: "#e0e0e8",
          fontSize: fontSizes[overlay.style] ?? 18,
          fontWeight: overlay.style === "title" ? 700 : 400,
          letterSpacing: "0.04em",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        {overlay.text}
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ────────────────────────────────────────────

export const Composition_lattices_snap_zones: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  // Build clip timeline
  let cursor = INTRO_FRAMES;
  const clipTimeline = CLIPS.map((clip, i) => {
    const frames = Math.round(clip.duration * fps);
    const from = cursor;
    // Overlap clips by transition duration for cross-dissolve
    cursor += frames - (i < CLIPS.length - 1 ? TRANSITION_FRAMES : 0);
    return { clip, from, frames };
  });

  const outroStart = cursor;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0e" }}>
      {/* Audio tracks */}
      {AUDIO_TRACKS.map((track, i) => {
        const startFrame = Math.round(track.startAt * fps);
        return (
          <Sequence key={`audio-${i}`} name={`Audio-${track.role}-${i}`} from={startFrame} durationInFrames={durationInFrames - startFrame}>
            <Audio
              src={staticFile(track.src)}
              volume={(f) => {
                const fadeInEnd = track.fadeIn * fps;
                const fadeOutStart = durationInFrames - startFrame - track.fadeOut * fps;
                if (f < fadeInEnd) return interpolate(f, [0, fadeInEnd], [0, track.volume]);
                if (f > fadeOutStart) return interpolate(f, [fadeOutStart, durationInFrames - startFrame], [track.volume, 0]);
                return track.volume;
              }}
            />
          </Sequence>
        );
      })}

      {/* Intro */}
      <Sequence name="Intro" from={0} durationInFrames={INTRO_FRAMES}>
        <TacticalIntro
          title={"Lattices Snap Zones"}
          subtitle={"Snap Zone Actions Panel"}
        />
      </Sequence>

      {/* Content clips */}
      {clipTimeline.map(({ clip, from, frames }, i) => (
        <Sequence key={`clip-${i}`} name={`Clip-${clip.label || i}`} from={from} durationInFrames={frames}>
          <ClipSegment clip={clip} clipDurationFrames={frames} />
        </Sequence>
      ))}

      {/* Text overlays */}
      {TEXT_OVERLAYS.map((overlay, i) => (
        <Sequence
          key={`overlay-${i}`}
          name={`Text-${i}`}
          from={Math.round(overlay.startAt * fps)}
          durationInFrames={Math.round(overlay.duration * fps)}
        >
          <TextOverlay overlay={overlay} />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence name="Outro" from={outroStart} durationInFrames={OUTRO_FRAMES}>
        <TacticalOutro
          title={"Lattices Snap Zones"}
          tagline={"Redefine your workspace boundaries"}
        />
      </Sequence>

    </AbsoluteFill>
  );
};

// Composition registration metadata
export const compositionMeta = {
  id: "lattices-snap-zones",
  component: Composition_lattices_snap_zones,
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  durationInFrames: DURATION_FRAMES,
};
