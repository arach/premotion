import { registerRoot } from "remotion";
import { Composition } from "remotion";
import { Composition_premotion_demo, compositionMeta } from "./Composition";

const Root: React.FC = () => (
  <Composition
    id={compositionMeta.id}
    component={compositionMeta.component}
    width={compositionMeta.width}
    height={compositionMeta.height}
    fps={compositionMeta.fps}
    durationInFrames={compositionMeta.durationInFrames}
  />
);

registerRoot(Root);
