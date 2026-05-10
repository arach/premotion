'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Braces, Clock, CornerDownRight, Disc3, FileAudio, ListPlus, Loader2, Music, Pause, Play, RefreshCw, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useCatalog } from '../Provider';
import { usePlayer } from '../PlayerContext';
import { formatDuration, type AudioAsset } from '@/lib/types';

interface JsonModalState {
  title: string;
  data: unknown;
}

function compactJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function MusicView() {
  const { data, refreshCatalog, deleteAudio, setView, pendingMusicCount, notifyMusicSettled } = useCatalog();
  const { playTrack, track: currentTrack, playing, togglePlay, insertNext, addToQueue } = usePlayer();
  const audioAssets = useMemo(() => data?.audioAssets ?? [], [data]);
  const audioQueue = useMemo(
    () => audioAssets.map(a => ({ kind: 'audio' as const, asset: a })),
    [audioAssets],
  );
  const playFromList = (asset: AudioAsset) => {
    const idx = audioAssets.findIndex(a => a.id === asset.id);
    playTrack(asset, { queue: audioQueue, index: idx >= 0 ? idx : 0 });
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jsonModal, setJsonModal] = useState<JsonModalState | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [reviseLyrics, setReviseLyrics] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const prevCountRef = useRef(audioAssets.length);

  useEffect(() => {
    if (audioAssets.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !audioAssets.some(a => a.id === selectedId)) {
      setSelectedId(audioAssets[0].id);
    }
  }, [audioAssets, selectedId]);

  // Poll while music generations are pending
  useEffect(() => {
    if (pendingMusicCount <= 0) return;
    const interval = setInterval(() => { refreshCatalog(); }, 4000);
    return () => clearInterval(interval);
  }, [pendingMusicCount, refreshCatalog]);

  // When new tracks appear, settle one pending slot and select the newest
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = audioAssets.length;
    if (audioAssets.length > prev) {
      notifyMusicSettled();
      setSelectedId(audioAssets[0].id);
    }
  }, [audioAssets.length]);

  const selected = audioAssets.find(a => a.id === selectedId) ?? audioAssets[0] ?? null;
  const generatedCount = audioAssets.filter(a => a.generated).length;
  const totalDuration = audioAssets.reduce((total, a) => total + (a.duration || 0), 0);

  const { notifyMusicQueued } = useCatalog();

  const deleteTrack = async (asset: AudioAsset) => {
    setConfirmDeleteId(null);
    if (selectedId === asset.id) {
      const next = audioAssets.find(a => a.id !== asset.id);
      setSelectedId(next?.id ?? null);
    }
    await deleteAudio(asset.id);
  };

  const submitFeedback = (asset: AudioAsset) => {
    const note = feedback[asset.id]?.trim();
    if (!note) return;
    notifyMusicQueued();
    fetch('/api/music/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAsset: asset,
        feedback: note,
        prompt: asset.prompt,
        lyrics: asset.lyrics,
        instrumental: asset.instrumental,
        model: asset.model || 'music-2.6',
        generateLyrics: reviseLyrics[asset.id] ?? (!!asset.lyrics && !asset.instrumental),
        lyricsMode: asset.lyrics ? 'edit' : 'write_full_song',
        lyricsPrompt: `Revise the lyrics for this track using the feedback, then generate the revised music.\n\nFeedback: ${note}\n\nMusic prompt: ${asset.prompt ?? ''}`,
        title: asset.songTitle || asset.id,
      }),
    }).then(async (res) => {
      if (res.ok) await refreshCatalog();
    }).catch(() => {}).finally(() => {
      notifyMusicSettled();
    });
    setFeedback(prev => ({ ...prev, [asset.id]: '' }));
    setMessage('Revision queued.');
  };

  return (
    <div className="h-full grid grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-h-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-medium text-white/90">Music</div>
              {pendingMusicCount > 0 && (
                <div className="flex items-center gap-1 text-[9px] font-mono text-violet-300/60">
                  <Loader2 size={9} className="animate-spin" />
                  {pendingMusicCount === 1 ? 'generating' : `${pendingMusicCount} generating`}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setView('new-music')}
              className="px-2.5 py-1.5 rounded-sm bg-cyan-400/[0.1] border border-cyan-400/25 text-[10px] font-mono uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/[0.15] transition-colors"
            >
              New
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Tracks" value={String(audioAssets.length)} />
            <Stat label="Gen" value={String(generatedCount)} />
            <Stat label="Time" value={formatDuration(totalDuration)} />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar p-2">
          {audioAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <Music size={30} className="text-white/10 mb-4" />
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/24">No music assets</div>
              <button
                type="button"
                onClick={() => setView('new-music')}
                className="mt-4 px-3 py-2 rounded-sm border border-cyan-400/25 text-[10px] font-mono uppercase tracking-wider text-cyan-300/80"
              >
                Generate Music
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {audioAssets.map(asset => (
                <div
                  key={asset.id}
                  className={`group relative rounded border transition-colors ${
                    selected?.id === asset.id
                      ? 'bg-cyan-400/[0.07] border-cyan-400/25'
                      : 'bg-white/[0.015] border-white/[0.045] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                  onContextMenu={e => { e.preventDefault(); playFromList(asset); }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    onDoubleClick={() => playFromList(asset)}
                    className="w-full text-left px-3 py-2.5 pr-8"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {currentTrack?.id === asset.id ? (
                        <span
                          role="button"
                          onClick={e => { e.stopPropagation(); togglePlay(); }}
                          className="shrink-0 text-cyan-400/80 hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        </span>
                      ) : asset.generated ? (
                        <Sparkles size={12} className="text-cyan-300/65 shrink-0" />
                      ) : (
                        <FileAudio size={12} className="text-white/30 shrink-0" />
                      )}
                      <span className="text-[11px] text-white/75 truncate">{asset.songTitle || asset.id}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[9px] font-mono text-white/30">
                      <span>{formatDuration(asset.duration)}</span>
                      <span>{asset.codec}</span>
                      {asset.model && <span>{asset.model}</span>}
                    </div>
                  </button>
                  {confirmDeleteId === asset.id ? (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteTrack(asset); }}
                        className="px-1.5 py-0.5 rounded-sm text-[9px] font-mono uppercase tracking-wider text-red-300 bg-red-400/10 border border-red-400/25 hover:bg-red-400/20 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-1.5 py-0.5 rounded-sm text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); insertNext({ kind: 'audio', asset }); }}
                        className="p-1 rounded text-white/30 hover:text-cyan-300 hover:bg-white/[0.05] transition-colors"
                        title="Play next"
                      >
                        <CornerDownRight size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); addToQueue({ kind: 'audio', asset }); }}
                        className="p-1 rounded text-white/30 hover:text-cyan-300 hover:bg-white/[0.05] transition-colors"
                        title="Add to queue"
                      >
                        <ListPlus size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(asset.id); }}
                        className="p-1 rounded text-white/25 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                        title="Delete track"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="min-h-0 overflow-y-auto frame-scrollbar">
        {selected ? (
          <MusicDetail
            asset={selected}
            feedback={feedback[selected.id] ?? ''}
            message={message}
            reviseLyrics={reviseLyrics[selected.id] ?? (!!selected.lyrics && !selected.instrumental)}
            onFeedbackChange={(value) => setFeedback(prev => ({ ...prev, [selected.id]: value }))}
            onReviseLyricsChange={(value) => setReviseLyrics(prev => ({ ...prev, [selected.id]: value }))}
            onSubmitFeedback={() => submitFeedback(selected)}
            confirmDelete={confirmDeleteId === selected.id}
            onRequestDelete={() => setConfirmDeleteId(selected.id)}
            onCancelDelete={() => setConfirmDeleteId(null)}
            onDelete={() => deleteTrack(selected)}
            onOpenJson={(title, value) => setJsonModal({ title, data: value })}
            onRefresh={refreshCatalog}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-[12px] font-mono text-white/25">
            Select a track
          </div>
        )}
      </main>

      {jsonModal && (
        <JsonModal title={jsonModal.title} data={jsonModal.data} onClose={() => setJsonModal(null)} />
      )}
    </div>
  );
}

function MusicDetail({
  asset,
  feedback,
  message,
  reviseLyrics,
  confirmDelete,
  onFeedbackChange,
  onReviseLyricsChange,
  onSubmitFeedback,
  onRequestDelete,
  onCancelDelete,
  onDelete,
  onOpenJson,
  onRefresh,
}: {
  asset: AudioAsset;
  feedback: string;
  message: string | null;
  reviseLyrics: boolean;
  confirmDelete: boolean;
  onFeedbackChange: (value: string) => void;
  onReviseLyricsChange: (value: boolean) => void;
  onSubmitFeedback: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onOpenJson: (title: string, value: unknown) => void;
  onRefresh: () => void;
}) {
  const metadata = {
    id: asset.id,
    path: asset.path,
    duration: asset.duration,
    codec: asset.codec,
    sampleRate: asset.sampleRate,
    channels: asset.channels,
    bitrate: asset.bitrate,
    sizeMB: asset.sizeMB,
    generated: asset.generated,
    provider: asset.provider,
    model: asset.model,
    compositionId: asset.compositionId,
    parentTrackId: asset.parentTrackId,
    revisionOf: asset.revisionOf,
    capturedAt: asset.capturedAt,
  };

  return (
    <div className="px-6 py-5 flex flex-col gap-5">
      <div className="flex items-start gap-4 pb-5 border-b border-white/[0.06]">
        <div className="w-11 h-11 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
          {asset.generated ? <Sparkles size={18} className="text-cyan-300/70" /> : <Disc3 size={18} className="text-white/35" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[16px] font-medium text-white/88 truncate">{asset.songTitle || asset.id}</h1>
            {asset.generated && <Tag>Generated</Tag>}
            {asset.provider && <Tag>{asset.provider}</Tag>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-white/35">
            <span>{asset.path}</span>
            <span className="flex items-center gap-1"><Clock size={9} />{formatDuration(asset.duration)}</span>
            <span>{asset.codec}</span>
            {asset.sampleRate && <span>{asset.sampleRate / 1000}kHz</span>}
            <span>{asset.sizeMB.toFixed(1)} MB</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-sm text-white/30 hover:text-white/65 hover:bg-white/[0.05] transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-1 rounded-sm text-[9px] font-mono uppercase tracking-wider text-red-300 bg-red-400/10 border border-red-400/25 hover:bg-red-400/20 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="px-2 py-1 rounded-sm text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestDelete}
              className="p-2 rounded-sm text-white/25 hover:text-red-400 hover:bg-red-400/[0.07] transition-colors"
              title="Delete track"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <audio controls preload="metadata" src={`/${asset.path}`} className="w-full h-9 opacity-85" />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5">
        <section className="min-w-0 flex flex-col gap-3">
          <DetailsSection title="Prompt" defaultOpen>
            <div className="text-[12px] text-white/68 leading-relaxed whitespace-pre-wrap select-text">
              {asset.prompt || 'No prompt stored for this track.'}
            </div>
          </DetailsSection>

          <DetailsSection title="Lyrics" defaultOpen={!!asset.lyrics}>
            {asset.songTitle && (
              <div className="mb-2 text-[11px] font-mono text-white/45">
                {asset.songTitle}{asset.styleTags ? ` · ${asset.styleTags}` : ''}
              </div>
            )}
            <pre className="text-[12px] leading-relaxed font-mono text-white/60 whitespace-pre-wrap select-text">
              {asset.lyrics || 'No lyrics stored for this track.'}
            </pre>
          </DetailsSection>

          <DetailsSection title="Lyrics Result">
            {asset.lyricsGeneration ? (
              <JsonPreview data={asset.lyricsGeneration} onOpen={() => onOpenJson('Lyrics Generation JSON', asset.lyricsGeneration)} />
            ) : (
              <div className="text-[12px] text-white/35">No separate lyrics API result is stored for this track.</div>
            )}
          </DetailsSection>

          <DetailsSection title="MiniMax Result">
            {asset.result ? (
              <JsonPreview data={asset.result} onOpen={() => onOpenJson('MiniMax Result JSON', asset.result)} />
            ) : (
              <div className="text-[12px] text-white/35">No raw API result was stored for this older generation.</div>
            )}
          </DetailsSection>

          <DetailsSection title="Full Asset JSON">
            <JsonPreview data={asset} onOpen={() => onOpenJson('Music Asset JSON', asset)} />
          </DetailsSection>
        </section>

        <aside className="min-w-0 flex flex-col gap-3">
          <DetailsSection title="Metadata" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(metadata).map(([key, value]) => (
                value == null || value === '' ? null : (
                  <div key={key} className="rounded bg-white/[0.025] border border-white/[0.05] px-2 py-1.5 min-w-0">
                    <div className="text-[8px] font-mono uppercase tracking-wider text-white/25">{key}</div>
                    <div className="text-[10px] font-mono text-white/62 truncate">{String(value)}</div>
                  </div>
                )
              ))}
            </div>
          </DetailsSection>

          <DetailsSection title="Feedback" defaultOpen>
            <textarea
              value={feedback}
              onChange={e => onFeedbackChange(e.target.value)}
              rows={8}
              placeholder="Make the drums tighter, less vocal-forward, darker bass, more space around the hook..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[12px] text-white/78 font-mono placeholder:text-white/18 outline-none focus:border-cyan-400/30 transition-colors resize-none leading-relaxed"
            />
            {!asset.instrumental && (
              <label className="mt-2 flex items-center gap-2 text-[11px] font-mono text-white/45">
                <input
                  type="checkbox"
                  checked={reviseLyrics}
                  onChange={e => onReviseLyricsChange(e.target.checked)}
                  className="accent-cyan-300"
                />
                Revise lyrics first
              </label>
            )}
            {message && (
              <div className="mt-2 text-[10px] font-mono text-white/42">{message}</div>
            )}
            <button
              type="button"
              onClick={onSubmitFeedback}
              disabled={!feedback.trim()}
              className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-colors ${
                feedback.trim()
                  ? 'bg-cyan-400/[0.1] border border-cyan-400/25 text-cyan-300 hover:bg-cyan-400/[0.15]'
                  : 'bg-white/[0.02] border border-white/[0.06] text-white/22 cursor-not-allowed'
              }`}
            >
              <Send size={11} />
              Generate Revision
            </button>
          </DetailsSection>
        </aside>
      </div>
    </div>
  );
}

function DetailsSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="rounded border border-white/[0.06] bg-white/[0.018] overflow-hidden">
      <summary className="cursor-pointer select-none px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.15em] text-white/38 hover:text-white/55 hover:bg-white/[0.025] transition-colors">
        {title}
      </summary>
      <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
        {children}
      </div>
    </details>
  );
}

function JsonPreview({ data, onOpen }: { data: unknown; onOpen: () => void }) {
  return (
    <div>
      <pre className="max-h-40 overflow-auto frame-scrollbar rounded bg-black/25 border border-white/[0.05] p-3 text-[10px] leading-relaxed font-mono text-white/52 whitespace-pre-wrap">
        {compactJson(data)}
      </pre>
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[10px] font-mono text-white/55 hover:text-white/80 transition-colors"
      >
        <Braces size={10} />
        Open JSON
      </button>
    </div>
  );
}

function JsonModal({ title, data, onClose }: { title: string; data: unknown; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-5xl max-h-[84vh] rounded border border-white/[0.12] bg-[#0b0b0b] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
          <Braces size={14} className="text-cyan-400/70" />
          <div className="flex-1 min-w-0 text-[12px] font-mono uppercase tracking-wider text-white/70 truncate">{title}</div>
          <button type="button" onClick={onClose} className="p-1.5 rounded text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <X size={14} />
          </button>
        </div>
        <pre className="max-h-[74vh] overflow-auto frame-scrollbar p-4 text-[11px] leading-relaxed font-mono text-white/65 whitespace-pre-wrap">
          {compactJson(data)}
        </pre>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/[0.05] bg-white/[0.025] px-2 py-1.5 min-w-0">
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/24">{label}</div>
      <div className="text-[12px] font-mono text-white/75 truncate">{value}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[8px] font-mono uppercase tracking-wider text-white/45">
      {children}
    </span>
  );
}
