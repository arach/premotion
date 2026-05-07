import { Composition, registerRoot } from 'remotion'
import { LatticesDictationGestureDemo, DICTATION_GESTURE_FRAMES } from './LatticesDictationGestureDemo'

const Root: React.FC = () => (
  <Composition
    id="LatticesDictationGestureDemo"
    component={LatticesDictationGestureDemo}
    durationInFrames={DICTATION_GESTURE_FRAMES}
    fps={30}
    width={1280}
    height={720}
  />
)

registerRoot(Root)
