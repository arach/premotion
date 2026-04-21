'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FolderOpen, Upload, Send, FileVideo, X } from 'lucide-react';
import { useCatalog } from '../Provider';

interface QueuedSource {
  path: string;
  type: 'file' | 'folder';
}

function generateCompositionId(): string {
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function NewComposition() {
  const { setView, pendingFiles, setPendingFiles } = useCatalog();
  const [sources, setSources] = useState<QueuedSource[]>(() =>
    pendingFiles.map(f => ({ path: f, type: 'file' as const }))
  );

  useEffect(() => {
    if (pendingFiles.length > 0) setPendingFiles([]);
  }, []);
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newSources: QueuedSource[] = Array.from(files).map(f => ({
      path: f.name,
      type: 'file' as const,
    }));
    setSources(prev => [...prev, ...newSources]);
  }, []);

  const removeSource = useCallback((idx: number) => {
    setSources(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    const newSources: QueuedSource[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        newSources.push({
          path: entry.name,
          type: entry.isDirectory ? 'folder' : 'file',
        });
      }
    }
    if (newSources.length > 0) setSources(prev => [...prev, ...newSources]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (sources.length === 0 || !prompt.trim()) return;
    setSubmitting(true);
    try {
      const compositionId = name.trim()
        ? name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : generateCompositionId();

      await fetch(`/api/compositions/${compositionId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'generate',
          prompt: prompt.trim(),
          inputs: { clips: sources.map(s => s.path) },
          params: { name: name.trim() || undefined },
        }),
      });
      setSubmitted(true);
      setTimeout(() => setView('queue'), 1500);
    } catch (err) {
      console.error('Failed to create composition:', err);
    } finally {
      setSubmitting(false);
    }
  }, [sources, prompt, name, setView]);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="text-[14px] text-emerald-400/80 font-mono">Composition queued</div>
        <div className="text-[11px] text-white/30 font-mono">Opening queue…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <button onClick={() => setView(null)} className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-[14px] font-medium text-white/90">New Composition</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto frame-scrollbar">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
          {/* Composition name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
              Composition Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Optional — auto-generated if blank"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[13px] text-white/80 font-mono placeholder:text-white/15 outline-none focus:border-cyan-400/30 transition-colors"
            />
          </div>

          {/* Source files/folders */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
              Source Files
            </label>

            {/* Drop zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-white/[0.08] hover:border-cyan-400/20 rounded-sm p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={24} className="text-white/15" />
              <div className="text-[12px] text-white/30 font-mono text-center">
                Drop files or folders here
              </div>
              <div className="text-[9px] text-white/15 font-mono text-center">
                mp4 · mov · mkv · webm · m4v · avi · mp3 · wav · aac · png · jpg · srt
              </div>
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                className="mt-1 text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 hover:text-cyan-300 px-2.5 py-1.5 border border-cyan-400/15 rounded-sm transition-colors"
              >
                Browse
              </button>
            </div>

            <input ref={fileRef} type="file" multiple accept=".mp4,.mov,.mkv,.avi,.webm,.m4v,.mxf,.prores,.ts,.flv,.mp3,.wav,.aac,.m4a,.ogg,.flac,.png,.jpg,.jpeg,.webp,.svg,.gif,.json,.srt,.vtt" className="hidden" onChange={e => addFiles(e.target.files)} />

            {/* Queued sources */}
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
          </div>

          {/* Agent prompt */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-white/25 mb-2">
              Instructions
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="What should the agent do with these files? e.g. 'Create a 60s highlight reel with transitions and background music'"
              rows={6}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2.5 text-[13px] text-white/80 font-mono placeholder:text-white/15 outline-none focus:border-cyan-400/30 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={sources.length === 0 || !prompt.trim() || submitting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-[12px] font-mono uppercase tracking-wider transition-all ${
                sources.length > 0 && prompt.trim()
                  ? 'bg-cyan-400/[0.1] border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/[0.15]'
                  : 'bg-white/[0.02] border border-white/[0.06] text-white/20 cursor-not-allowed'
              }`}
            >
              <Send size={12} />
              {submitting ? 'Creating…' : 'Create Composition'}
            </button>
            <button
              onClick={() => setView(null)}
              className="text-[11px] font-mono text-white/30 hover:text-white/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
