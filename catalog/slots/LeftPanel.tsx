'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Code2, FileCode2, FileVideo, Film, FolderOpen, Inbox, Music, Layers, Plus, Settings } from 'lucide-react';
import { useCatalog } from '../Provider';
import { formatDuration } from '@/lib/types';
import type { Video } from '@/lib/types';

export function CatalogLeftPanel() {
  const { projectVideo, projectId, videoId, data, openProjectInput, closeProjectInput, setView, view, setPendingFiles } = useCatalog();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    const names: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) names.push(entry.name);
      else if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) names.push(file.name);
      }
    }
    if (names.length > 0) {
      setPendingFiles(names);
      setView('new');
    }
  }, [setPendingFiles, setView]);

  if (projectVideo) {
    return (
      <ProjectPanel
        project={projectVideo}
        allVideos={data?.videos ?? []}
        isViewingInput={videoId !== projectId}
        onOpenInput={openProjectInput}
        onBackToProject={closeProjectInput}
      />
    );
  }

  const isVideos = !view;

  return (
    <div className="flex flex-col h-full py-3">
      {/* New project — also a drop zone */}
      <div className="px-3 mb-4">
        <button
          onClick={() => setView('new')}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-all border ${
            dragOver
              ? 'bg-cyan-400/[0.2] border-cyan-400/50 text-cyan-200 scale-[1.02]'
              : view === 'new'
                ? 'bg-cyan-400/[0.15] border-cyan-400/40 text-cyan-200'
                : 'bg-cyan-400/[0.08] border-cyan-400/20 text-cyan-300/90 hover:bg-cyan-400/[0.12] hover:text-cyan-200'
          }`}
        >
          <Plus size={12} />
          {dragOver ? 'Drop here' : 'New Composition'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-1">
        <NavItem icon={<Film size={14} />} label="Videos" active={isVideos} onClick={() => setView(null)} />
        <NavItem icon={<Inbox size={14} />} label="Queue" active={view === 'queue'} onClick={() => setView('queue')} />
        <NavItem icon={<FolderOpen size={14} />} label="Assets" active={view === 'assets'} onClick={() => setView('assets')} />
        <NavItem icon={<Music size={14} />} label="Music" active={view === 'music'} onClick={() => setView('music')} />
      </nav>

      <div className="flex-1" />

      {/* Bottom */}
      <nav className="flex flex-col gap-0.5 px-1 pt-2 border-t border-white/[0.04] mt-2">
        <NavItem icon={<Settings size={14} />} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-[12px] transition-colors ${
        active
          ? 'bg-white/[0.06] text-white/90'
          : 'text-white/40 hover:bg-white/[0.03] hover:text-white/60'
      }`}
    >
      <span className={active ? 'text-white/70' : 'text-white/25'}>{icon}</span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Project panel — anchored to the project video
// ---------------------------------------------------------------------------

function ProjectPanel({
  project,
  allVideos,
  isViewingInput,
  onOpenInput,
  onBackToProject,
}: {
  project: Video;
  allVideos: Video[];
  isViewingInput: boolean;
  onOpenInput: (id: string) => void;
  onBackToProject: () => void;
}) {
  const { openFile } = useCatalog();
  const isFinal = project.stage === 'final';
  const compositionId = isFinal ? inferComposition(project) : null;
  const codePath = compositionId ? inferCodePath(compositionId) : null;

  const sourceVideos = useMemo(() => {
    if (!project.app || project.app === 'other') return [];
    return allVideos
      .filter(v => v.app === project.app && (v.stage === 'source' || !v.stage) && v.id !== project.id)
      .slice(0, 12);
  }, [allVideos, project.app, project.id]);

  const audioFiles = useMemo(() => {
    if (!compositionId) return [];
    const lower = compositionId.toLowerCase();
    const tracks: string[] = [];
    if (lower.includes('hud') || lower.includes('hudson')) tracks.push('tracks/futuristic-synthwave.mp3');
    if (lower.includes('mj') || lower.includes('midjourney')) tracks.push('tracks/futuristic-synthwave.mp3');
    if (lower.includes('talkie')) tracks.push('tracks/frequency-synthwave.mp3');
    return [...new Set(tracks)];
  }, [compositionId]);

  const siblings = useMemo(() => {
    return allVideos
      .filter(v => v.app === project.app && v.stage === project.stage && v.id !== project.id)
      .slice(0, 8);
  }, [allVideos, project.app, project.stage, project.id]);

  return (
    <div className="flex flex-col h-full overflow-y-auto frame-scrollbar py-2">
      {/* Project header */}
      <div className="px-3 py-2 mb-1">
        <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/25 mb-1">Project</div>
        <div className="text-[12px] text-white/80 font-medium truncate">{project.id}</div>
        <div className="text-[10px] font-mono text-white/30 mt-0.5">
          {project.app} · {project.stage} · {formatDuration(project.duration)}
        </div>
      </div>

      {/* Back to project button */}
      {isViewingInput && (
        <div className="px-3 mb-2">
          <button
            onClick={onBackToProject}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300/80 hover:text-cyan-200 bg-cyan-400/[0.04] hover:bg-cyan-400/[0.08] border border-cyan-400/15 rounded-sm transition-colors"
          >
            <ArrowLeft size={10} />
            Back to {project.id}
          </button>
        </div>
      )}

      {/* Code */}
      {isFinal && compositionId && (
        <div className="mt-2">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white/25 flex items-center gap-1.5">
            <Code2 size={10} />
            Code
          </div>
          <div className="px-3 py-1">
            <div className="text-[11px] text-white/60 font-mono truncate mb-0.5">{compositionId}</div>
            {codePath && (
              <button
                onClick={() => {
                  const path = codePath.endsWith('/') ? codePath + 'index.tsx' : codePath;
                  openFile(path);
                }}
                className="flex items-center gap-1 text-[10px] text-cyan-400/50 hover:text-cyan-300 font-mono transition-colors"
              >
                <FileCode2 size={9} />
                <span className="truncate">{codePath}</span>
                <ChevronRight size={9} className="shrink-0" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Source videos */}
      {sourceVideos.length > 0 && (
        <div className="mt-3">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white/25 flex items-center gap-1.5">
            <FileVideo size={10} />
            Source Videos · {sourceVideos.length}
          </div>
          {sourceVideos.map(v => (
            <InputRow key={v.id} label={v.id} meta={formatDuration(v.duration)} onClick={() => onOpenInput(v.id)} />
          ))}
        </div>
      )}

      {/* Audio */}
      {audioFiles.length > 0 && (
        <div className="mt-3">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white/25 flex items-center gap-1.5">
            <Music size={10} />
            Audio
          </div>
          {audioFiles.map(f => (
            <div key={f} className="px-3 py-1.5 text-[10px] font-mono text-white/40 truncate">{f}</div>
          ))}
        </div>
      )}

      {/* Related */}
      {siblings.length > 0 && (
        <div className="mt-3">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white/25 flex items-center gap-1.5">
            <Layers size={10} />
            Related · {siblings.length}
          </div>
          {siblings.map(v => (
            <InputRow key={v.id} label={v.id} meta={formatDuration(v.duration)} onClick={() => onOpenInput(v.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function InputRow({ label, meta, onClick }: { label: string; meta: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/[0.03] transition-colors"
    >
      <span className="text-[11px] text-white/50 truncate flex-1">{label}</span>
      <span className="text-[9px] font-mono text-white/20 shrink-0">{meta}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferComposition(video: Video): string | null {
  if (video.composition) return video.composition;
  if (!video.videoUrl) return null;
  const filename = video.videoUrl.split('/').pop();
  if (!filename) return null;
  return filename.replace(/\.mp4$/i, '');
}

function inferCodePath(compositionId: string): string | null {
  const lower = compositionId.toLowerCase();
  if (lower.includes('audit')) return 'src/projects/audit-demo/AuditDemo.tsx';
  if (lower.includes('hostai')) return 'src/projects/hostai-montage/HostAIMontage.tsx';
  if (lower.includes('hudsonhighlight') || lower.includes('hudson-highlight')) return 'src/projects/hudson-highlight/HudsonHighlightReel.tsx';
  if (lower.includes('lattices')) return 'src/projects/lattices-highlight/LatticesUIHighlight.tsx';
  if (lower.includes('hud')) return 'src/HUDExperimentVideo.tsx';
  if (lower.includes('amp') || lower.includes('amplink')) return 'src/DemoVideo.tsx';
  if (lower.includes('scout')) return 'src/FullVideo.tsx';
  if (lower.includes('talkie')) return 'src/TalkieThumbnail.tsx';
  if (lower.includes('quote')) return 'src/QuoteVideo.tsx';
  if (lower.includes('montage')) return 'src/VideoMontage.tsx';
  return 'src/Root.tsx';
}

