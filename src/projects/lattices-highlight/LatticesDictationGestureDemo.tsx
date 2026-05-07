import React from 'react'
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

// ── Canvas constants ──────────────────────────────────────────────────────────

const W = 1280
const H = 720
const FPS = 30
export const DICTATION_GESTURE_FRAMES = 600 // 20 seconds

// ── Utterance matches gesture-recording-voice.mp3 ────────────────────────────

const UTTERANCE = 'Lattices supports mouse gestures, dictation, and shortcuts without touching the keyboard.'

// ── Gesture paths (screen-space, 1280×720) ───────────────────────────────────

type Pt = [number, number]

const startGesture: Pt[] = [
  [864, 590], [864, 560], [863, 530], [864, 498], [865, 470],
]
const stopGesture: Pt[] = [
  [866, 468], [866, 502], [865, 535], [866, 565], [868, 592],
]
const enterGesture: Pt[] = [
  [1098, 590], [1098, 628], [1062, 628], [1018, 628], [978, 625],
]

// ── Cursor track — deliberate, unhurried ─────────────────────────────────────

type KP = { frame: number; pt: Pt }

const cursorTrack: KP[] = [
  { frame: 0,   pt: [680, 380] },
  { frame: 50,  pt: [820, 490] },
  { frame: 78,  pt: [864, 588] },
  { frame: 90,  pt: startGesture[0] },
  { frame: 122, pt: startGesture[startGesture.length - 1] },
  { frame: 165, pt: [1020, 440] },
  { frame: 225, pt: [900, 560] },
  { frame: 268, pt: [718, 408] },
  { frame: 280, pt: stopGesture[0] },
  { frame: 312, pt: stopGesture[stopGesture.length - 1] },
  { frame: 370, pt: [912, 600] },
  { frame: 438, pt: [1064, 590] },
  { frame: 452, pt: enterGesture[0] },
  { frame: 488, pt: enterGesture[enterGesture.length - 1] },
  { frame: 545, pt: [1080, 610] },
  { frame: 595, pt: [1114, 628] },
]

// ── Utilities ─────────────────────────────────────────────────────────────────

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

const easeInOut = (v: number) => {
  const t = clamp(v)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const lerp2 = (a: Pt, b: Pt, t: number): Pt => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

const cursorAt = (track: KP[], frame: number): Pt => {
  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1]
    const curr = track[i]
    if (frame <= curr.frame) {
      const local = easeInOut((frame - prev.frame) / Math.max(1, curr.frame - prev.frame))
      return lerp2(prev.pt, curr.pt, local)
    }
  }
  return track[track.length - 1].pt
}

const pathLen = (pts: Pt[]) =>
  pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)

const pts2d = (pts: Pt[]) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')

const wrapWords = (text: string, maxLen: number): string[] => {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxLen && cur) { lines.push(cur); cur = w }
    else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

const visibleChars = (text: string, progress: number) =>
  text.slice(0, Math.floor(text.length * clamp(progress)))

// ── Sub-components ────────────────────────────────────────────────────────────

const GesturePath: React.FC<{ pts: Pt[]; progress: number; opacity: number; color?: string }> = ({
  pts, progress, opacity, color = '#48d987',
}) => {
  const len = pathLen(pts)
  const off = len * (1 - clamp(progress))
  return (
    <g opacity={opacity}>
      <path d={pts2d(pts)} fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.13" strokeDasharray={len} strokeDashoffset={off} />
      <path d={pts2d(pts)} fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.86" strokeDasharray={len} strokeDashoffset={off} />
      <path d={pts2d(pts)} fill="none" stroke="#f5fff8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.86" strokeDasharray={len} strokeDashoffset={off} />
    </g>
  )
}

const Cursor: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M 0 0 L 0 24 L 7 18 L 12 30 L 18 27 L 13 15 L 22 15 Z" fill="#f7f8fb" stroke="rgba(0,0,0,0.55)" strokeWidth="1.25" />
    <path d="M 0 0 L 0 24 L 7 18 L 12 30" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
  </g>
)

const Hud: React.FC<{ title: string; detail: string; start: number; end: number; tone?: 'green' | 'blue' }> = ({
  title, detail, start, end, tone = 'green',
}) => {
  const f = useCurrentFrame()
  const opacity = interpolate(f, [start, start + 10, end - 14, end], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const lift = interpolate(f, [start, start + 12], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const color = tone === 'blue' ? '#73b5ff' : '#48d987'
  return (
    <g opacity={opacity} transform={`translate(0 ${lift})`}>
      <rect x="478" y="78" width="324" height="74" rx="16" fill="rgba(15,18,22,0.84)" stroke={`${color}66`} />
      <rect x="498" y="101" width="8" height="31" rx="4" fill={color} />
      <text x="524" y="108" fill="rgba(255,255,255,0.52)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12">LATTICES INPUT</text>
      <text x="524" y="132" fill="#ffffff" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="20" fontWeight="700">{title}</text>
      <text x="688" y="132" fill="rgba(255,255,255,0.46)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="14">{detail}</text>
    </g>
  )
}

const Caption: React.FC<{ text: string; start: number; end: number }> = ({ text, start, end }) => {
  const f = useCurrentFrame()
  const opacity = interpolate(f, [start, start + 10, end - 10, end], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <g opacity={opacity}>
      <rect x="420" y="644" width="440" height="36" rx="12" fill="rgba(9,11,14,0.82)" stroke="rgba(255,255,255,0.11)" />
      <text x="640" y="667" textAnchor="middle" fill="rgba(255,255,255,0.76)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="13">{text}</text>
    </g>
  )
}

const LiveTranscript: React.FC<{ text: string; opacity: number }> = ({ text, opacity }) => {
  const lines = wrapWords(text, 52)
  return (
    <g opacity={opacity}>
      <rect x="340" y="554" width="600" height="92" rx="14" fill="rgba(7,9,12,0.86)" stroke="rgba(72,217,135,0.30)" />
      <text x="366" y="573" fill="rgba(72,217,135,0.82)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11" fontWeight="700">LIVE TRANSCRIPT</text>
      {lines.slice(0, 3).map((line, i) => (
        <text key={i} x="366" y={592 + i * 19} fill="rgba(255,255,255,0.80)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12.5">{line}</text>
      ))}
    </g>
  )
}

const StateRail: React.FC<{ frame: number }> = ({ frame }) => {
  const steps: [string, number][] = [
    ['idle',       0],
    ['record',   120],
    ['stop',     280],
    ['transcribe', 318],
    ['insert',   395],
    ['enter',    452],
  ]
  return (
    <g>
      <rect x="56" y="28" width="1168" height="30" rx="11" fill="rgba(5,7,10,0.60)" stroke="rgba(255,255,255,0.08)" />
      {steps.map(([label, start], i) => {
        const active = frame >= start
        return (
          <g key={label} transform={`translate(${82 + i * 184} 0)`}>
            <circle cx="0" cy="43" r="5" fill={active ? '#48d987' : 'rgba(255,255,255,0.18)'} />
            <text x="14" y="47" fill={active ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.34)'} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12">{label}</text>
          </g>
        )
      })}
    </g>
  )
}

// Left panel: static code browser mock
const BrowserPanel: React.FC = () => (
  <g>
    <rect x="56" y="82" width="608" height="574" rx="14" fill="rgba(13,17,23,0.96)" stroke="rgba(255,255,255,0.10)" />
    <rect x="56" y="82" width="608" height="42" rx="14" fill="rgba(255,255,255,0.035)" />
    <circle cx="82" cy="103" r="5" fill="#ff5f57" opacity="0.75" />
    <circle cx="100" cy="103" r="5" fill="#febc2e" opacity="0.75" />
    <circle cx="118" cy="103" r="5" fill="#28c840" opacity="0.75" />
    <text x="146" y="108" fill="rgba(255,255,255,0.58)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="13" fontWeight="600">Lattices pull request</text>
    <rect x="92" y="154" width="440" height="20" rx="5" fill="rgba(180,124,255,0.34)" />
    <rect x="92" y="190" width="510" height="16" rx="4" fill="rgba(255,255,255,0.14)" />
    <rect x="92" y="220" width="464" height="10" rx="3" fill="rgba(255,255,255,0.18)" />
    <rect x="92" y="242" width="392" height="10" rx="3" fill="rgba(255,255,255,0.10)" />
    <rect x="92" y="264" width="502" height="10" rx="3" fill="rgba(255,255,255,0.10)" />
    <rect x="92" y="312" width="220" height="14" rx="4" fill="rgba(255,255,255,0.18)" />
    {Array.from({ length: 8 }, (_, i) => (
      <g key={i}>
        <circle cx="106" cy={354 + i * 26} r="3" fill="rgba(255,255,255,0.28)" />
        <rect x="122" y={349 + i * 26} width={330 + (i % 3) * 42} height="9" rx="3" fill="rgba(255,255,255,0.105)" />
      </g>
    ))}
  </g>
)

// Top-right: terminal / logs
const TerminalPanel: React.FC = () => (
  <g>
    <rect x="718" y="82" width="506" height="214" rx="14" fill="rgba(12,27,18,0.92)" stroke="rgba(83,196,116,0.26)" />
    <rect x="718" y="82" width="506" height="36" rx="14" fill="rgba(255,255,255,0.035)" />
    <text x="742" y="106" fill="rgba(188,255,206,0.78)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12" fontWeight="700">lattices logs</text>
    {Array.from({ length: 7 }, (_, i) => (
      <text key={i} x="742" y={146 + i * 20} fill={`rgba(188,255,206,${0.34 + i * 0.05})`} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12">
        {i === 4 ? '[voice] dictation pipeline ready' : i === 5 ? '[mouse] gesture listener active' : 'event tap healthy - input passthrough ok'}
      </text>
    ))}
  </g>
)

// Bottom-right: Codex panel with animated states
const CodexPanel: React.FC<{
  frame: number
  recording: number
  transcribing: number
  draftText: string
  submittedText: string
  submitted: boolean
  submittedOpacity: number
  workingOpacity: number
}> = ({ frame, recording, transcribing, draftText, submittedText, submitted, submittedOpacity, workingOpacity }) => {
  const draftLines = wrapWords(draftText, 46)
  const submittedLines = wrapWords(submittedText, 46)

  return (
    <g>
      <rect x="718" y="328" width="506" height="328" rx="18" fill="rgba(18,19,24,0.96)" stroke="rgba(255,255,255,0.11)" />
      <rect x="718" y="328" width="506" height="42" rx="18" fill="rgba(255,255,255,0.035)" />
      <text x="744" y="356" fill="rgba(255,255,255,0.68)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="14" fontWeight="700">Codex</text>
      <text x="1156" y="356" fill="rgba(255,255,255,0.34)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11">ready</text>

      {/* Recording: green waveform */}
      <g opacity={recording}>
        <rect x="766" y="392" width="410" height="60" rx="15" fill="rgba(72,217,135,0.08)" stroke="rgba(72,217,135,0.30)" />
        <circle cx="794" cy="422" r="7" fill="#48d987" />
        {Array.from({ length: 10 }, (_, i) => {
          const bar = 8 + Math.abs(Math.sin(frame * 0.21 + i * 0.7)) * 26
          return <rect key={i} x={822 + i * 12} y={422 - bar / 2} width="5" height={bar} rx="2.5" fill="rgba(72,217,135,0.76)" />
        })}
        <text x="966" y="427" fill="rgba(255,255,255,0.68)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="13">recording</text>
      </g>

      {/* Transcribing: blue pulse */}
      <g opacity={transcribing}>
        <rect x="766" y="392" width="410" height="60" rx="15" fill="rgba(115,181,255,0.08)" stroke="rgba(115,181,255,0.30)" />
        <circle cx="794" cy="422" r={6 + Math.sin(frame * 0.22) * 2} fill="rgba(115,181,255,0.82)" />
        <text x="820" y="427" fill="rgba(255,255,255,0.68)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="13">transcribing recorded audio...</text>
      </g>

      {/* Submitted message bubble */}
      <g opacity={submittedOpacity}>
        <rect x="766" y="394" width="410" height="84" rx="15" fill="rgba(72,217,135,0.07)" stroke="rgba(72,217,135,0.32)" />
        <text x="792" y="416" fill="rgba(255,255,255,0.50)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11">submitted request</text>
        {submittedLines.slice(0, 3).map((line, i) => (
          <text key={i} x="792" y={434 + i * 17} fill="rgba(255,255,255,0.86)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="13.5">{line}</text>
        ))}
      </g>

      {/* Prompt input box */}
      <rect x="766" y="496" width="410" height="100" rx="18" fill="rgba(8,10,13,0.82)" stroke={draftText ? 'rgba(72,217,135,0.38)' : 'rgba(255,255,255,0.12)'} />
      <circle cx="794" cy="546" r="11" fill="rgba(72,217,135,0.12)" stroke="rgba(72,217,135,0.36)" />
      {draftText ? (
        draftLines.slice(0, 3).map((line, i) => (
          <text key={i} x="820" y={525 + i * 22} fill="rgba(255,255,255,0.80)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="14.5">{line}</text>
        ))
      ) : (
        <text x="820" y="552" fill="rgba(255,255,255,0.30)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="15">
          {submitted ? 'Ready for the next request...' : 'Dictate a request...'}
        </text>
      )}
      {/* Send/Enter button */}
      <rect x="1132" y="534" width="30" height="30" rx="9" fill={submitted ? 'rgba(72,217,135,0.72)' : 'rgba(255,255,255,0.08)'} />
      <path d="M 1140 550 L 1152 540 L 1162 550" fill="none" stroke="rgba(245,255,248,0.84)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Codex working bar — slides in after Enter */}
      <g opacity={workingOpacity}>
        <rect x="766" y="608" width="410" height="34" rx="12" fill="rgba(72,217,135,0.10)" stroke="rgba(72,217,135,0.26)" />
        <text x="792" y="630" fill="rgba(255,255,255,0.90)" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fontSize="15" fontWeight="700">Codex is working...</text>
        <text x="986" y="630" fill="rgba(255,255,255,0.44)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11">request submitted from mouse gesture</text>
      </g>
    </g>
  )
}

// ── Main composition ──────────────────────────────────────────────────────────

export const LatticesDictationGestureDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const cursor = cursorAt(cursorTrack, frame)

  // Gesture progress (spring draws each stroke)
  const startP  = spring({ frame: frame - 90,  fps, config: { damping: 17, mass: 0.72, stiffness: 92 }, durationInFrames: 28 })
  const stopP   = spring({ frame: frame - 280, fps, config: { damping: 17, mass: 0.72, stiffness: 92 }, durationInFrames: 28 })
  const enterP  = spring({ frame: frame - 452, fps, config: { damping: 17, mass: 0.72, stiffness: 92 }, durationInFrames: 28 })

  // Voice is ~5.5 s; starts at frame 120; transcript lags 12 frames, finishes just before stop
  const voiceProgress   = interpolate(frame, [132, 278], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const insertProgress  = interpolate(frame, [395, 438], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const recording      = interpolate(frame, [120, 132, 278, 292], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const transcribing   = interpolate(frame, [318, 332, 372, 386], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const submittedOpac  = interpolate(frame, [490, 510], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const workingOpac    = interpolate(frame, [500, 522], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const liveText    = visibleChars(UTTERANCE, voiceProgress)
  const draftText   = frame >= 395 && frame < 490 ? visibleChars(UTTERANCE, insertProgress) : ''
  const submittedText = frame >= 490 ? UTTERANCE : ''
  const submitted   = frame >= 490

  const fade = interpolate(frame, [582, 598], [1, 0.92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: '#080b0f', opacity: fade }}>
      {/* Click: start gesture */}
      <Sequence from={92}>
        <Audio src={staticFile('sfx/lattices-dictation-click-confirm.mp3')} volume={0.9} />
      </Sequence>
      {/* Nicer dictated voice (matches UTTERANCE) */}
      <Sequence from={120}>
        <Audio src={staticFile('sfx/lattices-gesture-recording-voice.mp3')} volume={0.95} />
      </Sequence>
      {/* Click: stop gesture */}
      <Sequence from={286}>
        <Audio src={staticFile('sfx/lattices-dictation-click-stop.mp3')} volume={0.9} />
      </Sequence>
      {/* Click: Enter gesture */}
      <Sequence from={490}>
        <Audio src={staticFile('sfx/lattices-dictation-click-confirm.mp3')} volume={0.9} />
      </Sequence>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>
          <radialGradient id="dg-bg" cx="68%" cy="48%" r="74%">
            <stop offset="0%"   stopColor="#2a9b68" stopOpacity="0.13" />
            <stop offset="45%"  stopColor="#1d4065" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#080b0f"  stopOpacity="0" />
          </radialGradient>
          <filter id="dg-shadow" x="-50%" y="-50%" width="220%" height="220%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.42" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="#080b0f" />
        <rect width={W} height={H} fill="url(#dg-bg)" />
        <StateRail frame={frame} />

        <g filter="url(#dg-shadow)">
          <BrowserPanel />
          <TerminalPanel />
          <CodexPanel
            frame={frame}
            recording={recording}
            transcribing={transcribing}
            draftText={draftText}
            submittedText={submittedText}
            submitted={submitted}
            submittedOpacity={submittedOpac}
            workingOpacity={workingOpac}
          />
        </g>

        {/* Live transcript floats above Codex */}
        <LiveTranscript text={liveText} opacity={recording} />

        {/* Gesture strokes */}
        <GesturePath pts={startGesture} progress={startP}
          opacity={interpolate(frame, [90, 102, 142, 158], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
        <GesturePath pts={stopGesture} progress={stopP} color="#73b5ff"
          opacity={interpolate(frame, [280, 292, 330, 346], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
        <GesturePath pts={enterGesture} progress={enterP}
          opacity={interpolate(frame, [452, 464, 500, 516], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />

        {/* HUD banners */}
        <Hud title="Dictation started"  detail="middle click up"   start={125} end={215} />
        <Hud title="Recording stopped"  detail="middle click down" start={296} end={376} tone="blue" />
        <Hud title="Enter sent"         detail="mouse gesture"     start={490} end={560} />

        {/* Bottom captions */}
        <Caption text="middle click up → record"               start={112} end={212} />
        <Caption text="recorded voice → transcript"            start={212} end={278} />
        <Caption text="middle click down → stop + transcribe"  start={296} end={376} />
        <Caption text="gesture → Enter → submitted"            start={490} end={556} />

        <Cursor x={cursor[0]} y={cursor[1]} />
      </svg>
    </AbsoluteFill>
  )
}

export const calculateDictationGestureFrames = () => DICTATION_GESTURE_FRAMES
