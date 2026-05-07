// Studio loadout: templates only.
// Run with: `bun studio:templates`

import { Composition, Folder } from "remotion";
import { TerminalIntro } from "../intros/TerminalIntro";
import { MinimalIntro } from "../intros/MinimalIntro";
import { GlitchIntro } from "../intros/GlitchIntro";
import { AsciiIntro } from "../intros/AsciiIntro";
import { TalkieGlitchIntro } from "../intros/TalkieGlitchIntro";
import { TalkiePixelIntro } from "../intros/TalkiePixelIntro";
import { TalkieAsciiIntro } from "../intros/TalkieAsciiIntro";
import { TalkieTacticalIntro } from "../intros/TalkieTacticalIntro";
import { TacticalIntro, TacticalOutro, DemoVideo, calculateDemoFrames } from "../projects/demo-template";
import { RetroComputerFrame } from "../components/RetroComputerFrame";
import { FORMAT_PRESETS } from "../lib/formats";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const INTRO_DURATION = 3 * FPS;

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

export const TemplatesRoot: React.FC = () => (
  <>
    <Folder name="Intros">
      <Composition id="TerminalIntro" component={TerminalIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="MinimalIntro" component={MinimalIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="GlitchIntro" component={GlitchIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="AsciiIntro" component={AsciiIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
      {introCompositions("TalkieGlitchIntro", TalkieGlitchIntro, INTRO_DURATION)}
      {introCompositions("TalkiePixelIntro", TalkiePixelIntro, INTRO_DURATION)}
      {introCompositions("TalkieAsciiIntro", TalkieAsciiIntro, INTRO_DURATION)}
      {introCompositions("TalkieTacticalIntro", TalkieTacticalIntro, INTRO_DURATION)}
      <Composition
        id="TacticalIntro"
        component={TacticalIntro}
        durationInFrames={2 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ title: "TEMPLATE", subtitle: "TacticalIntro preview" }}
      />
    </Folder>

    <Folder name="Outros">
      <Composition
        id="TacticalOutro"
        component={TacticalOutro}
        durationInFrames={4 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ title: "TEMPLATE", tagline: "TacticalOutro preview", releaseDate: "v0.0 - 2026" }}
      />
    </Folder>

    <Folder name="Frames">
      <Composition
        id="RetroComputerPreview"
        component={() => (
          <RetroComputerFrame>
            <div style={{ width: "100%", height: "100%", backgroundColor: "#0a2010", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "SF Mono, monospace", color: "#4ade80", fontSize: 24 }}>
              VIDEO CONTENT HERE
            </div>
          </RetroComputerFrame>
        )}
        durationInFrames={5 * FPS}
        fps={FPS}
        width={1080}
        height={1080}
      />
    </Folder>

    <Folder name="Composers">
      <Composition
        id="DemoVideo-Preview"
        component={DemoVideo}
        durationInFrames={calculateDemoFrames(8, FPS, 2, 4)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          videoSrc: "demos/placeholder.mp4",
          title: "TEMPLATE",
          subtitle: "DemoVideo preview",
          tagline: "Intro -> Content -> Outro",
          releaseDate: "v0.0 - 2026",
          iconSrc: "talkie-icon-1024.png",
          musicVolume: 0,
          videoVolume: 0,
        }}
      />
    </Folder>
  </>
);
