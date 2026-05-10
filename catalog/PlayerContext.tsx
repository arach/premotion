'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AudioAsset, Video } from '@/lib/types';
import { resolveVideoSrc } from '@/lib/media';
import { PlayerWidget } from './slots/PlayerWidget';
import { useCatalog } from './Provider';

const VOLUME_KEY = 'premotion:player:volume';
const REPEAT_KEY = 'premotion:player:repeat';
const SHUFFLE_KEY = 'premotion:player:shuffle';
const POSITIONS_KEY = 'premotion:player:positions';
const HISTORY_MAX = 40;
const POSITION_SAVE_MIN = 1;
const POSITION_SAVE_TAIL = 2;

function loadVolume(): number {
  try { return parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.8'); } catch { return 0.8; }
}

function loadRepeat(): RepeatMode {
  try {
    const v = localStorage.getItem(REPEAT_KEY);
    return v === 'one' || v === 'all' ? v : 'off';
  } catch { return 'off'; }
}

function loadShuffle(): boolean {
  try { return localStorage.getItem(SHUFFLE_KEY) === '1'; } catch { return false; }
}

function loadPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export type RepeatMode = 'off' | 'all' | 'one';

export type Media =
  | { kind: 'audio'; asset: AudioAsset }
  | { kind: 'video'; video: Video; src: string };

export type HistoryItem =
  | { kind: 'audio'; asset: AudioAsset }
  | { kind: 'video'; id: string; title: string };

function mediaKey(m: Media): string {
  return m.kind === 'audio' ? `audio:${m.asset.id}` : `video:${m.video.id}`;
}

function mediaSrc(m: Media): string {
  return m.kind === 'audio' ? `/${m.asset.path}` : m.src;
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PlayMediaOpts {
  queue?: Media[];
  index?: number;
}

interface PlayerContextValue {
  media: Media | null;
  /** Convenience: the audio asset when media.kind === 'audio', else null. */
  track: AudioAsset | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isPlayerOpen: boolean;
  isPip: boolean;
  pipSupported: boolean;
  history: HistoryItem[];
  queue: Media[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playMedia: (m: Media, opts?: PlayMediaOpts) => void;
  playTrack: (track: AudioAsset, opts?: PlayMediaOpts) => void;
  playVideo: (video: Video, opts?: PlayMediaOpts) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  openPlayer: () => void;
  togglePlayer: () => void;
  logVideo: (id: string, title: string) => void;
  togglePip: () => Promise<void>;
  mediaEl: HTMLVideoElement | null;
  /** Adopt the media element into the given container (or return it home when null). */
  attachStage: (container: HTMLElement | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function pushHistory(prev: HistoryItem[], item: HistoryItem): HistoryItem[] {
  const deduped = prev.filter(h => {
    if (h.kind === 'audio' && item.kind === 'audio') return h.asset.id !== item.asset.id;
    if (h.kind === 'video' && item.kind === 'video') return h.id !== item.id;
    return true;
  });
  return [item, ...deduped].slice(0, HISTORY_MAX);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const homeRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);

  const [mediaEl, setMediaEl] = useState<HTMLVideoElement | null>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(loadVolume);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isPip, setIsPip] = useState(false);

  const [queue, setQueue] = useState<Media[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [shuffle, setShuffle] = useState<boolean>(loadShuffle);
  const [repeat, setRepeat] = useState<RepeatMode>(loadRepeat);
  const [positions, setPositions] = useState<Record<string, number>>(loadPositions);

  // Track shuffled order over the current queue; regenerated when queue length or shuffle toggles.
  const shuffleOrderRef = useRef<number[]>([]);
  useEffect(() => {
    if (shuffle && queue.length > 0) {
      const idxs = Array.from({ length: queue.length }, (_, i) => i);
      // Keep current track first to avoid jumping when toggling shuffle.
      const rest = idxs.filter(i => i !== queueIndex);
      shuffleOrderRef.current = [queueIndex, ...shuffleArray(rest)];
    } else {
      shuffleOrderRef.current = Array.from({ length: queue.length }, (_, i) => i);
    }
  // queueIndex intentionally excluded — we don't want to reshuffle on every track change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffle, queue.length]);

  const pipSupported = typeof document !== 'undefined'
    && 'pictureInPictureEnabled' in document
    && (document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled === true;

  // Persistence
  useEffect(() => {
    try { localStorage.setItem(REPEAT_KEY, repeat); } catch {}
  }, [repeat]);
  useEffect(() => {
    try { localStorage.setItem(SHUFFLE_KEY, shuffle ? '1' : '0'); } catch {}
  }, [shuffle]);
  useEffect(() => {
    try { localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions)); } catch {}
  }, [positions]);

  // Imperative play; refs hold the latest state so the stable onEnded listener can advance the queue.
  const playRef = useRef<((m: Media) => void) | null>(null);
  const queueRef = useRef<Media[]>([]);
  const queueIndexRef = useRef(0);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>('off');
  const positionsRef = useRef<Record<string, number>>({});
  const mediaRef = useRef<Media | null>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { mediaRef.current = media; }, [media]);

  // Create the single <video> element once, wire imperative listeners, dock it home.
  useEffect(() => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.playsInline = true;
    el.controls = false;

    const savePosition = () => {
      const m = mediaRef.current;
      if (!m) return;
      const t = el.currentTime;
      const dur = el.duration;
      if (t > POSITION_SAVE_MIN && (!Number.isFinite(dur) || t < dur - POSITION_SAVE_TAIL)) {
        setPositions(prev => ({ ...prev, [mediaKey(m)]: t }));
      }
    };

    const onTime = () => setCurrentTime(el.currentTime);
    const onDur = () => {
      if (Number.isFinite(el.duration)) setDuration(el.duration);
    };
    const onEnded = () => {
      // Clear saved position so the next play of this item starts fresh.
      const m = mediaRef.current;
      if (m) setPositions(prev => {
        const k = mediaKey(m);
        if (!(k in prev)) return prev;
        const next = { ...prev };
        delete next[k];
        return next;
      });
      // Advance through queue per repeat mode.
      const q = queueRef.current;
      if (q.length === 0) { setPlaying(false); return; }
      const r = repeatRef.current;
      if (r === 'one') {
        playRef.current?.(q[queueIndexRef.current]);
        return;
      }
      const order = shuffleOrderRef.current.length === q.length
        ? shuffleOrderRef.current
        : Array.from({ length: q.length }, (_, i) => i);
      const pos = order.indexOf(queueIndexRef.current);
      const nextPos = pos + 1;
      if (nextPos < order.length) {
        const idx = order[nextPos];
        setQueueIndex(idx);
        playRef.current?.(q[idx]);
        return;
      }
      if (r === 'all') {
        const idx = order[0];
        setQueueIndex(idx);
        playRef.current?.(q[idx]);
        return;
      }
      setPlaying(false);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); savePosition(); };

    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('enterpictureinpicture', onEnterPip);
    el.addEventListener('leavepictureinpicture', onLeavePip);

    if (homeRef.current) homeRef.current.appendChild(el);
    setMediaEl(el);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('enterpictureinpicture', onEnterPip);
      el.removeEventListener('leavepictureinpicture', onLeavePip);
      try { el.pause(); } catch {}
      el.removeAttribute('src');
      try { el.load(); } catch {}
      el.parentElement?.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (mediaEl) mediaEl.volume = volume;
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch {}
  }, [volume, mediaEl]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  /** Internal: load src into element and play, restoring saved position if any. */
  const playOnElement = useCallback((next: Media) => {
    const el = mediaEl;
    if (!el) return;
    setMedia(next);
    const histItem: HistoryItem = next.kind === 'audio'
      ? { kind: 'audio', asset: next.asset }
      : { kind: 'video', id: next.video.id, title: next.video.id };
    setHistory(prev => pushHistory(prev, histItem));
    el.src = mediaSrc(next);
    el.load();
    el.volume = volume;
    const key = mediaKey(next);
    const onCanPlay = () => {
      el.volume = volume;
      const saved = positionsRef.current[key];
      const dur = el.duration;
      if (saved != null && saved > POSITION_SAVE_MIN
          && (!Number.isFinite(dur) || saved < dur - POSITION_SAVE_TAIL)) {
        el.currentTime = saved;
      }
      el.removeEventListener('canplay', onCanPlay);
    };
    el.addEventListener('canplay', onCanPlay);
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    setIsPlayerOpen(true);
  }, [mediaEl, volume]);

  useEffect(() => { playRef.current = playOnElement; }, [playOnElement]);

  const playMedia = useCallback((next: Media, opts?: PlayMediaOpts) => {
    if (opts?.queue && opts.queue.length > 0) {
      setQueue(opts.queue);
      const explicit = opts.index ?? -1;
      const inferred = opts.queue.findIndex(m => mediaKey(m) === mediaKey(next));
      const idx = explicit >= 0 && explicit < opts.queue.length ? explicit
        : inferred >= 0 ? inferred : 0;
      setQueueIndex(idx);
    } else {
      setQueue([next]);
      setQueueIndex(0);
    }
    playOnElement(next);
  }, [playOnElement]);

  const playTrack = useCallback((asset: AudioAsset, opts?: PlayMediaOpts) => {
    playMedia({ kind: 'audio', asset }, opts);
  }, [playMedia]);

  const playVideo = useCallback((video: Video, opts?: PlayMediaOpts) => {
    const src = resolveVideoSrc(video);
    if (!src) return;
    playMedia({ kind: 'video', video, src }, opts);
  }, [playMedia]);

  const next = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const order = shuffleOrderRef.current.length === q.length
      ? shuffleOrderRef.current
      : Array.from({ length: q.length }, (_, i) => i);
    const pos = order.indexOf(queueIndexRef.current);
    let nextIdx: number;
    if (pos + 1 < order.length) nextIdx = order[pos + 1];
    else if (repeatRef.current === 'all') nextIdx = order[0];
    else return;
    setQueueIndex(nextIdx);
    playOnElement(q[nextIdx]);
  }, [playOnElement]);

  const prev = useCallback(() => {
    const el = mediaEl;
    const q = queueRef.current;
    if (q.length === 0) return;
    if (el && el.currentTime > 3) { el.currentTime = 0; return; }
    const order = shuffleOrderRef.current.length === q.length
      ? shuffleOrderRef.current
      : Array.from({ length: q.length }, (_, i) => i);
    const pos = order.indexOf(queueIndexRef.current);
    let prevIdx: number;
    if (pos - 1 >= 0) prevIdx = order[pos - 1];
    else if (repeatRef.current === 'all') prevIdx = order[order.length - 1];
    else { if (el) el.currentTime = 0; return; }
    setQueueIndex(prevIdx);
    playOnElement(q[prevIdx]);
  }, [playOnElement, mediaEl]);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);
  const cycleRepeat = useCallback(() => {
    setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off');
  }, []);

  const pause = useCallback(() => { mediaEl?.pause(); }, [mediaEl]);
  const resume = useCallback(() => {
    mediaEl?.play().then(() => setPlaying(true)).catch(() => {});
  }, [mediaEl]);
  const togglePlay = useCallback(() => {
    const el = mediaEl;
    if (!el) return;
    if (el.paused) el.play().then(() => setPlaying(true)).catch(() => {});
    else el.pause();
  }, [mediaEl]);
  const seek = useCallback((t: number) => {
    const el = mediaEl;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, t));
  }, [mediaEl]);

  const openPlayer = useCallback(() => setIsPlayerOpen(true), []);
  const togglePlayer = useCallback(() => setIsPlayerOpen(v => !v), []);
  const logVideo = useCallback((id: string, title: string) => {
    setHistory(prev => pushHistory(prev, { kind: 'video', id, title }));
  }, []);

  const togglePip = useCallback(async () => {
    const el = mediaEl;
    if (!el || !pipSupported) return;
    try {
      if (document.pictureInPictureElement === el) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch {
      // ignore — user gesture/security errors aren't actionable here
    }
  }, [mediaEl, pipSupported]);

  const attachStage = useCallback((container: HTMLElement | null) => {
    const el = mediaEl;
    if (!el) return;
    if (container === stageRef.current) return;
    stageRef.current = container;
    const target = container ?? homeRef.current;
    if (target && el.parentElement !== target) target.appendChild(el);
    if (container) {
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.background = 'black';
      el.style.display = 'block';
    } else {
      el.removeAttribute('style');
    }
  }, [mediaEl]);

  const track: AudioAsset | null = media?.kind === 'audio' ? media.asset : null;

  // --- Media Session API: OS media keys, lock-screen art, system notification ---
  const { reviewOpen } = useCatalog();
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!media) {
      try { navigator.mediaSession.metadata = null; } catch {}
      return;
    }
    const title = media.kind === 'audio' ? (media.asset.songTitle || media.asset.id) : media.video.id;
    const artist = media.kind === 'audio' ? (media.asset.app || 'Premotion') : (media.video.app || 'Premotion');
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'Premotion' });
    } catch {}
  }, [media]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safe = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, handler); } catch {}
    };
    safe('play', () => resume());
    safe('pause', () => pause());
    safe('seekto', (d) => { if (typeof d.seekTime === 'number') seek(d.seekTime); });
    safe('seekbackward', (d) => {
      if (!mediaEl) return;
      seek(mediaEl.currentTime - (d.seekOffset ?? 10));
    });
    safe('seekforward', (d) => {
      if (!mediaEl) return;
      seek(mediaEl.currentTime + (d.seekOffset ?? 10));
    });
    safe('nexttrack', () => next());
    safe('previoustrack', () => prev());
    return () => {
      safe('play', null);
      safe('pause', null);
      safe('seekto', null);
      safe('seekbackward', null);
      safe('seekforward', null);
      safe('nexttrack', null);
      safe('previoustrack', null);
    };
  }, [mediaEl, resume, pause, seek, next, prev]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = playing ? 'playing' : (media ? 'paused' : 'none'); } catch {}
  }, [playing, media]);

  // --- Global keyboard shortcuts (deferred to ReviewPlayer when its modal is open) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (reviewOpen) return; // ReviewPlayer owns input while open
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!mediaEl || !media) return;

      const skip = (delta: number) => seek(mediaEl.currentTime + delta);

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          if (mediaEl.paused) mediaEl.play().then(() => setPlaying(true)).catch(() => {});
          else mediaEl.pause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(e.shiftKey ? -10 : -5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(e.shiftKey ? 10 : 5);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          skip(-10);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          skip(10);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setVolumeState(v => (v > 0 ? 0 : 0.8));
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          next();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          prev();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mediaEl, media, seek, reviewOpen, next, prev]);

  return (
    <PlayerContext.Provider value={{
      media, track, playing, currentTime, duration, volume, isPlayerOpen, isPip, pipSupported, history,
      queue, queueIndex, shuffle, repeat,
      playMedia, playTrack, playVideo, next, prev, toggleShuffle, cycleRepeat,
      pause, resume, togglePlay, seek, setVolume,
      openPlayer, togglePlayer, logVideo, togglePip, mediaEl, attachStage,
    }}>
      {children}
      <PlayerWidget />
      <div ref={homeRef} style={{ display: 'none' }} />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
