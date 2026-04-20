'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCatalog } from '../Provider';
import { useReviewContext } from '../ReviewContext';
import { formatDuration, formatTime } from '@/lib/types';
import type { ReviewNote, ReviewNoteKind } from '@/lib/types';
import type { Composing } from '../hooks/useReview';

export function CatalogInspector() {
  const { selectedVideo, filter, counts, filteredVideos } = useCatalog();
  const review = useReviewContext();
  const [detailsOpen, setDetailsOpen] = useState(true);

  if (!selectedVideo) {
    return (
      <div className="flex flex-col h-full p-4 text-[11px] font-mono text-white/30">
        <div className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-2">
          Overview
        </div>
        <Row label="Filter" value={filter} />
        <Row label="Showing" value={`${filteredVideos.length} / ${counts.total}`} />
        <div className="mt-4 text-[9px] uppercase tracking-[0.15em] text-white/25 mb-2">
          Health
        </div>
        <Row label="Analysis" value={`${Math.round((counts.analyzed / Math.max(counts.total, 1)) * 100)}%`} />
        <Row label="Transcribed" value={`${Math.round((counts.transcribed / Math.max(counts.total, 1)) * 100)}%`} />
        <Row label="Reel Ready" value={`${Math.round((counts.reel / Math.max(counts.total, 1)) * 100)}%`} />
      </div>
    );
  }

  const v = selectedVideo;
  const hasNotes = review.notes.length > 0 || review.composing;

  return (
    <div className="flex flex-col h-full overflow-y-auto frame-scrollbar">
      {/* Details — collapsible */}
      <div className="border-b border-white/[0.04]">
        <button
          onClick={() => setDetailsOpen(o => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-[9px] font-mono uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition-colors"
        >
          {detailsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          Details
          {!detailsOpen && (
            <span className="ml-auto text-[10px] text-white/40 normal-case tracking-normal font-normal">
              {v.app} · {formatDuration(v.duration)} · {v.resolution}
            </span>
          )}
        </button>
        {detailsOpen && (
          <div className="px-4 pb-3 text-[11px]">
            <Row label="App" value={v.app} />
            <Row label="Duration" value={formatDuration(v.duration)} />
            <Row label="Resolution" value={v.resolution} />
            <Row label="FPS" value={`${v.fps}`} />
            <Row label="Size" value={`${v.sizeMB.toFixed(1)} MB`} />
            <Row label="Codec" value={v.codec} />
            <Row label="Captured" value={v.capturedAt?.slice(0, 10) ?? '—'} />
            <Row label="Analysis" value={v.analysisStatus.replace('-', ' ')} />
            <Row label="Frames" value={v.frameCount != null ? `${v.frameCount}` : '—'} />
            {v.reelCandidate && <Row label="Reel" value="✓" />}
            {v.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {v.tags.map(t => (
                  <span key={t} className="text-[9px] font-mono text-white/40 px-1.5 py-0.5 rounded-sm bg-white/[0.03]">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback / Notes section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] shrink-0">
          <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/30">
            Feedback{review.notes.length > 0 && ` · ${review.notes.length}`}
          </div>
          {review.notes.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={review.handleCopy}
                className="text-white/30 hover:text-white/60 transition-colors"
                title="Copy as prompt"
              >
                {review.copyState === 'copied' ? <Check size={10} /> : <Copy size={10} />}
              </button>
              <button
                onClick={review.handleDownload}
                className="text-white/30 hover:text-white/60 transition-colors"
                title="Download .md"
              >
                <Download size={10} />
              </button>
            </div>
          )}
        </div>

        {review.composing && (
          <ComposeForm
            composing={review.composing}
            onChange={patch => review.setComposing(c => (c ? { ...c, ...patch } : c))}
            onSave={review.saveCompose}
            onCancel={review.cancelCompose}
            onClearRect={() => review.setComposing(c => (c ? { ...c, rect: undefined } : c))}
          />
        )}

        {!review.composing && (
          <div className="px-4 py-2 shrink-0">
            <button
              onClick={review.startCompose}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] px-2 py-1.5 rounded-sm transition-colors"
            >
              <Plus size={10} />
              Note at {formatTime(review.currentTime)}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {review.sortedNotes.map((n, i) => (
            <NoteRow
              key={n.id}
              index={i + 1}
              note={n}
              active={Math.abs(n.time - review.currentTime) < 0.5}
              editing={review.composing?.editId === n.id}
              onSeek={() => review.seek(n.time)}
              onEdit={() => review.editNote(n)}
              onDelete={() => review.deleteNote(n.id)}
            />
          ))}
          {review.sortedNotes.length === 0 && !review.composing && (
            <div className="text-[10px] font-mono text-white/15 py-6 text-center">
              No notes yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ComposeForm({
  composing,
  onChange,
  onSave,
  onCancel,
  onClearRect,
}: {
  composing: Composing;
  onChange: (patch: Partial<Composing>) => void;
  onSave: () => void;
  onCancel: () => void;
  onClearRect: () => void;
}) {
  const zoomNeedsRect = composing.kind === 'zoom' && !composing.rect;
  const canSave = !zoomNeedsRect && (composing.comment.trim().length > 0 || !!composing.rect);
  return (
    <div className="px-4 py-3 border-b border-white/[0.04] bg-cyan-400/[0.02] shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/90">
          {composing.editId ? 'Edit' : 'New note'}
        </span>
        <span className="text-[10px] font-mono text-white/40 tabular-nums">{formatTime(composing.time)}</span>
        {composing.rect && (
          <button
            onClick={onClearRect}
            className="ml-auto flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={9} /> Clear
          </button>
        )}
      </div>
      <div className="flex gap-1 mb-2">
        <KindPill kind="feedback" active={composing.kind === 'feedback'} onClick={() => onChange({ kind: 'feedback' })} />
        <KindPill kind="zoom" active={composing.kind === 'zoom'} onClick={() => onChange({ kind: 'zoom' })} />
      </div>
      <textarea
        autoFocus
        value={composing.comment}
        onChange={e => onChange({ comment: e.target.value })}
        placeholder={composing.kind === 'zoom' ? 'Why zoom here?' : 'What needs to change?'}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSave) {
            e.preventDefault();
            onSave();
          }
        }}
        rows={3}
        className="w-full text-[12px] bg-black/40 border border-white/[0.06] rounded-sm px-2 py-1.5 text-white/85 placeholder:text-white/25 resize-none focus:outline-none focus:border-cyan-400/40"
      />
      {zoomNeedsRect && (
        <div className="text-[9px] font-mono text-amber-300/70 mt-1">Drag on video to select area</div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onSave}
          disabled={!canSave}
          className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300/90 hover:text-cyan-200 disabled:opacity-30 disabled:pointer-events-none bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded-sm transition-colors"
        >
          <Check size={10} /> Save
        </button>
        <button
          onClick={onCancel}
          className="text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function KindPill({ kind, active, onClick }: { kind: ReviewNoteKind; active: boolean; onClick: () => void }) {
  const classes =
    kind === 'zoom'
      ? active ? 'bg-amber-400/15 text-amber-200 border-amber-400/30' : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/70'
      : active ? 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/70';
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm border transition-colors ${classes}`}
    >
      {kind}
    </button>
  );
}

function NoteRow({
  index,
  note,
  active,
  editing,
  onSeek,
  onEdit,
  onDelete,
}: {
  index: number;
  note: ReviewNote;
  active: boolean;
  editing: boolean;
  onSeek: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = note.kind === 'zoom' ? 'bg-amber-400/20 text-amber-200' : 'bg-emerald-400/20 text-emerald-200';
  return (
    <div
      className={`group px-4 py-2 border-b border-white/[0.03] cursor-pointer transition-colors ${
        editing ? 'bg-cyan-400/[0.05]' : active ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
      onClick={onSeek}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[9px] font-mono text-white/25 tabular-nums">{index}</span>
        <span className="text-[9px] font-mono text-white/50 tabular-nums">{formatTime(note.time)}</span>
        <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.5 rounded-sm ${badge}`}>{note.kind}</span>
        {note.rect && <span className="text-[8px] text-white/25">■</span>}
        <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="text-[8px] font-mono uppercase text-white/40 hover:text-white/80">Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="text-white/30 hover:text-red-300 transition-colors"><Trash2 size={9} /></button>
        </div>
      </div>
      <div className="text-[11px] text-white/60 leading-snug pl-4 line-clamp-2">
        {note.comment || <span className="text-white/25 italic">(no comment)</span>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">{label}</span>
      <span className="text-[11px] text-white/70 font-mono truncate ml-2">{value}</span>
    </div>
  );
}
