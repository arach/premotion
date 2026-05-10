'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Film, ListMusic, Maximize2, Minimize2, Music2, Pause, Play, PictureInPicture2, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { usePlayer, type Media } from '../PlayerContext';
import { useCatalog } from '../Provider';
import { formatDuration } from '@/lib/types';
import { resolveVideoSrc } from '@/lib/media';

interface DocPip {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
}

function getDocPip(): DocPip | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { documentPictureInPicture?: DocPip };
  return w.documentPictureInPicture ?? null;
}

function useDocPip(): {
  supported: boolean;
  pipWindow: Window | null;
  toggle: () => Promise<void>;
} {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const supported = !!getDocPip();

  const toggle = useCallback(async () => {
    const api = getDocPip();
    if (!api) return;
    if (pipWindow) { pipWindow.close(); setPipWindow(null); return; }
    try {
      const w = await api.requestWindow({ width: 380, height: 320 });
      // Mirror parent stylesheets so the panel renders the same.
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          const rules = sheet.cssRules;
          const style = w.document.createElement('style');
          style.textContent = Array.from(rules).map(r => r.cssText).join('\n');
          w.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = w.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            w.document.head.appendChild(link);
          }
        }
      });
      w.document.body.style.margin = '0';
      w.document.body.style.background = 'rgb(12,12,16)';
      w.document.body.style.color = '#ededed';
      w.document.body.style.fontFamily = 'system-ui, sans-serif';
      w.document.body.style.fontSize = '13px';
      const onClose = () => setPipWindow(null);
      w.addEventListener('pagehide', onClose);
      setPipWindow(w);
    } catch {
      // user denied or feature unavailable
    }
  }, [pipWindow]);

  return { supported, pipWindow, toggle };
}

function useLocalState(key: string, init: number): [number, (v: number) => void] {
  const [val, setVal] = useState<number>(() => {
    try { const s = localStorage.getItem(key); return s ? parseFloat(s) : init; } catch { return init; }
  });
  const set = (v: number) => { setVal(v); try { localStorage.setItem(key, String(v)); } catch {} };
  return [val, set];
}

const STATUS_H = 28;
const PANEL_BOTTOM = STATUS_H;
const MIN_H = 120;
const ACCENT = 'rgb(34,211,238)';
const ACCENT_DIM = 'rgba(34,211,238,0.08)';
const ACCENT_BORDER = 'rgba(34,211,238,0.3)';
const BG = 'rgb(12,12,16)';
const BORDER = 'rgba(255,255,255,0.06)';

function mediaTitle(media: ReturnType<typeof usePlayer>['media']): string {
  if (!media) return '';
  if (media.kind === 'audio') return media.asset.songTitle || media.asset.id;
  return media.video.id;
}

function VideoStage() {
  const { attachStage, togglePip, isPip, pipSupported } = usePlayer();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    attachStage(ref.current);
    return () => attachStage(null);
  }, [attachStage]);
  return (
    <div className="shrink-0 relative bg-black w-full group" style={{ aspectRatio: '16 / 9' }}>
      <div ref={ref} className="absolute inset-0" />
      {pipSupported && (
        <button
          onClick={togglePip}
          className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
          title={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
        >
          <PictureInPicture2 size={12} />
        </button>
      )}
    </div>
  );
}

function VolumeControl() {
  const { volume, setVolume } = usePlayer();
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
        className="p-0.5 rounded transition-colors hover:bg-white/[0.06]"
        style={{ color: 'rgba(255,255,255,0.45)' }}
        title="Mute (M)"
      >
        <VolumeIcon size={12} />
      </button>
      <input type="range" min={0} max={1} step={0.02} value={volume}
        onChange={e => setVolume(parseFloat(e.target.value))}
        className="w-20 h-1 cursor-pointer" style={{ accentColor: ACCENT }} />
    </div>
  );
}

function CenterTransport() {
  const {
    media, playing, currentTime, duration,
    togglePlay, seek, next, prev, queue,
  } = usePlayer();
  if (!media) return null;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const title = mediaTitle(media);
  const KindIcon = media.kind === 'video' ? Film : Music2;
  const hasQueue = queue.length > 1;

  return (
    <div className="flex-1 flex flex-col gap-2 px-4 py-3 min-w-0">
      {/* Title + meta block */}
      <div className="flex items-baseline gap-2 min-w-0">
        <KindIcon size={11} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
        <span className="text-[12px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {title}
        </span>
        {media.kind === 'audio' && media.asset.app && (
          <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
            · {media.asset.app}
          </span>
        )}
        {media.kind === 'video' && media.video.app && (
          <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
            · {media.video.app}
          </span>
        )}
      </div>

      {/* Transport — centered prev / play / next */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={prev}
          disabled={!hasQueue && currentTime < 3}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.06] text-white/55 hover:text-white/85 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          title="Previous (P)"
        >
          <SkipBack size={13} fill="currentColor" />
        </button>
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
        >
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="translate-x-[1px]" />}
        </button>
        <button
          onClick={next}
          disabled={!hasQueue}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/[0.06] text-white/55 hover:text-white/85 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          title="Next (N)"
        >
          <SkipForward size={13} fill="currentColor" />
        </button>
      </div>

      {/* Scrubber + time labels */}
      <div className="flex flex-col gap-1">
        <div
          className="relative h-1 rounded-full cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * duration); }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: 'rgba(34,211,238,0.7)' }} />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function LeftRail() {
  // Placeholder for future playlist / category navigation.
  return (
    <div
      className="shrink-0 w-12 border-r flex items-start justify-center pt-3"
      style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.15)' }}
      title="Playlists (coming soon)"
    >
      <ListMusic size={13} />
    </div>
  );
}

function RightRail() {
  const { shuffle, repeat, toggleShuffle, cycleRepeat } = usePlayer();
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const repeatLabel = repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one';
  return (
    <div
      className="shrink-0 w-12 border-l flex flex-col items-center justify-center gap-2"
      style={{ borderColor: BORDER }}
    >
      <button
        onClick={toggleShuffle}
        className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-white/[0.06]"
        style={{ color: shuffle ? ACCENT : 'rgba(255,255,255,0.35)' }}
        title={shuffle ? 'Shuffle on' : 'Shuffle off'}
      >
        <Shuffle size={13} />
      </button>
      <button
        onClick={cycleRepeat}
        className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-white/[0.06]"
        style={{ color: repeat === 'off' ? 'rgba(255,255,255,0.35)' : ACCENT }}
        title={repeatLabel}
      >
        <RepeatIcon size={13} />
      </button>
    </div>
  );
}

function QueueList() {
  const { media, history, playMedia, logVideo } = usePlayer();
  const { data, videoId } = useCatalog();

  const prevVideoId = useRef<string | null>(null);
  useEffect(() => {
    if (videoId && videoId !== prevVideoId.current) {
      const video = data?.videos.find(v => v.id === videoId);
      if (video) logVideo(videoId, video.id);
    }
    prevVideoId.current = videoId;
  }, [videoId, data, logVideo]);

  const audioAssets = data?.audioAssets ?? [];
  const hasHistory = history.length > 0;
  // The displayed list, materialized as playable Media so clicking sets it as the active queue.
  const playable: Media[] = hasHistory
    ? history.flatMap<Media>(h => {
        if (h.kind === 'audio') return [{ kind: 'audio', asset: h.asset }];
        const v = data?.videos.find(x => x.id === h.id);
        if (!v) return [];
        const src = resolveVideoSrc(v);
        if (!src) return [];
        return [{ kind: 'video', video: v, src }];
      })
    : audioAssets.map(a => ({ kind: 'audio', asset: a }));

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="px-3 pt-2 pb-1">
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {hasHistory ? 'Recently played' : 'Music library'}
        </span>
      </div>
      {playable.map((item, i) => {
        if (item.kind === 'audio') {
          const isActive = media?.kind === 'audio' && media.asset.id === item.asset.id;
          return (
            <button key={item.asset.id + i} onClick={() => playMedia(item, { queue: playable, index: i })}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
              style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.55)' }}>
              <Music2 size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
              <span className="flex-1 text-[11px] truncate">{item.asset.songTitle || item.asset.id}</span>
              {item.asset.duration > 0 && (
                <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {formatDuration(item.asset.duration)}
                </span>
              )}
            </button>
          );
        }
        const isActive = media?.kind === 'video' && media.video.id === item.video.id;
        return (
          <button key={item.video.id + i} onClick={() => playMedia(item, { queue: playable, index: i })}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
            style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.45)' }}>
            <Film size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span className="flex-1 text-[11px] truncate">{item.video.id}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusBarToggle({ pipActive }: { pipActive: boolean }) {
  const { playing, isPlayerOpen, togglePlayer, togglePlay, media } = usePlayer();
  const hasMedia = media != null;
  const isVideo = media?.kind === 'video';
  const open = pipActive || isPlayerOpen;
  return (
    <div
      className="fixed -translate-x-1/2 flex items-center rounded transition-all"
      style={{
        bottom: 0, left: '50%', height: STATUS_H, zIndex: 65,
        color: open ? ACCENT : 'rgba(255,255,255,0.5)',
        background: open ? ACCENT_DIM : 'transparent',
        border: `1px solid ${open ? ACCENT_BORDER : 'transparent'}`,
      }}
    >
      <button
        onClick={hasMedia ? togglePlay : togglePlayer}
        className="flex items-center justify-center pl-2 pr-1 h-full transition-colors hover:opacity-80"
        title={hasMedia ? (playing ? 'Pause' : 'Play') : 'Open Player'}
      >
        {playing ? <Pause size={10} fill="currentColor" /> : (isVideo ? <Film size={11} /> : <Music2 size={11} />)}
      </button>
      <button
        onClick={togglePlayer}
        className="pr-2 h-full uppercase text-[11px] font-semibold tracking-wider"
      >
        {pipActive ? 'In Window' : 'Player'}
      </button>
    </div>
  );
}

function PlayerPanel({ pipMode, docPipSupported, docPipActive, onToggleDocPip }: {
  pipMode: boolean;
  docPipSupported: boolean;
  docPipActive: boolean;
  onToggleDocPip: () => void;
}) {
  const { isPlayerOpen, togglePlayer, media } = usePlayer();
  const [height, setHeight] = useLocalState('premotion.playerH', 220);
  const [maximized, setMaximized] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const dragging = useRef(false);

  useEffect(() => { if (isPlayerOpen) setEverOpened(true); }, [isPlayerOpen]);

  const panelH = pipMode
    ? '100vh'
    : maximized
      ? (typeof window !== 'undefined' ? `${window.innerHeight - STATUS_H}px` : '500px')
      : `${height}px`;

  const onGripMouseDown = (e: React.MouseEvent) => {
    if (pipMode || maximized) return;
    e.preventDefault();
    dragging.current = true;
    const startY = e.clientY;
    const startH = height;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(MIN_H, Math.min(window.innerHeight - STATUS_H, startH + (startY - ev.clientY)));
      setHeight(next);
    };
    const onUp = () => { dragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const isVideo = media?.kind === 'video';
  const showPanel = pipMode || (everOpened && isPlayerOpen) || (everOpened && !isPlayerOpen);
  if (!showPanel) return null;

  const containerStyle: React.CSSProperties = pipMode
    ? {
        position: 'static',
        height: '100vh',
        width: '100vw',
        background: BG,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: PANEL_BOTTOM,
        height: isPlayerOpen ? panelH : 0,
        zIndex: 64,
        background: BG,
        borderTop: isPlayerOpen ? `1px solid ${BORDER}` : 'none',
        boxShadow: isPlayerOpen ? '0 -8px 32px rgba(0,0,0,0.6)' : 'none',
        overflow: 'hidden',
        transition: dragging.current ? 'none' : 'height 250ms ease',
        display: 'flex',
        flexDirection: 'column',
      };

  return (
    <div style={containerStyle}>
      <div className="shrink-0 flex items-center gap-3 px-3 h-9 select-none" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 shrink-0" style={{ color: ACCENT }}>
          {isVideo ? <Film size={13} /> : <Music2 size={13} />}
          <span className="text-xs font-bold tracking-widest font-mono">PLAYER</span>
        </div>
        <div className="shrink-0">
          <VolumeControl />
        </div>
        <div
          className={`flex-1 flex justify-center items-center h-full group ${pipMode ? '' : 'cursor-ns-resize'}`}
          onMouseDown={onGripMouseDown}
        >
          {!pipMode && <div className="w-12 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {docPipSupported && (
            <button
              onClick={onToggleDocPip}
              className="p-1 rounded transition-colors hover:bg-white/[0.06]"
              style={{ color: docPipActive ? ACCENT : 'rgba(255,255,255,0.4)' }}
              title={docPipActive ? 'Return to main window' : 'Pop out to floating window'}
            >
              <ExternalLink size={13} />
            </button>
          )}
          {!pipMode && (
            <button onClick={() => setMaximized(m => !m)} className="p-1 rounded transition-colors hover:bg-white/[0.06]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          {!pipMode && (
            <button onClick={togglePlayer} className="p-1 rounded transition-colors hover:bg-red-500/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 3-column body: left rail | center (video + transport) | right rail */}
      {media && (
        <div className="shrink-0 flex" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <LeftRail />
          <div className="flex-1 flex flex-col min-w-0">
            {isVideo && <VideoStage />}
            <CenterTransport />
          </div>
          <RightRail />
        </div>
      )}
      <QueueList />
    </div>
  );
}

export function PlayerWidget() {
  const [mounted, setMounted] = useState(false);
  const { supported: docPipSupported, pipWindow, toggle: toggleDocPip } = useDocPip();
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const docPipActive = pipWindow != null;
  const panel = (
    <PlayerPanel
      pipMode={docPipActive}
      docPipSupported={docPipSupported}
      docPipActive={docPipActive}
      onToggleDocPip={toggleDocPip}
    />
  );
  const panelTarget = docPipActive && pipWindow ? pipWindow.document.body : document.body;
  return (
    <>
      {createPortal(<StatusBarToggle pipActive={docPipActive} />, document.body)}
      {createPortal(panel, panelTarget)}
    </>
  );
}
