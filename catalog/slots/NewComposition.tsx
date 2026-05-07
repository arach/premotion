'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Film, FolderOpen, Upload, Send, FileVideo, Music, X, Sparkles } from 'lucide-react';
import { useCatalog } from '../Provider';

type CompositionMode = 'video' | 'video-music' | 'music';

interface QueuedSource {
  path: string;
  type: 'file' | 'folder';
  file?: File;
}

function generateCompositionId(): string {
  return `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugifyCompositionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ingestSource(source: QueuedSource): Promise<string> {
  if (!source.file) return source.path;

  const form = new FormData();
  form.append('file', source.file);
  const res = await fetch('/api/catalog/ingest', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to ingest ${source.path}`);
  }
  return data.path || `demos/${source.file.name}`;
}

const DEFAULT_VIDEO_PROMPT =
  'Create a polished 30 second product demo. Give the important interaction moments breathing room, use tactical labels sparingly, and emphasize the user action clearly.';

const DEFAULT_SOUNDTRACK_PROMPT =
  'Japanese hip hop, Tokyo night drive, tight trap drums, warm 808 bass, shamisen plucks, sparse koto accents, confident product demo energy, complete 30 second hook with intro and outro';

const DEFAULT_SOUNDTRACK_LYRICS = `[Intro]
Mouse up, words wake

[Hook]
Te no naka de flow, click kara go
Kotoba ga hashiru, screen ni glow
Review, confirm, then enter the zone
Mouse dake de send, Lattices control

[Outro]
Click up, send now
Flow locks in, lights down`;

export function NewComposition({ initialMode }: { initialMode?: CompositionMode }) {
  const { setView, pendingFiles, setPendingFiles, refreshCatalog } = useCatalog();
  const [mode, setMode] = useState<CompositionMode>(() => initialMode ?? (pendingFiles.length > 0 ? 'video-music' : 'video'));
  const [sources, setSources] = useState<QueuedSource[]>(() =>
    pendingFiles.map(f => ({ path: f, type: 'file' as const }))
  );
  const [prompt, setPrompt] = useState(DEFAULT_VIDEO_PROMPT);
  const [name, setName] = useState('');
  const [musicPrompt, setMusicPrompt] = useState(DEFAULT_SOUNDTRACK_PROMPT);
  const [musicLyrics, setMusicLyrics] = useState(DEFAULT_SOUNDTRACK_LYRICS);
  const [lyricsResult, setLyricsResult] = useState<Record<string, unknown> | null>(null);
  const [instrumental, setInstrumental] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingFiles.length > 0) setPendingFiles([]);
  }, [pendingFiles.length, setPendingFiles]);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newSources: QueuedSource[] = Array.from(files).map(f => ({
      path: f.name,
      type: 'file' as const,
      file: f,
    }));
    setSources(prev => [...prev, ...newSources]);
    if (newSources.length > 0 && mode === 'music') setMode('video-music');
  }, [mode]);

  const removeSource = useCallback((idx: number) => {
    setSources(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    const newSources: QueuedSource[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      const file = items[i].getAsFile();
      if (entry) {
        newSources.push({
          path: entry.name,
          type: entry.isDirectory ? 'folder' : 'file',
          file: entry.isDirectory ? undefined : file ?? undefined,
        });
      } else if (file) {
        newSources.push({
          path: file.name,
          type: 'file',
          file,
        });
      }
    }
    if (newSources.length > 0) {
      setSources(prev => [...prev, ...newSources]);
      if (mode === 'music') setMode('video-music');
    }
  }, [mode]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const compositionId = slugifyCompositionName(name) || generateCompositionId();

    if (mode === 'music') {
      if (!musicPrompt.trim()) return;
      setSubmitting(true);
      try {
        const res = await fetch('/api/music/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: musicPrompt.trim(),
            lyrics: musicLyrics.trim(),
            lyricsResult: lyricsResult ?? undefined,
            instrumental,
            model: 'music-2.6',
            title: name.trim() || undefined,
            sourceAsset: {
              id: slugifyCompositionName(name) || undefined,
              compositionId: slugifyCompositionName(name) || undefined,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Music generation failed');
        await refreshCatalog();
        setSubmitted('music');
        setTimeout(() => setView('music'), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (sources.length === 0 || !prompt.trim()) return;
    setSubmitting(true);
    try {
      const clipPaths = await Promise.all(sources.map(ingestSource));
      const withMusic = mode === 'video-music';

      const res = await fetch(`/api/compositions/${compositionId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'generate',
          prompt: prompt.trim(),
          inputs: { clips: clipPaths },
          params: {
            name: name.trim() || undefined,
            soundtrack: withMusic
              ? {
                  enabled: true,
                  model: 'music-2.6',
                  prompt: musicPrompt.trim(),
                  lyrics: musicLyrics.trim(),
                  lyricsResult: lyricsResult ?? undefined,
                  instrumental,
                  showLyricCaptions: !instrumental,
                }
              : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Composition queue failed');
      setSubmitted('video');
      setTimeout(() => setView('queue'), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [mode, name, musicPrompt, musicLyrics, lyricsResult, instrumental, sources, prompt, refreshCatalog, setView]);

  const handleGenerateLyrics = useCallback(async () => {
    if (!musicPrompt.trim() || instrumental) return;
    setGeneratingLyrics(true);
    setError(null);
    try {
      const res = await fetch('/api/music/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: musicLyrics.trim() ? 'edit' : 'write_full_song',
          prompt: musicLyrics.trim()
            ? `Revise or expand these lyrics for the music prompt. Avoid making only a tiny hook unless the prompt explicitly asks for one.\n\n${musicPrompt.trim()}`
            : musicPrompt.trim(),
          lyrics: musicLyrics.trim() || undefined,
          title: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lyrics generation failed');
      if (typeof data.lyrics === 'string') setMusicLyrics(data.lyrics);
      if (!name.trim() && typeof data.song_title === 'string') setName(data.song_title);
      setLyricsResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingLyrics(false);
    }
  }, [musicPrompt, musicLyrics, instrumental, name]);

  const needsSource = mode !== 'music';
  const canSubmit = mode === 'music'
    ? !!musicPrompt.trim() && !submitting
    : sources.length > 0 && !!prompt.trim() && !submitting;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="text-[14px] text-emerald-400/80 font-mono">
          {submitted === 'music' ? 'Music generated' : 'Composition queued'}
        </div>
        <div className="text-[11px] text-white/30 font-mono">
          Opening {submitted === 'music' ? 'music library' : 'queue'}...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <button onClick={() => setView(null)} className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-[14px] font-medium text-white/90">New Composition</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full grid grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-r border-white/[0.06] bg-white/[0.01] p-4 flex flex-col gap-3">
            <ModeButton mode="video" active={mode === 'video'} title="Video" detail="Render a video from clips" icon={<Film size={14} />} onClick={() => setMode('video')} />
            <ModeButton mode="video-music" active={mode === 'video-music'} title="Video + Music" detail="Analyze clips, render, add MiniMax" icon={<Sparkles size={14} />} onClick={() => setMode('video-music')} />
            <ModeButton mode="music" active={mode === 'music'} title="Music" detail="Generate a reusable track" icon={<Music size={14} />} onClick={() => setMode('music')} />
          </aside>

          <main className="min-h-0 overflow-y-auto frame-scrollbar">
            <div className="px-6 py-6 grid grid-cols-[minmax(0,1fr)_320px] gap-6">
              <section className="flex flex-col gap-6 min-w-0">
                <Field label={mode === 'music' ? 'Track Name' : 'Composition Name'}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Optional - auto-generated if blank"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[13px] text-white/80 font-mono placeholder:text-white/15 outline-none focus:border-cyan-400/30 transition-colors"
                  />
                </Field>

                {needsSource && (
                  <Field label="Source Files">
                    <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-white/[0.08] hover:border-cyan-400/20 rounded-sm p-7 flex flex-col items-center gap-3 transition-colors cursor-pointer"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={22} className="text-white/15" />
                      <div className="text-[12px] text-white/30 font-mono text-center">Drop files here</div>
                      <div className="text-[9px] text-white/15 font-mono text-center">mp4 · mov · mkv · webm · mp3 · wav · png · jpg · srt</div>
                      <button
                        onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                        className="mt-1 text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 hover:text-cyan-300 px-2.5 py-1.5 border border-cyan-400/15 rounded-sm transition-colors"
                      >
                        Browse
                      </button>
                    </div>

                    <input ref={fileRef} type="file" multiple accept=".mp4,.mov,.mkv,.avi,.webm,.m4v,.mxf,.prores,.ts,.flv,.mp3,.wav,.aac,.m4a,.ogg,.flac,.png,.jpg,.jpeg,.webp,.svg,.gif,.json,.srt,.vtt" className="hidden" onChange={e => addFiles(e.target.files)} />

                    {sources.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1">
                        {sources.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] rounded-sm">
                            {s.type === 'folder' ? <FolderOpen size={12} className="text-white/25 shrink-0" /> : <FileVideo size={12} className="text-white/25 shrink-0" />}
                            <span className="text-[12px] font-mono text-white/60 truncate flex-1">{s.path}</span>
                            <button onClick={() => removeSource(i)} className="text-white/20 hover:text-white/50 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Field>
                )}

                {needsSource && (
                  <Field label="Video Instructions">
                    <textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      rows={7}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[13px] text-white/80 font-mono placeholder:text-white/15 outline-none focus:border-cyan-400/30 transition-colors resize-none leading-relaxed"
                    />
                  </Field>
                )}

                {(mode === 'video-music' || mode === 'music') && (
                  <Field label={mode === 'music' ? 'Music Prompt' : 'Soundtrack Prompt'}>
                    <textarea
                      value={musicPrompt}
                      onChange={e => setMusicPrompt(e.target.value)}
                      rows={5}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[13px] text-white/80 font-mono outline-none focus:border-cyan-400/30 transition-colors resize-none leading-relaxed"
                    />
                    <label className="flex items-center gap-2 text-[11px] font-mono text-white/45 mt-3">
                      <input
                        type="checkbox"
                        checked={instrumental}
                        onChange={e => setInstrumental(e.target.checked)}
                        className="accent-cyan-300"
                      />
                      Instrumental
                    </label>
                    {!instrumental && (
                      <>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateLyrics}
                            disabled={generatingLyrics || !musicPrompt.trim()}
                            className={`px-3 py-1.5 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                              !generatingLyrics && musicPrompt.trim()
                                ? 'bg-cyan-400/[0.08] border-cyan-400/25 text-cyan-300 hover:bg-cyan-400/[0.13]'
                                : 'bg-white/[0.02] border-white/[0.06] text-white/22 cursor-not-allowed'
                            }`}
                          >
                            {generatingLyrics ? 'Writing...' : musicLyrics.trim() ? 'Revise Lyrics' : 'Generate Lyrics'}
                          </button>
                          {typeof lyricsResult?.style_tags === 'string' && (
                            <span className="text-[10px] font-mono text-white/35 truncate">
                              {lyricsResult.style_tags}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={musicLyrics}
                          onChange={e => { setMusicLyrics(e.target.value); setLyricsResult(null); }}
                          rows={8}
                          className="mt-3 w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[12px] text-white/75 font-mono outline-none focus:border-cyan-400/30 transition-colors resize-none leading-relaxed"
                        />
                      </>
                    )}
                  </Field>
                )}
              </section>

              <aside className="min-w-0">
                <div className="sticky top-6 rounded border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-3">Ready</div>
                  <div className="flex flex-col gap-2 text-[11px] font-mono text-white/45 mb-4">
                    <span>Mode: {mode === 'video-music' ? 'Video + Music' : mode === 'music' ? 'Music' : 'Video'}</span>
                    {needsSource && <span>Sources: {sources.length}</span>}
                    {(mode === 'video-music' || mode === 'music') && <span>Model: music-2.6</span>}
                  </div>
                  {error && (
                    <div className="mb-3 rounded bg-red-400/[0.08] border border-red-400/20 px-3 py-2 text-[11px] font-mono text-red-300/75">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-[12px] font-mono uppercase tracking-wider transition-all ${
                      canSubmit
                        ? 'bg-cyan-400/[0.1] border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/[0.15]'
                        : 'bg-white/[0.02] border border-white/[0.06] text-white/20 cursor-not-allowed'
                    }`}
                  >
                    <Send size={12} />
                    {submitting ? 'Creating...' : mode === 'music' ? 'Generate Music' : 'Create'}
                  </button>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  title,
  detail,
  icon,
  onClick,
}: {
  mode: CompositionMode;
  active: boolean;
  title: string;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded border px-3 py-3 transition-colors ${
        active
          ? 'bg-cyan-400/[0.08] border-cyan-400/25'
          : 'bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]'
      }`}
    >
      <div className="flex items-center gap-2 text-[12px] text-white/80">
        <span className={active ? 'text-cyan-300/80' : 'text-white/30'}>{icon}</span>
        {title}
      </div>
      <div className="text-[10px] font-mono text-white/32 mt-1.5 leading-snug">{detail}</div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
