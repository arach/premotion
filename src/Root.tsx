import { Composition, Still, Folder, Img, staticFile } from "remotion";
import { VideoMontage } from "./VideoMontage";
import { FullVideo } from "./FullVideo";
import { TerminalIntro } from "./intros/TerminalIntro";
import { MinimalIntro } from "./intros/MinimalIntro";
import { GlitchIntro } from "./intros/GlitchIntro";
import { AsciiIntro } from "./intros/AsciiIntro";
import { TalkieGlitchIntro } from "./intros/TalkieGlitchIntro";
import { TalkiePixelIntro } from "./intros/TalkiePixelIntro";
import { TalkieAsciiIntro } from "./intros/TalkieAsciiIntro";
import { TalkieTacticalIntro } from "./intros/TalkieTacticalIntro";
import { TalkieComingSoon } from "./intros/TalkieComingSoon";
import { Thumbnail } from "./Thumbnail";
import { QuoteVideo } from "./QuoteVideo";
import { QuickPreview } from "./QuickPreview";
import { FORMAT_PRESETS } from "./lib/formats";

// Project-based compositions
import { AuditDemo, TOTAL_FRAMES as AUDIT_DEMO_FRAMES } from "./projects/audit-demo";
import { HostAIMontage, TOTAL_FRAMES as HOSTAI_MONTAGE_FRAMES } from "./projects/hostai-montage";
import { DemoVideo, calculateDemoFrames } from "./projects/demo-template";
import { RetroComputerFrame } from "./components/RetroComputerFrame";
import { MidjourneyComputerFrame } from "./components/MidjourneyComputerFrame";
import { MidjourneyComputerContent } from "./components/MidjourneyComputerContent";

// Video settings
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// Timing
const INTRO_DURATION = 3 * FPS;  // 3 seconds
const OUTRO_DURATION = 3 * FPS;  // 3 seconds
const TRANSITION_DURATION = 20;  // ~0.67 seconds

// Define your clips here - timestamps in seconds
export const CLIPS = [
  {
    start: 14,
    end: 100,
    zoom: {
      startAtOutput: 60,
      scale: 1.5,
      origin: { x: 25, y: 40 }
    }
  },
];

// Calculate durations
const calculateMainVideoFrames = () => {
  return CLIPS.reduce((total, clip) => {
    return total + (clip.end - clip.start) * FPS;
  }, 0);
};

const calculateFullVideoFrames = () => {
  const mainVideo = calculateMainVideoFrames();
  // Intro + main video + outro - transition overlaps (2 transitions)
  return INTRO_DURATION + mainVideo + OUTRO_DURATION - (2 * TRANSITION_DURATION);
};

// Helper to register multi-format compositions for Talkie intros
function introCompositions(baseId: string, component: React.FC, duration: number) {
  return FORMAT_PRESETS.map((preset) => {
    const id = preset.id === "HD" ? baseId : `${baseId}-${preset.id}`;
    return (
      <Composition
        key={id}
        id={id}
        component={component}
        durationInFrames={duration}
        fps={FPS}
        width={preset.width}
        height={preset.height}
      />
    );
  });
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Audit Demo - project-based composition */}
      <Folder name="AuditDemo">
        <Composition
          id="AuditDemo"
          component={AuditDemo}
          durationInFrames={AUDIT_DEMO_FRAMES}
          fps={FPS}
          width={1080}
          height={720}
        />
      </Folder>

      {/* HostAI Montage - two videos with transitions */}
      <Folder name="HostAIMontage">
        <Composition
          id="HostAIMontage"
          component={HostAIMontage}
          durationInFrames={HOSTAI_MONTAGE_FRAMES}
          fps={FPS}
          width={1080}
          height={1080}
        />
      </Folder>

      {/* Talkie Coming Soon - standalone scene */}
      <Composition
        id="TalkieComingSoon"
        component={TalkieComingSoon}
        durationInFrames={10 * FPS}
        fps={FPS}
        width={1080}
        height={1080}
      />

      {/* Retro Computer Frame Preview */}
      <Composition
        id="RetroComputerPreview"
        component={() => (
          <RetroComputerFrame>
            <div style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#0a2010",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "SF Mono, monospace",
              color: "#4ade80",
              fontSize: 24,
            }}>
              VIDEO CONTENT HERE
            </div>
          </RetroComputerFrame>
        )}
        durationInFrames={5 * FPS}
        fps={FPS}
        width={1080}
        height={1080}
      />

      {/* Midjourney Computer Frame - Multiple beat options */}
      <Folder name="MidjourneyComputer">
        <Composition
          id="MJ-FuturisticSynthwave"
          component={MidjourneyComputerContent}
          durationInFrames={10 * FPS}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{ musicTrack: "tracks/futuristic-synthwave.mp3" }}
        />
        <Composition
          id="MJ-FrequencySynthwave"
          component={MidjourneyComputerContent}
          durationInFrames={10 * FPS}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{ musicTrack: "tracks/frequency-synthwave.mp3" }}
        />
        <Composition
          id="MJ-InstrumentalSynthwave"
          component={MidjourneyComputerContent}
          durationInFrames={10 * FPS}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{ musicTrack: "tracks/instrumental-synthwave.mp3" }}
        />
        <Composition
          id="MJ-JapanTrap"
          component={MidjourneyComputerContent}
          durationInFrames={10 * FPS}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{ musicTrack: "tracks/japan-trap.mp3" }}
        />
        <Composition
          id="MJ-LastTrip"
          component={MidjourneyComputerContent}
          durationInFrames={10 * FPS}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{ musicTrack: "tracks/last-trip-60s.mp3" }}
        />
      </Folder>

      {/* Demo Videos - 4 videos with intro/outro template */}
      <Folder name="TalkieDemos">
        <Composition
          id="TalkieDemo1"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(30, FPS)} // 30s content + intro/outro
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{
            videoSrc: "demos/demo1.mp4",
            title: "TALKIE",
            subtitle: "Voice Engine v4.0",
            tagline: "Coming Soon",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
          }}
        />
        <Composition
          id="TalkieDemo2"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(30, FPS)}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{
            videoSrc: "demos/demo2.mp4",
            title: "TALKIE",
            subtitle: "Live Transcription",
            tagline: "Coming Soon",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
          }}
        />
        <Composition
          id="TalkieDemo3"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(30, FPS)}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{
            videoSrc: "demos/demo3.mp4",
            title: "TALKIE",
            subtitle: "Voice Commands",
            tagline: "Coming Soon",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
          }}
        />
        <Composition
          id="TalkieDemo4"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(30, FPS)}
          fps={FPS}
          width={1080}
          height={1080}
          defaultProps={{
            videoSrc: "demos/demo4.mp4",
            title: "TALKIE",
            subtitle: "AI Assistant",
            tagline: "Coming Soon",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
          }}
        />
      </Folder>

      {/* Quick Preview - DM style casual video */}
      <Composition
        id="DMPreview"
        component={QuickPreview}
        durationInFrames={1435} // ~46s video + 1.5s intro
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          videoFile: "dm-preview.mp4",
          handle: "@arach",
          showIntro: true,
        }}
      />

      {/* Quote Video - Square (Instagram/TikTok) */}
      <Composition
        id="QuoteVideo"
        component={QuoteVideo}
        durationInFrames={147}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{
          audioFile: "tts-output.mp3",
          handle: "@arach",
        }}
      />

      {/* Quote Video - Horizontal (X/Twitter) */}
      <Composition
        id="QuoteVideoX"
        component={QuoteVideo}
        durationInFrames={147}
        fps={FPS}
        width={1280}
        height={360}
        defaultProps={{
          audioFile: "tts-output.mp3",
          handle: "@arach",
        }}
      />

      {/* MAIN: Full Video with Intro */}
      <Composition
        id="FullVideo"
        component={FullVideo}
        durationInFrames={calculateFullVideoFrames()}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          clips: CLIPS,
          introDuration: INTRO_DURATION,
          outroDuration: OUTRO_DURATION,
          transitionDuration: TRANSITION_DURATION,
          handle: "@arach",
        }}
      />

      {/* Video without intro (for testing) */}
      <Composition
        id="VideoMontage"
        component={VideoMontage}
        durationInFrames={calculateMainVideoFrames()}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          clips: CLIPS,
          transitionDuration: TRANSITION_DURATION,
        }}
      />

      {/* Intro Variants */}
      <Folder name="Intros">
        <Composition
          id="TerminalIntro"
          component={TerminalIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="MinimalIntro"
          component={MinimalIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="GlitchIntro"
          component={GlitchIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="AsciiIntro"
          component={AsciiIntro}
          durationInFrames={INTRO_DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        {introCompositions("TalkieGlitchIntro", TalkieGlitchIntro, INTRO_DURATION)}
        {introCompositions("TalkiePixelIntro", TalkiePixelIntro, INTRO_DURATION)}
        {introCompositions("TalkiePixelIntroLong", TalkiePixelIntro, 7 * FPS)}
        {introCompositions("TalkieAsciiIntro", TalkieAsciiIntro, INTRO_DURATION)}
        {introCompositions("TalkieTacticalIntro", TalkieTacticalIntro, INTRO_DURATION)}
      </Folder>

      {/* Thumbnails */}
      <Folder name="Thumbnails">
        <Still
          id="ThumbnailTerminal"
          component={Thumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "DEMO",
            subtitle: "by arach",
            style: "terminal" as const,
          }}
        />
        <Still
          id="ThumbnailMinimal"
          component={Thumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "DEMO",
            subtitle: "by arach",
            style: "minimal" as const,
          }}
        />
        <Still
          id="ThumbnailCyberpunk"
          component={Thumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "DEMO",
            subtitle: "by arach",
            style: "cyberpunk" as const,
          }}
        />
      </Folder>
    </>
  );
};
