// Studio loadout: logos and brand cards only.
// Run with: `bun studio:logos`

import { Composition, Still } from "remotion";
import { Thumbnail } from "../Thumbnail";
import { TalkieThumbnail } from "../TalkieThumbnail";
import { TalkieComingSoon } from "../intros/TalkieComingSoon";
import { TalkieGlitchIntro } from "../intros/TalkieGlitchIntro";
import { TalkiePixelIntro } from "../intros/TalkiePixelIntro";
import { TalkieAsciiIntro } from "../intros/TalkieAsciiIntro";
import { TalkieTacticalIntro } from "../intros/TalkieTacticalIntro";
import { MinimalIntro } from "../intros/MinimalIntro";
import { GlitchIntro } from "../intros/GlitchIntro";
import { AsciiIntro } from "../intros/AsciiIntro";
import { TerminalIntro } from "../intros/TerminalIntro";
import { FORMAT_PRESETS } from "../lib/formats";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const INTRO_DURATION = 3 * FPS;

function multiFormat(baseId: string, component: React.FC, duration: number) {
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

export const LogosRoot: React.FC = () => (
  <>
    <Composition
      id="TalkieComingSoon"
      component={TalkieComingSoon}
      durationInFrames={10 * FPS}
      fps={FPS}
      width={1080}
      height={1080}
    />
    <Still
      id="TalkieThumbnail"
      component={TalkieThumbnail}
      width={1280}
      height={720}
      defaultProps={{ title: "TALKIE", subtitle: "Voice Engine v2.22", tagline: "Full Demo" }}
    />
    <Still
      id="TalkieThumbnailSquare"
      component={TalkieThumbnail}
      width={1080}
      height={1080}
      defaultProps={{ title: "TALKIE", subtitle: "Voice Engine v2.22", tagline: "Full Demo" }}
    />
    <Still
      id="ThumbnailTerminal"
      component={Thumbnail}
      width={1280}
      height={720}
      defaultProps={{ title: "DEMO", subtitle: "by arach", style: "terminal" as const }}
    />
    <Still
      id="ThumbnailMinimal"
      component={Thumbnail}
      width={1280}
      height={720}
      defaultProps={{ title: "DEMO", subtitle: "by arach", style: "minimal" as const }}
    />
    <Still
      id="ThumbnailCyberpunk"
      component={Thumbnail}
      width={1280}
      height={720}
      defaultProps={{ title: "DEMO", subtitle: "by arach", style: "cyberpunk" as const }}
    />

    <Composition id="MinimalIntro" component={MinimalIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="GlitchIntro" component={GlitchIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="AsciiIntro" component={AsciiIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TerminalIntro" component={TerminalIntro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    {multiFormat("TalkieGlitchIntro", TalkieGlitchIntro, INTRO_DURATION)}
    {multiFormat("TalkiePixelIntro", TalkiePixelIntro, INTRO_DURATION)}
    {multiFormat("TalkieAsciiIntro", TalkieAsciiIntro, INTRO_DURATION)}
    {multiFormat("TalkieTacticalIntro", TalkieTacticalIntro, INTRO_DURATION)}
  </>
);
