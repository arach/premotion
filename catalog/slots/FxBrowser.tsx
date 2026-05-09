'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FX_PARAMS, type ParamDef } from './FxParams';
import { useFx } from '../FxContext';
import {
  ChevronDown,
  Download,
  HelpCircle,
  Layers,
  LayoutGrid,
  Music2,
  Plus,
  RotateCcw,
  SkipBack,
  Pause,
  Play,
  Volume2,
  X,
  Wand2,
} from 'lucide-react';

// ─── Registry ────────────────────────────────────────────────────────────────

type Tech = 'WebGL' | 'Canvas 2D' | 'CSS';
interface FxEffect { id: string; name: string; category: string; tech: Tech; desc: string; }

const EFFECTS: FxEffect[] = [
  { id: 'film-grade',       name: 'Film Grade',            category: 'Color & Grade',         tech: 'WebGL',     desc: 'ACES tone curve + teal-orange + grain + vignette' },
  { id: 'bleach-bypass',    name: 'Bleach Bypass',         category: 'Color & Grade',         tech: 'WebGL',     desc: 'Desaturate + contrast boost + cool shadow lift' },
  { id: 'golden-hour',      name: 'Golden Hour',           category: 'Color & Grade',         tech: 'WebGL',     desc: 'Amber shadow push + warm highlight + filmic rolloff' },
  { id: 'duotone',          name: 'Duotone',               category: 'Color & Grade',         tech: 'WebGL',     desc: 'Luminance mapped to two brand colors' },
  { id: 'dark-neon',        name: 'Dark Neon',             category: 'Color & Grade',         tech: 'CSS',       desc: 'Filter crush + cyan/magenta screen-blend pools' },
  { id: 'tilt-shift',       name: 'Tilt-Shift',            category: 'Lens & Depth',          tech: 'CSS',       desc: 'Backdrop-filter blur bands + gradient masks' },
  { id: 'halo-glow',        name: 'Halo Glow',             category: 'Lens & Depth',          tech: 'CSS',       desc: 'Radial screen-blend glow, dual-layer breathing' },
  { id: 'chromatic-flow',   name: 'Chromatic Flow',        category: 'Lens & Depth',          tech: 'WebGL',     desc: 'Radial RGB split breathing 0→8px over 8s' },
  { id: 'holographic',      name: 'Holographic',           category: 'Lens & Depth',          tech: 'WebGL',     desc: 'Rainbow hue from UV angle+distance, screen blend' },
  { id: 'parallax-depth',   name: 'Parallax Depth',        category: 'Lens & Depth',          tech: 'CSS',       desc: '3 video layers at different scales and drift speeds' },
  { id: 'kaleidoscope',     name: 'Kaleidoscope',          category: 'Generative & Math',     tech: 'WebGL',     desc: '8-segment radial polar mirror with slow rotation' },
  { id: 'polar-wrap',       name: 'Polar Wrap',            category: 'Generative & Math',     tech: 'WebGL',     desc: 'Rectangular→polar planet-wrap with blend-in' },
  { id: 'voronoi',          name: 'Voronoi Cells',         category: 'Generative & Math',     tech: 'WebGL',     desc: '20 drifting seed points, cell color from video' },
  { id: 'truchet',          name: 'Truchet Tiles',         category: 'Generative & Math',     tech: 'Canvas 2D', desc: '48×27 quarter-circle tile grid, 30% flip' },
  { id: 'l-system',         name: 'L-System Growth',       category: 'Generative & Math',     tech: 'Canvas 2D', desc: 'Botanical plant grows from bottom over 8s' },
  { id: 'boids',            name: 'Boids Flock',           category: 'Generative & Math',     tech: 'Canvas 2D', desc: '200 parametric agents, video-color-sampled glow' },
  { id: 'particle-field',   name: 'Particle Field',        category: 'Particle & Fluid',      tech: 'Canvas 2D', desc: '600 LCG particles sampling video colors' },
  { id: 'fluid-tint',       name: 'Fluid Tint',            category: 'Particle & Fluid',      tech: 'WebGL',     desc: 'Two-pass FBM domain warp, 4% UV displacement' },
  { id: 'reaction-diffusion', name: 'Reaction-Diffusion',  category: 'Particle & Fluid',      tech: 'WebGL',     desc: 'Gray-Scott ping-pong, Turing patterns over video' },
  { id: 'pixel-sort',       name: 'Pixel Sort',            category: 'Temporal & Glitch',     tech: 'Canvas 2D', desc: 'Row luminance sort sweeping top→bottom' },
  { id: 'vj-feedback',      name: 'VJ Feedback Tunnel',    category: 'Temporal & Glitch',     tech: 'WebGL',     desc: 'Ping-pong feedback with scale+rotation decay' },
  { id: 'orton-effect',     name: 'Orton Effect',          category: 'Fine Art Photography',  tech: 'WebGL',     desc: 'Sharp × overexposed-blur multiply, painterly glow' },
  { id: 'infrared',         name: 'Infrared Film',         category: 'Fine Art Photography',  tech: 'WebGL',     desc: 'Foliage white, skies dark, warm silver tones' },
  { id: 'long-exposure',    name: 'Long Exposure',         category: 'Fine Art Photography',  tech: 'WebGL',     desc: 'Ping-pong accumulation, moving subjects ghost to silk' },
  { id: 'cyanotype',        name: 'Cyanotype',             category: 'Historic Photography',  tech: 'WebGL',     desc: 'Prussian blue palette, S-curve, paper texture wash' },
  { id: 'daguerreotype',    name: 'Daguerreotype',         category: 'Historic Photography',  tech: 'WebGL',     desc: 'Warm silver tones, halation, grain, heavy vignette' },
  { id: 'wet-plate',        name: 'Wet Plate Collodion',   category: 'Historic Photography',  tech: 'WebGL',     desc: 'Cool silver-green, chemical spread, uneven edges' },
  { id: 'fog-depth',        name: 'Fog Depth',             category: 'Atmospheric Light',     tech: 'WebGL',     desc: 'Luminous morning mist, heavier at distance, slow breathing' },
  { id: 'rain-glass',       name: 'Rain on Glass',         category: 'Atmospheric Light',     tech: 'WebGL',     desc: '40 refracting droplets falling, window condensation' },
  { id: 'bloom-halation',   name: 'Bloom & Halation',      category: 'Atmospheric Light',     tech: 'WebGL',     desc: 'Warm amber glow bleeding from highlights' },
  { id: 'crosshatch-etch',  name: 'Cross-Hatch Etching',   category: 'Painterly',             tech: 'WebGL',     desc: '4-direction ink hatching driven by luminance' },
  { id: 'pointillist',      name: 'Pointillist',           category: 'Painterly',             tech: 'WebGL',     desc: 'Grid-cell dot sampling, dot radius varies with luminance' },
  { id: 'watercolor-bleed', name: 'Watercolor Bleed',      category: 'Painterly',             tech: 'WebGL',     desc: 'FBM-warped blur, warm desaturation, paper grain' },
  { id: 'kuwahara-aniso',   name: 'Anisotropic Kuwahara',  category: 'Painterly',             tech: 'WebGL',     desc: '4-quadrant variance min-pick, oil-paint edge smoothing' },
  { id: 'god-rays',         name: 'God Rays',              category: 'Optical Physics',       tech: 'WebGL',     desc: '64-step radial march toward animated light source' },
  { id: 'caustics',         name: 'Caustics',              category: 'Optical Physics',       tech: 'WebGL',     desc: '3-layer sine interference pattern overlaid on video' },
  { id: 'bokeh-hex',        name: 'Hexagonal Bokeh',       category: 'Optical Physics',       tech: 'WebGL',     desc: '7-tap hex blur with edge DoF + bright bloom' },
  { id: 'lens-starburst',   name: 'Lens Starburst',        category: 'Optical Physics',       tech: 'WebGL',     desc: '4-direction streak accumulation from bright highlights' },
  { id: 'prism-dispersion', name: 'Prism Dispersion',      category: 'Colorimetric',          tech: 'WebGL',     desc: 'Radial RGB channel split + rainbow edge fringe' },
  { id: 'silver-gelatin',   name: 'Silver Gelatin Print',  category: 'Colorimetric',          tech: 'WebGL',     desc: 'B&W S-curve, warm shadow/cool highlight split-tone, grain' },
  { id: 'thin-film',        name: 'Thin-Film Interference', category: 'Colorimetric',         tech: 'WebGL',     desc: 'Luminance-gradient normal + Fresnel iridescent screen blend' },
  { id: 'film-lut',         name: 'Film LUT Grade',        category: 'Colorimetric',          tech: 'WebGL',     desc: 'Kodak Vision3-style per-channel curves, teal midtones, grain' },
  { id: 'motion-smear',     name: 'Motion Smear',          category: 'Temporal & Motion',     tech: 'WebGL',     desc: 'Ping-pong accumulation trail with decay-based blend' },
  { id: 'echo-ghost',       name: 'Echo Ghost',            category: 'Temporal & Motion',     tech: 'WebGL',     desc: '3 hue-shifted ghost copies screen-blended over original' },
  { id: 'slit-scan',        name: 'Slit-Scan',             category: 'Temporal & Motion',     tech: 'WebGL',     desc: 'Per-column UV phase offset with chromatic fringing' },
  { id: 'lenticular',       name: 'Lenticular Print',      category: 'Temporal & Motion',     tech: 'WebGL',     desc: '6px lens ridges with parallax shift and color fringing' },
  { id: 'aurora',           name: 'Aurora Borealis',       category: 'Atmospheric Phenomena', tech: 'WebGL',     desc: 'FBM curtain bands (green/cyan/violet) screen-blended' },
  { id: 'bioluminescence',  name: 'Bioluminescence',       category: 'Atmospheric Phenomena', tech: 'WebGL',     desc: 'Wave-distorted deep teal + pulsing particle grid' },
  { id: 'subsurface-glow',  name: 'Subsurface Glow',       category: 'Atmospheric Phenomena', tech: 'WebGL',     desc: '3-scale Gaussian SSS with warm amber tint + rim light' },
  { id: 'volumetric-mie',   name: 'Volumetric Mie',        category: 'Atmospheric Phenomena', tech: 'WebGL',     desc: 'Depth-from-luminance haze + animated Mie forward-scatter' },
];

const CATEGORIES = ['All', ...Array.from(new Set(EFFECTS.map(e => e.category)))];
const DURATION = 8;

function techClass(tech: Tech): string {
  if (tech === 'WebGL') return 'text-cyan-300/70 bg-cyan-400/[0.08] border-cyan-400/20';
  if (tech === 'Canvas 2D') return 'text-amber-300/70 bg-amber-400/[0.08] border-amber-400/20';
  return 'text-purple-300/70 bg-purple-400/[0.08] border-purple-400/20';
}

const VIDEO_SOURCES = [
  { label: 'Demo clip 1', value: '/demos/clip_87917E3C-F22E-4802-A672-B13A6A92AEC5.mp4' },
  { label: 'Demo clip 2', value: '/demos/clip_EF0AC3A4-9F5B-4A9C-88AD-24D3E26128AA.mp4' },
  { label: 'Test pattern', value: '/assets/sample.mp4' },
];

const MUSIC_TRACKS = [
  { label: 'First Frame',      value: '/tracks/generated/music-rev-moxsk15y.mp3' },
  { label: 'Agent Anthem',     value: '/tracks/generated/01-agent-anthem.mp3' },
  { label: 'Prompt Wanderer',  value: '/tracks/generated/02-prompt-wanderer.mp3' },
  { label: 'Tokyo Drift',      value: '/tracks/generated/tokyo-dript-rev-mox44b77.mp3' },
  { label: 'Tokyo Night Flow', value: '/tracks/generated/tokyo-night-flow-rev-mox4uzx0.mp3' },
  { label: 'Pulse Rev',        value: '/tracks/generated/music-rev-mox4mlqg.mp3' },
];

// ─── EffectPreview ────────────────────────────────────────────────────────────

export interface PreviewHandle {
  seekTo: (t: number) => void;
  setParam: (name: string, value: number | string | boolean) => void;
  captureStream: (fps: number) => MediaStream | null;
}

interface PreviewProps {
  effectId: string;
  videoSrc: string;
  width: number;
}

export const EffectPreview = forwardRef<PreviewHandle, PreviewProps>(
  function EffectPreview({ effectId, videoSrc, width }, ref) {
    const scale = width / 1920;
    const height = Math.round(1080 * scale);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const readyRef = useRef(false);

    const injectVideo = useCallback((src: string) => {
      try {
        const video = iframeRef.current?.contentDocument?.getElementById('bg-video') as HTMLVideoElement | null;
        if (video) {
          video.src = src;
          video.loop = true;
          video.muted = true;
          video.load();
          video.play().catch(() => {});
        }
      } catch { /* same-origin, but guard anyway */ }
    }, []);

    useImperativeHandle(ref, () => ({
      seekTo(t: number) {
        if (!readyRef.current) return;
        try {
          const ifrWin = iframeRef.current?.contentWindow as Record<string, unknown> | null;
          const tls = ifrWin?.__timelines as Record<string, { seek(t: number, suppressEvents: boolean): void }> | undefined;
          if (tls) {
            const tl = Object.values(tls)[0];
            tl?.seek(t, false);
          }
        } catch { /* noop */ }
      },
      setParam(name: string, value: number | string | boolean) {
        try {
          iframeRef.current?.contentWindow?.postMessage({ type: 'fx-param', name, value }, '*');
        } catch { /* noop */ }
      },
      captureStream(fps: number): MediaStream | null {
        try {
          const canvas = iframeRef.current?.contentDocument?.getElementById('fx-canvas') as HTMLCanvasElement | null;
          if (!canvas) return null;
          return (canvas as unknown as { captureStream(fps: number): MediaStream }).captureStream(fps);
        } catch { return null; }
      },
    }), []);

    const handleLoad = useCallback(() => {
      readyRef.current = true;
      injectVideo(videoSrc);
    }, [injectVideo, videoSrc]);

    useEffect(() => {
      if (readyRef.current) injectVideo(videoSrc);
    }, [injectVideo, videoSrc]);

    return (
      <div
        className="relative overflow-hidden rounded-sm bg-black shrink-0"
        style={{ width, height }}
      >
        <iframe
          key={effectId}
          ref={iframeRef}
          src={`/fx/${effectId}/index.html`}
          title={effectId}
          scrolling="no"
          onLoad={handleLoad}
          style={{
            width: 1920,
            height: 1080,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }
);

// ─── PreviewHud ───────────────────────────────────────────────────────────────

function PreviewHud({ effectId, exporting }: { effectId: string; exporting: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 3px)',
          backgroundSize: '100% 3px',
        }}
      />
      {/* Radial vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
      />
      {/* Corner brackets */}
      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400/40" />
      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400/40" />
      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400/40" />
      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400/40" />
      {/* Effect ID */}
      <div className="absolute top-3 inset-x-0 flex justify-center">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400/40">{effectId}</span>
      </div>
      {/* Resolution */}
      <div className="absolute bottom-3 left-8">
        <span className="text-[8px] font-mono text-white/18">1920 × 1080</span>
      </div>
      {/* FPS */}
      <div className="absolute bottom-3 right-8">
        <span className="text-[8px] font-mono text-white/18">30 fps</span>
      </div>
      {/* REC */}
      {exporting && (
        <div className="absolute top-3 right-8 flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[8px] font-mono text-red-400/80 uppercase tracking-wider">REC</span>
        </div>
      )}
    </div>
  );
}

// ─── WaveformStrip ────────────────────────────────────────────────────────────

function WaveformStrip({ analyserRef, active }: { analyserRef: React.RefObject<AnalyserNode | null>; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.clientWidth || 640;
      const H = 32;
      if (canvas.width !== W) canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      if (active && analyserRef.current) {
        const analyser = analyserRef.current;
        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);
        const barCount = 64;
        const barW = W / barCount;
        const step = Math.floor(bufLen / barCount);
        for (let i = 0; i < barCount; i++) {
          const val = data[i * step] / 255;
          const barH = Math.max(1, val * H * 0.9);
          const alpha = 0.15 + val * 0.75;
          ctx.fillStyle = `rgba(34,211,238,${alpha})`;
          ctx.fillRect(i * barW + 1, H - barH, Math.max(1, barW - 2), barH);
        }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [active, analyserRef]);

  return <canvas ref={canvasRef} className="w-full h-8 shrink-0 block bg-black/30" />;
}

// ─── MusicBar ─────────────────────────────────────────────────────────────────

function MusicBar({
  musicUrl,
  musicVolume,
  onMusicChange,
  onVolumeChange,
}: {
  musicUrl: string | null;
  musicVolume: number;
  onMusicChange: (url: string | null) => void;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <div className="shrink-0 border-t border-white/[0.04] bg-black/10 flex items-center gap-3 px-4 py-2">
      <Music2 size={11} className="text-white/25 shrink-0" />
      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 shrink-0">Music</span>
      <div className="relative flex-1 min-w-0">
        <select
          value={musicUrl ?? ''}
          onChange={e => onMusicChange(e.target.value || null)}
          className="w-full appearance-none bg-white/[0.03] border border-white/[0.06] rounded-sm pl-2 pr-6 py-1 text-[10px] font-mono text-white/45 outline-none focus:border-cyan-400/20 cursor-pointer"
        >
          <option value="">— no track —</option>
          {MUSIC_TRACKS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
      </div>
      <div className="flex items-center gap-2 shrink-0 w-[90px]">
        <Volume2 size={10} className="text-white/25 shrink-0" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={musicVolume}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          className="flex-1 h-1 appearance-none bg-white/[0.1] rounded-full accent-cyan-400 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ─── TimelinePlayer ───────────────────────────────────────────────────────────

function fmt(t: number) {
  const s = Math.floor(t);
  const ms = Math.floor((t - s) * 10);
  return `${s}.${ms}`;
}

interface TimelinePlayerProps {
  currentTime: number;
  duration: number;
  playing: boolean;
  effectName: string;
  effectTech: Tech;
  effectDesc: string;
  videoSrc: string;
  videoSources: typeof VIDEO_SOURCES;
  staged: boolean;
  canStage: boolean;
  exporting: boolean;
  exportProgress: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onScrub: (t: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onVideoSrcChange: (src: string) => void;
  onStageToggle: () => void;
  onExport: () => void;
  onShowShortcuts: () => void;
}

function TimelinePlayer({
  currentTime,
  duration,
  playing,
  effectName,
  effectTech,
  effectDesc,
  videoSrc,
  videoSources,
  staged,
  canStage,
  exporting,
  exportProgress,
  onPlayPause,
  onRestart,
  onScrub,
  onScrubStart,
  onScrubEnd,
  onVideoSrcChange,
  onStageToggle,
  onExport,
  onShowShortcuts,
}: TimelinePlayerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);

  const posFromEvent = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubbingRef.current = true;
    onScrubStart();
    onScrub(posFromEvent(e));
  }, [onScrub, onScrubStart, posFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    onScrub(posFromEvent(e));
  }, [onScrub, posFromEvent]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    onScrub(posFromEvent(e));
    onScrubEnd();
  }, [onScrub, onScrubEnd, posFromEvent]);

  const pct = (currentTime / duration) * 100;
  const ticks = Array.from({ length: Math.floor(duration / 2) + 1 }, (_, i) => i * 2);

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-black/20 flex flex-col">
      {/* Effect info row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[8px] font-mono uppercase tracking-wider text-cyan-400/30 shrink-0">FX</span>
          <span className="text-[13px] font-medium text-white/80 truncate">{effectName}</span>
          <span className={`shrink-0 text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${techClass(effectTech)}`}>
            {effectTech}
          </span>
        </div>
        <span className="text-[10px] text-white/30 truncate hidden xl:block">{effectDesc}</span>

        {/* Video source */}
        <div className="relative shrink-0">
          <select
            value={videoSrc}
            onChange={e => onVideoSrcChange(e.target.value)}
            className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-sm pl-2.5 pr-6 py-1 text-[10px] font-mono text-white/50 outline-none focus:border-cyan-400/30 cursor-pointer"
          >
            {videoSources.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
          <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        </div>

        {/* Stage */}
        <button
          onClick={onStageToggle}
          disabled={!staged && !canStage}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
            staged
              ? 'bg-cyan-400/[0.15] border-cyan-400/35 text-cyan-200 hover:bg-cyan-400/[0.08]'
              : !canStage
              ? 'bg-white/[0.02] border-white/[0.05] text-white/20 cursor-not-allowed'
              : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-cyan-400/[0.08] hover:border-cyan-400/20 hover:text-cyan-300'
          }`}
        >
          {staged ? <><X size={9} />Unstage</> : <><Plus size={9} />Stage</>}
        </button>
      </div>

      {/* Timeline scrubber */}
      <div className="px-4 pb-1">
        {/* Tick marks */}
        <div className="relative h-3 mb-0.5">
          {ticks.map(t => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${(t / duration) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-1.5 bg-white/[0.12]" />
              <span className="text-[8px] font-mono text-white/20">{t}s</span>
            </div>
          ))}
          <div
            className="absolute top-0 w-px h-1.5 bg-cyan-400/60 pointer-events-none"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
          />
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-5 flex items-center cursor-pointer group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="absolute inset-x-0 h-[3px] rounded-full bg-white/[0.08] group-hover:bg-white/[0.12] transition-colors" />
          <div
            className="absolute left-0 h-[3px] rounded-full bg-cyan-400/60 group-hover:bg-cyan-400/80 transition-colors"
            style={{ width: `${pct}%` }}
          />
          {/* Export progress overlay */}
          {exporting && (
            <div
              className="absolute left-0 h-[3px] rounded-full bg-red-400/60 pointer-events-none"
              style={{ width: `${exportProgress * 100}%` }}
            />
          )}
          <div
            className="absolute w-3 h-3 rounded-full bg-cyan-300 border-2 border-black/50 shadow-sm -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      {/* Transport controls row */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          onClick={onRestart}
          className="p-1.5 rounded text-white/35 hover:text-white/65 hover:bg-white/[0.05] transition-colors"
          title="Restart"
        >
          <SkipBack size={13} />
        </button>

        <button
          onClick={onPlayPause}
          className="flex items-center justify-center w-7 h-7 rounded bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white transition-colors"
        >
          {playing ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
        </button>

        <div className="flex items-baseline gap-0.5 ml-1 min-w-[70px]">
          <span className="text-[11px] font-mono text-white/65 tabular-nums">{fmt(currentTime)}</span>
          <span className="text-[10px] font-mono text-white/20">/</span>
          <span className="text-[10px] font-mono text-white/25 tabular-nums">{duration}.0</span>
          <span className="text-[9px] font-mono text-white/20 ml-0.5">s</span>
        </div>

        <div className="flex items-center gap-1 ml-1">
          <RotateCcw size={9} className="text-white/20" />
          <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">loop</span>
        </div>

        {/* Export + shortcuts */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onExport}
            disabled={exporting}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
              exporting
                ? 'bg-red-400/[0.12] border-red-400/30 text-red-300/80 cursor-not-allowed animate-pulse'
                : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/65'
            }`}
          >
            {exporting
              ? <><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />REC</>
              : <><Download size={9} />Export</>
            }
          </button>
          <button
            onClick={onShowShortcuts}
            className="p-1 rounded text-white/20 hover:text-white/55 hover:bg-white/[0.05] transition-colors"
            title="Keyboard shortcuts (?)"
          >
            <HelpCircle size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compare modal ────────────────────────────────────────────────────────────

function CompareModal({
  effects,
  videoSrc,
  onClose,
}: {
  effects: FxEffect[];
  videoSrc: string;
  onClose: () => void;
}) {
  const cols = effects.length <= 2 ? effects.length : 2;
  const cellW = Math.min(900, Math.floor((window.innerWidth - 80 - (cols - 1) * 16) / cols));
  const previewRefs = useRef<(PreviewHandle | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const startWallRef = useRef(performance.now());

  useEffect(() => {
    function tick() {
      const elapsed = (performance.now() - startWallRef.current) / 1000;
      const t = elapsed % DURATION;
      previewRefs.current.forEach(h => h?.seekTo(t));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/96">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan-400/70" />
          <span className="text-[12px] font-mono uppercase tracking-wider text-white/55">
            Compare — {effects.length} effects
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, ${cellW}px)` }}
        >
          {effects.map((fx, i) => (
            <div key={fx.id} className="flex flex-col gap-2">
              <EffectPreview
                ref={el => { previewRefs.current[i] = el; }}
                effectId={fx.id}
                videoSrc={videoSrc}
                width={cellW}
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-white/60">{fx.name}</span>
                <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border ${techClass(fx.tech)}`}>
                  {fx.tech}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ParamsPanel ──────────────────────────────────────────────────────────────

type ParamValues = Record<string, number | string | boolean>;

function ParamsPanel({
  effectId,
  params,
  onChange,
}: {
  effectId: string;
  params: ParamValues;
  onChange: (name: string, value: number | string | boolean) => void;
}) {
  const defs: ParamDef[] = FX_PARAMS[effectId] ?? [];

  if (defs.length === 0) {
    return (
      <div className="w-[170px] shrink-0 border-l border-white/[0.06] flex flex-col">
        <div className="px-3 py-2.5 border-b border-white/[0.06]">
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25">Parameters</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/18 text-center px-4">No adjustable parameters</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[170px] shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25">Parameters</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar py-2 px-3 flex flex-col gap-4">
        {defs.map(def => {
          const val = params[def.name] ?? def.default;
          return (
            <div key={def.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/55">{def.label}</span>
                {def.type === 'range' && (
                  <span className="text-[9px] font-mono text-white/30 tabular-nums">
                    {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(def.step && def.step < 0.01 ? 3 : def.step && def.step < 0.1 ? 2 : 1)) : val}
                  </span>
                )}
              </div>

              {def.type === 'range' && (
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={val as number}
                  onChange={e => onChange(def.name, parseFloat(e.target.value))}
                  className="w-full h-1 appearance-none bg-white/[0.1] rounded-full accent-cyan-400 cursor-pointer"
                />
              )}

              {def.type === 'select' && (
                <div className="relative">
                  <select
                    value={val as string}
                    onChange={e => onChange(def.name, e.target.value)}
                    className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-sm pl-2 pr-5 py-1 text-[10px] font-mono text-white/60 outline-none focus:border-cyan-400/30 cursor-pointer"
                  >
                    {def.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                </div>
              )}

              {def.type === 'color' && (
                <input
                  type="color"
                  value={val as string}
                  onChange={e => onChange(def.name, e.target.value)}
                  className="w-full h-7 rounded cursor-pointer bg-transparent border border-white/[0.08]"
                />
              )}

              {def.type === 'toggle' && (
                <button
                  onClick={() => onChange(def.name, !(val as boolean))}
                  className={`w-9 h-5 rounded-full border transition-colors relative ${
                    val ? 'bg-cyan-400/30 border-cyan-400/40' : 'bg-white/[0.06] border-white/[0.1]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                      val ? 'bg-cyan-300 translate-x-4' : 'bg-white/40 translate-x-0.5'
                    }`}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.06] px-3 py-2">
        <button
          onClick={() => {
            defs.forEach(d => onChange(d.name, d.default));
          }}
          className="w-full flex items-center justify-center gap-1 py-1 rounded text-[9px] font-mono uppercase tracking-wider text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
        >
          <RotateCcw size={8} />
          Reset
        </button>
      </div>
    </div>
  );
}

// ─── ShortcutOverlay ──────────────────────────────────────────────────────────

const SHORTCUTS = [
  { keys: ['Space'],          label: 'Play / Pause' },
  { keys: ['R'],              label: 'Restart' },
  { keys: ['↑', 'K'],        label: 'Previous effect' },
  { keys: ['↓', 'J'],        label: 'Next effect' },
  { keys: ['←', 'H'],        label: 'Previous category' },
  { keys: ['→', 'L'],        label: 'Next category' },
  { keys: ['S'],              label: 'Stage / unstage' },
  { keys: ['E'],              label: 'Export preview' },
  { keys: ['M'],              label: 'Mute / unmute music' },
  { keys: ['0–5'],            label: 'Select music track' },
  { keys: ['/'],              label: 'Focus search' },
  { keys: ['Esc'],            label: 'Clear search' },
  { keys: ['?'],              label: 'Toggle shortcuts' },
];

function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-sm shadow-2xl p-5 w-[320px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Keyboard Shortcuts</span>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors">
            <X size={12} />
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {SHORTCUTS.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[11px] text-white/55">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd
                    key={k}
                    className="text-[9px] font-mono text-cyan-300/70 bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5 leading-none"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FxBrowser ────────────────────────────────────────────────────────────────

export function FxBrowser() {
  const { fxSelectedId: selectedId, setFxSelectedId: setSelectedId, fxParams: params } = useFx();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [staged, setStaged] = useState<string[]>([]);
  const [videoSrc, setVideoSrc] = useState(VIDEO_SOURCES[0].value);
  const [comparing, setComparing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // Music state
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.7);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const previewRef = useRef<PreviewHandle>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [previewWidth, setPreviewWidth] = useState(640);

  const rafRef = useRef<number | null>(null);
  const startWallRef = useRef(0);
  const startTimeRef = useRef(0);
  const isScrubbing = useRef(false);

  // Audio refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Resize observer
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setPreviewWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Web Audio setup — lazy init on first track selection
  const initAudio = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  // Play/pause audio in sync with isPlaying
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicUrl) return;
    if (isPlaying) {
      initAudio();
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, musicUrl, initAudio]);

  // Update src when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicUrl) {
      audio.src = musicUrl;
      audio.volume = musicVolume;
      audio.load();
      if (isPlaying) {
        initAudio();
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  // rAF loop
  const stopLoop = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startLoop = useCallback((fromTime = currentTime) => {
    stopLoop();
    startWallRef.current = performance.now();
    startTimeRef.current = fromTime;

    function tick() {
      if (isScrubbing.current) { rafRef.current = requestAnimationFrame(tick); return; }
      const elapsed = (performance.now() - startWallRef.current) / 1000;
      const t = (startTimeRef.current + elapsed) % DURATION;
      setCurrentTime(t);
      previewRef.current?.seekTo(t);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [currentTime, stopLoop]);

  useEffect(() => {
    if (isPlaying) startLoop(currentTime);
    else stopLoop();
    return stopLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Restart on effect change
  useEffect(() => {
    setCurrentTime(0);
    startTimeRef.current = 0;
    startWallRef.current = performance.now();
  }, [selectedId]);

  // Sync params to iframe
  useEffect(() => {
    Object.entries(params).forEach(([name, value]) => {
      previewRef.current?.setParam(name, value);
    });
  }, [params]);

  const handlePlayPause = useCallback(() => setIsPlaying(p => !p), []);
  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    startWallRef.current = performance.now();
    startTimeRef.current = 0;
    previewRef.current?.seekTo(0);
    if (!isPlaying) setIsPlaying(true);
  }, [isPlaying]);

  const handleScrubStart = useCallback(() => {
    isScrubbing.current = true;
    if (isPlaying) stopLoop();
  }, [isPlaying, stopLoop]);

  const handleScrub = useCallback((t: number) => {
    setCurrentTime(t);
    previewRef.current?.seekTo(t);
  }, []);

  const handleScrubEnd = useCallback(() => {
    isScrubbing.current = false;
    if (isPlaying) startLoop(currentTime);
  }, [isPlaying, startLoop, currentTime]);

  const toggleStaged = useCallback((id: string) => {
    setStaged(prev => prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 4 ? [...prev, id] : prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Always-on shortcuts (work even in inputs)
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        setSearch('');
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (e.key === '?' && !inInput) { e.preventDefault(); setShowShortcuts(v => !v); return; }

      if (inInput) return;

      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); return; }
      if (e.key === 'r' || e.key === 'R') {
        setCurrentTime(0); startWallRef.current = performance.now(); startTimeRef.current = 0;
        previewRef.current?.seekTo(0); setIsPlaying(true); return;
      }
      if (e.key === '/' ) { e.preventDefault(); searchRef.current?.focus(); return; }

      // Effect navigation
      if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setIsPlaying(prev => { // use functional update to avoid stale closure
          return prev;
        });
        setCategory(cat => {
          const list = EFFECTS.filter(fx =>
            (cat === 'All' || fx.category === cat)
          );
          const idx = list.findIndex(fx => fx.id === selectedId);
          if (idx > 0) setSelectedId(list[idx - 1].id);
          return cat;
        });
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setCategory(cat => {
          const list = EFFECTS.filter(fx =>
            (cat === 'All' || fx.category === cat)
          );
          const idx = list.findIndex(fx => fx.id === selectedId);
          if (idx < list.length - 1) setSelectedId(list[idx + 1].id);
          return cat;
        });
        return;
      }

      // Category navigation
      if (e.key === 'ArrowLeft' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setCategory(cat => {
          const idx = CATEGORIES.indexOf(cat);
          return idx > 0 ? CATEGORIES[idx - 1] : cat;
        });
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setCategory(cat => {
          const idx = CATEGORIES.indexOf(cat);
          return idx < CATEGORIES.length - 1 ? CATEGORIES[idx + 1] : cat;
        });
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        setStaged(prev =>
          prev.includes(selectedId)
            ? prev.filter(id => id !== selectedId)
            : prev.length < 4 ? [...prev, selectedId] : prev
        );
        return;
      }
      if ((e.key === 'e' || e.key === 'E') && !exporting) {
        // trigger export — handled via ref to avoid stale closure
        exportTriggerRef.current?.();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        const audio = audioRef.current;
        if (audio) audio.muted = !audio.muted;
        return;
      }
      // Music track select: 0 = no track, 1–5 = tracks
      if (e.key >= '0' && e.key <= '9') {
        const n = parseInt(e.key);
        if (n === 0) setMusicUrl(null);
        else if (n <= MUSIC_TRACKS.length) setMusicUrl(MUSIC_TRACKS[n - 1].value);
        return;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, exporting, showShortcuts]);

  // Stable ref so export shortcut can call handleExport without stale closure
  const exportTriggerRef = useRef<(() => void) | null>(null);

  // Quick export
  const handleExport = useCallback(() => {
    const stream = previewRef.current?.captureStream(30);
    if (!stream) return;

    // Merge audio into stream if playing
    if (audioRef.current && musicUrl && audioCtxRef.current) {
      try {
        const dest = audioCtxRef.current.createMediaStreamDestination();
        sourceRef.current?.connect(dest);
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch { /* audio merge optional */ }
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedId}-preview.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExportProgress(0);
    };

    setExporting(true);
    setExportProgress(0);
    handleRestart();
    recorder.start();

    const startMs = Date.now();
    const totalMs = DURATION * 1000 + 500;
    const progressInterval = setInterval(() => {
      setExportProgress(Math.min(1, (Date.now() - startMs) / totalMs));
    }, 100);

    setTimeout(() => {
      clearInterval(progressInterval);
      recorder.stop();
    }, totalMs);
  }, [selectedId, musicUrl, handleRestart]);

  // Keep export trigger ref in sync
  useEffect(() => { exportTriggerRef.current = handleExport; }, [handleExport]);

  const filtered = useMemo(() => {
    let list = EFFECTS;
    if (category !== 'All') list = list.filter(e => e.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => `${e.name} ${e.id} ${e.category} ${e.desc}`.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  const selected = EFFECTS.find(e => e.id === selectedId) ?? EFFECTS[0];
  const stagedEffects = staged.map(id => EFFECTS.find(e => e.id === id)!).filter(Boolean);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { All: EFFECTS.length };
    EFFECTS.forEach(e => { m[e.category] = (m[e.category] ?? 0) + 1; });
    return m;
  }, []);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Hidden audio element */}
      <audio ref={audioRef} loop />

      {/* Shortcut overlay */}
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <aside
        className="w-[175px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar py-2">
          <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.15em] text-white/25">Category</div>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                category === cat
                  ? 'bg-white/[0.06] text-white/85'
                  : 'text-white/40 hover:bg-white/[0.03] hover:text-white/60'
              }`}
            >
              <span className="text-[11px] truncate">{cat}</span>
              <span className="text-[9px] font-mono text-white/22 shrink-0 ml-1">{categoryCounts[cat] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Stage panel */}
        <div className="border-t border-white/[0.06] p-2">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Layers size={10} className="text-white/30" />
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/28">
              Stage{staged.length > 0 ? ` ${staged.length}/4` : ''}
            </span>
          </div>
          {staged.length === 0 ? (
            <div className="px-1 text-[9px] font-mono text-white/18 leading-relaxed">
              Add effects to compare side by side
            </div>
          ) : (
            <div className="flex flex-col gap-1 mb-2">
              {stagedEffects.map(fx => (
                <div key={fx.id} className="flex items-center gap-1.5 rounded bg-white/[0.04] border border-white/[0.06] px-2 py-1">
                  <span className="flex-1 text-[10px] text-white/55 truncate min-w-0">{fx.name}</span>
                  <button onClick={() => toggleStaged(fx.id)} className="text-white/22 hover:text-white/55 transition-colors">
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {staged.length >= 2 && (
            <button
              onClick={() => setComparing(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-cyan-400/[0.1] border border-cyan-400/25 text-[9px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/[0.15] transition-colors"
            >
              <LayoutGrid size={10} />
              Compare
            </button>
          )}
        </div>
      </aside>

      {/* ── Effect list ──────────────────────────────────────────── */}
      <div className="w-[235px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-white/[0.06]">
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search effects… (/)"
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-white/70 placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-colors"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar p-1.5">
          <div className="flex flex-col gap-0.5">
            {filtered.map(fx => (
              <button
                key={fx.id}
                onClick={() => setSelectedId(fx.id)}
                className={`w-full text-left rounded px-2.5 py-2 transition-colors border ${
                  fx.id === selectedId
                    ? 'bg-white/[0.07] border-l-2 border-l-cyan-400/50 border-white/[0.12] text-white/90 shadow-[0_0_12px_rgba(34,211,238,0.08)]'
                    : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.07] text-white/55'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <span className="flex-1 min-w-0 text-[11px] leading-snug truncate">{fx.name}</span>
                  {staged.includes(fx.id) && (
                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.5 rounded border ${techClass(fx.tech)}`}>
                    {fx.tech === 'Canvas 2D' ? 'Canvas' : fx.tech}
                  </span>
                  <span className="text-[9px] font-mono text-white/22 truncate">{fx.category}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-[11px] font-mono text-white/20">No effects found</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview + player ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Preview canvas */}
        <div
          ref={previewContainerRef}
          className="flex-1 min-h-0 relative flex items-center justify-center bg-[#050507] p-4"
        >
          {previewWidth > 0 && (
            <EffectPreview
              key={selectedId}
              ref={previewRef}
              effectId={selectedId}
              videoSrc={videoSrc}
              width={previewWidth}
            />
          )}
          <PreviewHud effectId={selectedId} exporting={exporting} />
        </div>

        {/* Waveform strip */}
        <WaveformStrip analyserRef={analyserRef} active={musicUrl !== null} />

        {/* Timeline player */}
        <TimelinePlayer
          currentTime={currentTime}
          duration={DURATION}
          playing={isPlaying}
          effectName={selected.name}
          effectTech={selected.tech}
          effectDesc={selected.desc}
          videoSrc={videoSrc}
          videoSources={VIDEO_SOURCES}
          staged={staged.includes(selectedId)}
          canStage={staged.length < 4}
          exporting={exporting}
          exportProgress={exportProgress}
          onPlayPause={handlePlayPause}
          onRestart={handleRestart}
          onScrub={handleScrub}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          onVideoSrcChange={setVideoSrc}
          onStageToggle={() => toggleStaged(selectedId)}
          onExport={handleExport}
          onShowShortcuts={() => setShowShortcuts(v => !v)}
        />

        {/* Music bar */}
        <MusicBar
          musicUrl={musicUrl}
          musicVolume={musicVolume}
          onMusicChange={setMusicUrl}
          onVolumeChange={setMusicVolume}
        />
      </div>

      {/* Compare modal */}
      {comparing && (
        <CompareModal
          effects={stagedEffects}
          videoSrc={videoSrc}
          onClose={() => setComparing(false)}
        />
      )}
    </div>
  );
}
