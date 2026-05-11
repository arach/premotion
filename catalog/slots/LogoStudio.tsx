'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Gem, Image as ImageIcon, Loader2, RefreshCw, RotateCcw, Send, Sparkles, Upload, X } from 'lucide-react';
import { useCatalog } from '../Provider';
import type { LogoAsset } from '@/lib/types';

type SubmitMode = 'brief' | 'render';

export function LogoStudio() {
  const { data, refreshCatalog } = useCatalog();
  const logos = useMemo(() => data?.logos ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (logos.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !logos.some(l => l.id === selectedId)) setSelectedId(logos[0].id);
  }, [logos, selectedId]);

  const selected = logos.find(l => l.id === selectedId) ?? logos[0] ?? null;

  return (
    <div className="grid grid-cols-[300px_1fr] h-full min-h-0">
      <aside className="min-h-0 overflow-y-auto frame-scrollbar border-r border-white/[0.04]">
        <header className="sticky top-0 z-10 bg-[#0a0b0e]/95 backdrop-blur-sm border-b border-white/[0.05] px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-cyan-300/80">
              <Gem size={13} />
              <span className="text-[11px] font-mono uppercase tracking-wider">Logos</span>
              <span className="text-[10px] font-mono text-white/30 tabular-nums">{logos.length}</span>
            </div>
            <button
              onClick={() => refreshCatalog()}
              className="p-1 rounded hover:bg-white/[0.05] text-white/35 hover:text-white/70"
              title="Refresh"
            >
              <RefreshCw size={11} />
            </button>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300/85 hover:text-cyan-200 bg-cyan-400/[0.06] hover:bg-cyan-400/10 border border-cyan-400/20 px-2 py-1.5 rounded-sm transition-colors"
          >
            <Upload size={11} />
            New logo
          </button>
        </header>

        <div className="p-2">
          {logos.length === 0 ? (
            <div className="px-3 py-8 text-center text-[11px] font-mono text-white/25">
              No logos yet — upload an SVG, PNG, or just type a prompt.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {logos.map(logo => (
                <LogoRow
                  key={logo.id}
                  logo={logo}
                  active={selected?.id === logo.id}
                  onSelect={() => setSelectedId(logo.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="min-h-0 overflow-y-auto frame-scrollbar">
        {selected ? <LogoDetail logo={selected} /> : (
          <div className="h-full flex items-center justify-center text-[12px] font-mono text-white/25">
            Select a logo
          </div>
        )}
      </main>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={async (id) => {
            await refreshCatalog();
            setSelectedId(id);
            setUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Row in the sidebar
// ─────────────────────────────────────────────────────────────────────────

function LogoRow({ logo, active, onSelect }: { logo: LogoAsset; active: boolean; onSelect: () => void }) {
  const SourceIcon = logo.source.kind === 'prompt-only' ? Sparkles : ImageIcon;
  const title = logo.title || logo.id;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left px-3 py-2.5 rounded border transition-colors ${
        active
          ? 'bg-cyan-400/[0.07] border-cyan-400/25'
          : 'bg-white/[0.015] border-white/[0.045] hover:bg-white/[0.04] hover:border-white/[0.1]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <SourceIcon size={12} className="shrink-0 text-cyan-300/65" />
        <span className="flex-1 text-[12px] truncate text-white/85">{title}</span>
        {logo.hasRender ? (
          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/70">ready</span>
        ) : (
          <span className="text-[9px] font-mono uppercase tracking-wider text-white/25">draft</span>
        )}
      </div>
      <div className="mt-1 text-[10px] font-mono text-white/35 truncate">
        {logo.source.kind === 'prompt-only'
          ? logo.lastPrompt ?? '(prompt-only)'
          : logo.source.filename ?? logo.source.path}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Detail pane
// ─────────────────────────────────────────────────────────────────────────

function LogoDetail({ logo }: { logo: LogoAsset }) {
  const { refreshCatalog } = useCatalog();
  const [prompt, setPrompt] = useState(logo.lastPrompt ?? '');
  const [submitting, setSubmitting] = useState<SubmitMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0); // bump to force iframe reload after a new render
  const [brief, setBrief] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(logo.lastPrompt ?? '');
    setError(null);
  }, [logo.id, logo.lastPrompt]);

  // Load brief.md content when available
  useEffect(() => {
    if (!logo.briefPath) { setBrief(null); return; }
    let cancelled = false;
    fetch(`${logo.briefPath}?t=${Date.now()}`).then(r => r.ok ? r.text() : null)
      .then(t => { if (!cancelled) setBrief(t); }).catch(() => {});
    return () => { cancelled = true; };
  }, [logo.briefPath, logo.id]);

  const submit = async (mode: SubmitMode) => {
    setSubmitting(mode);
    setError(null);
    try {
      const kind = mode === 'brief' ? 'logo-brief' : 'logo-render';
      const res = await fetch(`/api/compositions/${encodeURIComponent(logo.id)}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          prompt,
          inputs: {
            prompt,
            sourcePath: logo.source.path,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `${kind} failed (${res.status})`);
      }
      // Poll for completion — simple version: refresh catalog after a short delay
      // and bump iframe. Future: subscribe to job updates.
      await new Promise(r => setTimeout(r, 800));
      await pollUntilDone(logo.id, kind);
      await refreshCatalog();
      setIframeKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  };

  const isVideo = false; // logos are HTML, not video — kept for layout parity
  void isVideo;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Title bar */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <Gem size={13} className="text-cyan-300/80 shrink-0" />
          <h1 className="text-[13px] font-medium text-white/90 truncate">{logo.title || logo.id}</h1>
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/30 shrink-0">{logo.source.kind}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {logo.compositionPath && (
            <a
              href={logo.compositionPath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono uppercase tracking-wider text-white/35 hover:text-cyan-300/80 transition-colors"
            >
              open in new tab
            </a>
          )}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 min-h-0 bg-black/70 flex items-center justify-center p-4 overflow-hidden">
        {logo.compositionPath ? (
          <div className="relative w-full max-w-[1280px] aspect-video bg-black border border-white/[0.06] rounded-sm overflow-hidden shadow-2xl">
            <iframe
              key={`${logo.id}-${iframeKey}`}
              src={`${logo.compositionPath}?t=${iframeKey}`}
              title={`${logo.id} preview`}
              className="absolute inset-0 w-full h-full"
              style={{ transformOrigin: 'top left' }}
            />
            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="absolute top-2 right-2 p-1.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/80"
              title="Replay"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        ) : (
          <div className="text-center max-w-[480px]">
            <Sparkles size={28} className="mx-auto mb-3 text-cyan-300/40" />
            <div className="text-[12px] font-mono text-white/55 mb-1">No render yet</div>
            <div className="text-[10px] font-mono text-white/30">
              {logo.source.kind === 'prompt-only'
                ? 'Submit a render to generate the first take from your prompt.'
                : 'Source uploaded. Submit a render to animate it.'}
            </div>
          </div>
        )}
      </div>

      {/* Brief (if present) */}
      {brief && (
        <div className="shrink-0 max-h-[180px] overflow-y-auto px-4 py-3 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/30 mb-1.5">Motion brief</div>
          <pre className="text-[11px] font-mono leading-relaxed text-white/55 whitespace-pre-wrap">{brief}</pre>
        </div>
      )}

      {/* Prompt + submit */}
      <div className="shrink-0 border-t border-white/[0.06] p-4 bg-white/[0.01]">
        <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-white/35 mb-1.5">
          Motion prompt
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the motion — e.g. 'viewfinder corners draw in, cyan dot pulses, wordmark reveals left-to-right'"
          rows={3}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-2.5 py-2 text-[12px] text-white/85 font-mono placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-colors resize-y"
        />
        {error && (
          <div className="mt-2 text-[10px] font-mono text-red-300/80">{error}</div>
        )}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={() => submit('brief')}
            disabled={submitting !== null}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-white/55 hover:text-white/85 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting === 'brief' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Brief only
          </button>
          <button
            onClick={() => submit('render')}
            disabled={submitting !== null}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 hover:text-cyan-200 bg-cyan-400/[0.08] hover:bg-cyan-400/[0.14] border border-cyan-400/25 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting === 'render' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Render
          </button>
        </div>
        <div className="mt-2 text-[9px] font-mono text-white/25">
          Brief = motion plan markdown (cheaper). Render = full Hyperframe HTML (uses the brief if one exists).
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Upload modal
// ─────────────────────────────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (id: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        if (prompt.trim()) form.append('prompt', prompt.trim());
        if (title.trim()) form.append('title', title.trim());
        res = await fetch('/api/logos/upload', { method: 'POST', body: form });
      } else if (prompt.trim()) {
        res = await fetch('/api/logos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt.trim(), title: title.trim() || undefined }),
        });
      } else {
        setError('Drop a file or write a prompt.');
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      const body = await res.json();
      await onUploaded(body.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onMouseDown={onClose}>
      <div
        className="w-full max-w-[480px] bg-[#0c0d11] border border-white/[0.1] rounded-sm shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-cyan-300/80">
            <Upload size={13} />
            <span className="text-[11px] font-mono uppercase tracking-wider">New logo</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={14} /></button>
        </header>

        <div className="p-4 flex flex-col gap-3">
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-white/35 mb-1.5">
              Source file (optional)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => {
                e.preventDefault(); e.stopPropagation();
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
              className="border border-dashed border-white/[0.12] rounded-sm px-4 py-6 text-center cursor-pointer hover:border-cyan-400/30 transition-colors"
            >
              {file ? (
                <div className="text-[12px] font-mono text-white/80">
                  {file.name}
                  <div className="text-[10px] text-white/30 mt-0.5">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-white/35">
                  Drop SVG or PNG · or click to browse
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-white/35 mb-1.5">
              Title (optional)
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Premotion wordmark"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-2.5 py-1.5 text-[12px] text-white/85 font-mono placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[9px] font-mono uppercase tracking-[0.15em] text-white/35 mb-1.5">
              Motion prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="If no file: describe the logo. Otherwise: describe the motion."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-2.5 py-2 text-[12px] text-white/85 font-mono placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-colors resize-y"
            />
          </div>

          {error && <div className="text-[10px] font-mono text-red-300/80">{error}</div>}
        </div>

        <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="text-[11px] font-mono uppercase tracking-wider text-white/45 hover:text-white/75 px-2.5 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 hover:text-cyan-200 bg-cyan-400/[0.08] hover:bg-cyan-400/[0.14] border border-cyan-400/25 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
            Upload
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Job polling — simple version: poll job status by listing recent jobs for
// this compositionId and waiting until the matching kind reaches completed
// or failed. Caps at 90s to avoid hanging the UI.
// ─────────────────────────────────────────────────────────────────────────

async function pollUntilDone(compositionId: string, kind: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    try {
      const res = await fetch(`/api/compositions/${encodeURIComponent(compositionId)}/jobs`);
      if (res.ok) {
        const jobs = await res.json() as Array<{ kind: string; status: string }>;
        // Most recent jobs first; find the first one matching this kind.
        const latest = jobs.find(j => j.kind === kind);
        if (latest && (latest.status === 'completed' || latest.status === 'failed' || latest.status === 'canceled')) {
          return;
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
}
