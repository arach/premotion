'use client';

import { createElement, useMemo, type ReactNode } from 'react';
import type { CommandOption, SearchConfig, StatusColor } from '@hudsonos/sdk';
import { useCatalog } from './Provider';

// ---------------------------------------------------------------------------
// useCommands — filters + navigation shortcuts
// ---------------------------------------------------------------------------
export function useCatalogCommands(): CommandOption[] {
  const { setFilter, closeVideo, videoId } = useCatalog();

  return useMemo<CommandOption[]>(
    () => [
      { id: 'filter:all', label: 'Show All Videos', action: () => setFilter('all') },
      { id: 'filter:curated', label: 'Show Curated Snippets', action: () => setFilter('curated') },
      { id: 'filter:analyzed', label: 'Filter: Analyzed', action: () => setFilter('analyzed') },
      { id: 'filter:needs-work', label: 'Filter: Needs Work', action: () => setFilter('needs-work') },
      { id: 'filter:transcribed', label: 'Filter: Transcribed', action: () => setFilter('transcribed') },
      { id: 'filter:reel', label: 'Filter: Reel Candidates', action: () => setFilter('reel') },
      ...(videoId
        ? [{ id: 'nav:back', label: 'Back to Catalog', action: closeVideo, shortcut: 'Esc' }]
        : []),
    ],
    [setFilter, closeVideo, videoId],
  );
}

// ---------------------------------------------------------------------------
// useStatus — total count + state color
// ---------------------------------------------------------------------------
export function useCatalogStatus(): { label: string; color: StatusColor } {
  const { loading, filteredVideos, data, filter, filteredSnippets, view } = useCatalog();
  if (loading) return { label: 'loading…', color: 'amber' };
  if (filter === 'curated') {
    return { label: `${filteredSnippets.length} snippets`, color: 'emerald' };
  }
  if (view === 'assets') {
    const source = (data?.videos ?? []).filter(v => v.stage === 'source' || !v.stage);
    return { label: `${source.length} assets`, color: 'emerald' };
  }
  if (view === 'queue') {
    return { label: 'queue', color: 'emerald' };
  }
  const finals = filteredVideos.filter(v => v.stage === 'final');
  return { label: `${finals.length} videos`, color: 'emerald' };
}

// ---------------------------------------------------------------------------
// useSearch — nav-bar search input wiring
// ---------------------------------------------------------------------------
export function useCatalogSearch(): SearchConfig {
  const { search, setSearch } = useCatalog();
  return {
    value: search,
    onChange: setSearch,
    placeholder: 'Search videos, tags, transcripts…',
  };
}

// ---------------------------------------------------------------------------
// useNavCenter — breadcrumb when in detail view
// ---------------------------------------------------------------------------
export function useCatalogNavCenter(): ReactNode | null {
  const { selectedVideo, closeVideo } = useCatalog();
  if (!selectedVideo) return null;
  return createElement(
    'button',
    {
      onClick: closeVideo,
      className:
        'text-[10px] font-mono text-neutral-400 hover:text-neutral-200 tracking-wider uppercase transition-colors',
    },
    `← Catalog / ${selectedVideo.id}`,
  );
}

// ---------------------------------------------------------------------------
// useNavActions — resolution/duration chip when in detail view
// ---------------------------------------------------------------------------
export function useCatalogNavActions(): ReactNode | null {
  const { selectedVideo } = useCatalog();
  if (!selectedVideo) return null;
  return createElement(
    'span',
    { className: 'text-[11px] font-mono text-neutral-400' },
    `${selectedVideo.resolution} · ${Math.round(selectedVideo.duration)}s`,
  );
}

// ---------------------------------------------------------------------------
// useLayoutMode
// ---------------------------------------------------------------------------
export function useCatalogLayoutMode(): 'canvas' | 'panel' {
  return 'panel';
}
