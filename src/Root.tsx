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
import { TalkieThumbnail } from "./TalkieThumbnail";
import { QuoteVideo } from "./QuoteVideo";
import { QuickPreview } from "./QuickPreview";
import { FORMAT_PRESETS } from "./lib/formats";

// Project-based compositions
import { DemoVideo, calculateDemoFrames } from "./projects/demo-template";
import { RetroComputerFrame } from "./components/RetroComputerFrame";
import { MidjourneyComputerFrame } from "./components/MidjourneyComputerFrame";
import { MidjourneyComputerContent } from "./components/MidjourneyComputerContent";
import { TalkieDashboardShowcase } from "./components/TalkieDashboardShowcase";
import { TalkiePromoVideo } from "./components/TalkiePromoVideo";
import { HUDExperimentVideo, calculateHUDFrames } from "./HUDExperimentVideo";
import { FramedVideo } from "./components/FramedVideo";
import { HudsonHighlightReel, calculateHighlightFrames } from "./projects/hudson-highlight/HudsonHighlightReel";

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

      {/* Talkie Promo Video - Full cinematic sequence */}
      <Composition
        id="TalkiePromo"
        component={TalkiePromoVideo}
        durationInFrames={Math.round(23.5 * FPS)} // 5s intro + 1.5s zoom + 15s content + 2s outro
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{
          contentFile: "talkie-home-2.png",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.15,
          // Voiceover A/B toggles - set one to 1, others to 0
          vo1Volume: 1,  // Intro 2 (6.6s) - default
          vo2Volume: 0,  // Intro 4 (2s)
          vo3Volume: 0,  // Script 7 (6.2s)
          vo4Volume: 0,  // Ephemeral (9.5s)
          introDuration: 5,
          zoomDuration: 1.5,
          contentDuration: 15,
          outroDuration: 2,
          introScale: 0.45,
          showBezel: true,
          bezelMargin: 26,
          screenshotScale: 1.1,
          showViewportTarget: false,
          targetOffsetX: 0,
          targetOffsetY: 0,
        }}
      />

      {/* Simple Dashboard Showcase (for testing zoom alignment) */}
      <Composition
        id="MJ-TalkieDashboard"
        component={TalkieDashboardShowcase}
        durationInFrames={13 * FPS}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{
          screenshotFile: "talkie-home.png",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.12,
          zoomInDuration: 1.5,
          contentHoldDuration: 10,
          zoomOutDuration: 1.5,
          vo1Volume: 0,
          vo2Volume: 0,
          vo3Volume: 0,
          vo4Volume: 1,
          vo5Volume: 0,
        }}
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

      {/* HUD Experiment - 309s with music fade to original audio */}
      <Composition
        id="HUDExperiment"
        component={HUDExperimentVideo}
        durationInFrames={calculateHUDFrames(309, FPS, 5, 5)} // 309s content + 5s intro + 5s outro
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "demos/hud-long.mp4",
          title: "HUD EXPERIMENT",
          subtitle: "Prototype v0.1",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.35,
          musicFadeOutStart: 1,
          showCaptions: false,
          transcriptFile: "transcripts/hud-long.json",
        }}
      />
      {/* HUD Experiment with Captions - taller to fit caption bar */}
      <Composition
        id="HUDExperimentCaptions"
        component={HUDExperimentVideo}
        durationInFrames={calculateHUDFrames(309, FPS, 5, 5)}
        fps={FPS}
        width={1920}
        height={1200}
        defaultProps={{
          videoSrc: "demos/hud-long.mp4",
          title: "HUD EXPERIMENT",
          subtitle: "Prototype v0.1",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.35,
          musicFadeOutStart: 1,
          showCaptions: true,
          transcriptFile: "transcripts/hud-long.json",
          captionBarHeight: 120,
          showBezel: true,
          bezelSize: 14,
        }}
      />

      {/* Clean HUD videos - native 1592x1218 + bezel + caption bar */}
      <Folder name="HUDClean">
        {/* 3 minute video */}
        <Composition
          id="HUDClean-Long"
          component={HUDExperimentVideo}
          durationInFrames={calculateHUDFrames(180, FPS, 5, 5)}
          fps={FPS}
          width={1620}
          height={1366}
          defaultProps={{
            videoSrc: "demos/CleanShot 2026-02-15 at 11.17.35.mp4",
            title: "HUD EXPERIMENT",
            subtitle: "Prototype v0.1",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.35,
            musicFadeOutStart: 1,
            showCaptions: true,
            transcriptFile: "transcripts/hud-clean-long.json",
            captionBarHeight: 100,
            showBezel: true,
            bezelSize: 14,
          }}
        />
        {/* 2 minute video */}
        <Composition
          id="HUDClean-Medium"
          component={HUDExperimentVideo}
          durationInFrames={calculateHUDFrames(129, FPS, 5, 5)}
          fps={FPS}
          width={1620}
          height={1366}
          defaultProps={{
            videoSrc: "demos/CleanShot 2026-02-15 at 11.21.21.mp4",
            title: "HUD EXPERIMENT",
            subtitle: "Prototype v0.1",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.35,
            musicFadeOutStart: 1,
            showCaptions: true,
            transcriptFile: "transcripts/hud-clean-medium.json",
            captionBarHeight: 100,
            showBezel: true,
            bezelSize: 14,
          }}
        />
        {/* 41 second video */}
        <Composition
          id="HUDClean-Short"
          component={HUDExperimentVideo}
          durationInFrames={calculateHUDFrames(41, FPS, 5, 5)}
          fps={FPS}
          width={1620}
          height={1366}
          defaultProps={{
            videoSrc: "demos/CleanShot 2026-02-15 at 10.28.11.mp4",
            title: "HUD EXPERIMENT",
            subtitle: "Prototype v0.1",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.35,
            musicFadeOutStart: 1,
            showCaptions: true,
            transcriptFile: "transcripts/hud-clean-short.json",
            captionBarHeight: 100,
            showBezel: true,
            bezelSize: 14,
          }}
        />
      </Folder>

      {/* Latest Clip — 4 font takes */}
      <Folder name="LatestClip">
        {/* Take 1: Inter — clean Swiss minimalism */}
        <Composition
          id="Take1-Inter"
          component={FramedVideo}
          durationInFrames={Math.round((10 + 40.5 + 8) * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/latest-clip.mp4",
            title: "International Women's Day 2026",
            introDuration: 10,
            outroDuration: 8,
            take: "inter",
          }}
        />
        {/* Take 2: Lora + DM Sans — warm editorial serif meets clean sans */}
        <Composition
          id="Take2-Lora"
          component={FramedVideo}
          durationInFrames={Math.round((10 + 40.5 + 8) * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/latest-clip.mp4",
            title: "International Women's Day 2026",
            introDuration: 10,
            outroDuration: 8,
            take: "lora",
          }}
        />
        {/* Take 3: EB Garamond — classical literary elegance */}
        <Composition
          id="Take3-Garamond"
          component={FramedVideo}
          durationInFrames={Math.round((10 + 40.5 + 8) * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/latest-clip.mp4",
            title: "International Women's Day 2026",
            introDuration: 10,
            outroDuration: 8,
            take: "garamond",
          }}
        />
        {/* Take 4: Sora + Crimson Text — geometric sans titles, classic serif statement */}
        <Composition
          id="Take4-Sora"
          component={FramedVideo}
          durationInFrames={Math.round((10 + 40.5 + 8) * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/latest-clip.mp4",
            title: "International Women's Day 2026",
            introDuration: 10,
            outroDuration: 8,
            take: "sora",
          }}
        />
      </Folder>

      {/* Demo Videos - 4 videos with intro/outro template */}
      <Folder name="TalkieDemos">
        {/* Capture Overview - 55s demo */}
        <Composition
          id="CaptureOverview"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(55, FPS)} // 55s content + intro/outro
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/capture-overview.mp4",
            title: "TALKIE",
            subtitle: "Voice Engine v2.22",
            tagline: "Capture Overview",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.3,
          }}
        />
        {/* Talkie Capture - 41s demo */}
        <Composition
          id="TalkieCapture"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(41, FPS)} // 41s content + intro/outro
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/Talkie Capture.mp4",
            title: "TALKIE",
            subtitle: "Voice Engine v2.22",
            tagline: "Capture Demo",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.3,
          }}
        />
        {/* iOS Screen Recording - Portrait 9:16 */}
        <Composition
          id="TalkieiOS"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(89.5, FPS)}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{
            videoSrc: "demos/talkie-ios-demo-trimmed2.mp4",
            title: "TALKIE",
            subtitle: "Voice Engine v2.22",
            tagline: "iOS Demo",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.3,
          }}
        />
        {/* Latest: 60s Overview with Tactical Intro */}
        <Composition
          id="TalkieOverview"
          component={DemoVideo}
          durationInFrames={calculateDemoFrames(60, FPS)} // 60s content + intro/outro
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            videoSrc: "demos/60s Demo - Full Overview.mp4",
            title: "TALKIE",
            subtitle: "Voice Engine v2.22",
            tagline: "Coming Soon",
            releaseDate: "Q1 2026",
            musicTrack: "tracks/futuristic-synthwave.mp3",
            musicVolume: 0.3,
          }}
        />
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
            subtitle: "Voice Engine v2.22",
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

      {/* Screen Demo - Mar 18, 2026 */}
      <Composition
        id="ScreenDemo-Mar18"
        component={DemoVideo}
        durationInFrames={calculateDemoFrames(251.06, FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "demos/cleanshot-demo-2026-03-18.mp4",
          title: "ARACH",
          subtitle: "Screen Demo",
          tagline: "March 2026",
          releaseDate: "Q1 2026",
          iconSrc: "arach-circle.png",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.25,
          frameStyle: "none",
          videoStartFrom: 10.29,
        }}
      />

      {/* Screen Demo 2 - Mar 19, 2026 16:55 (~281s, 3440x1440) */}
      <Composition
        id="ScreenDemo-Mar19-1655"
        component={DemoVideo}
        durationInFrames={calculateDemoFrames(281.27, FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "demos/cleanshot-demo-2026-03-19-1655.mp4",
          title: "ARACH",
          subtitle: "Screen Demo",
          tagline: "March 2026",
          releaseDate: "Q1 2026",
          iconSrc: "arach-circle.png",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.25,
          frameStyle: "none",
        }}
      />

      {/* Screen Demo 3 - Mar 19, 2026 16:33 (~554s, 2550x1440) */}
      <Composition
        id="ScreenDemo-Mar19-1633"
        component={DemoVideo}
        durationInFrames={calculateDemoFrames(554.37, FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "demos/cleanshot-demo-2026-03-19-1633.mp4",
          title: "ARACH",
          subtitle: "Screen Demo",
          tagline: "March 2026",
          releaseDate: "Q1 2026",
          iconSrc: "arach-circle.png",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.25,
          frameStyle: "none",
        }}
      />

      {/* Hudson Highlight Reel - 45s curated edit */}
      <Composition
        id="HudsonHighlightReel"
        component={HudsonHighlightReel}
        durationInFrames={calculateHighlightFrames(FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: "demos/cleanshot-demo-2026-03-19-1633.mp4",
          musicTrack: "tracks/futuristic-synthwave.mp3",
          musicVolume: 0.3,
          title: "HUDSON",
          subtitle: "Design System",
          tagline: "Generative Design Tools",
          releaseDate: "2026",
          iconSrc: "arach-circle.png",
        }}
      />

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
          id="TalkieThumbnail"
          component={TalkieThumbnail}
          width={1280}
          height={720}
          defaultProps={{
            title: "TALKIE",
            subtitle: "Voice Engine v2.22",
            tagline: "Full Demo",
          }}
        />
        <Still
          id="TalkieThumbnailSquare"
          component={TalkieThumbnail}
          width={1080}
          height={1080}
          defaultProps={{
            title: "TALKIE",
            subtitle: "Voice Engine v2.22",
            tagline: "Full Demo",
          }}
        />
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
