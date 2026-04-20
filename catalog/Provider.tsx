'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  CatalogData,
  CuratedSnippet,
  CuratedSnippetsData,
  Video,
} from '@/lib/types';
import { ReviewProvider } from './ReviewContext';

// ---------------------------------------------------------------------------
// Lightbox state — transient UI, not URL-backed
// ---------------------------------------------------------------------------
export interface LightboxState {
  src: string;
  time: string;
  desc: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------
export interface CatalogContextValue {
  // Loaded data
  data: CatalogData | null;
  snippets: CuratedSnippet[];
  loading: boolean;

  // URL-backed state
  filter: string;
  setFilter: (f: string) => void;
  search: string;
  setSearch: (q: string) => void;
  videoId: string | null;
  openVideo: (id: string) => void;
  closeVideo: () => void;
  frameIndex: number | null;
  openFrame: (idx: number) => void;
  closeFrame: () => void;
  reviewOpen: boolean;
  openReview: () => void;
  closeReview: () => void;
  snippetCategory: string;
  setSnippetCategory: (c: string) => void;
  sort: string;
  setSort: (s: string) => void;

  // Project context — anchors left panel to a "project" video
  projectId: string | null;
  projectVideo: Video | null;
  openProjectInput: (id: string) => void;
  closeProjectInput: () => void;

  // Derived
  selectedVideo: Video | null;
  filteredVideos: Video[];
  filteredSnippets: CuratedSnippet[];
  appBreakdown: Record<string, number>;
  counts: {
    total: number;
    source: number;
    wip: number;
    final: number;
    analyzed: number;
    needsWork: number;
    transcribed: number;
    reel: number;
    curated: number;
    orphans: number;
  };
  snippetCategoryCounts: Record<string, number>;

  // Actions
  deleteVideo: (id: string) => Promise<void>;

  // View state
  view: string | null;
  setView: (v: string | null) => void;
  pendingFiles: string[];
  setPendingFiles: (files: string[]) => void;

  // Code viewer (transient)
  viewingFile: string | null;
  openFile: (path: string) => void;
  closeFile: () => void;

  // Lightbox (transient)
  lightbox: LightboxState | null;
  openLightbox: (s: LightboxState) => void;
  closeLightbox: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function CatalogProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- URL-backed state ---
  const filter = searchParams.get('filter') ?? 'all';
  const search = searchParams.get('q') ?? '';
  const videoId = searchParams.get('video');
  const projectId = searchParams.get('project');
  const frameParam = searchParams.get('frame');
  const frameIndex = frameParam != null && frameParam !== '' && !Number.isNaN(Number(frameParam))
    ? Number(frameParam)
    : null;
  const reviewOpen = searchParams.get('review') === '1';
  const snippetCategory = searchParams.get('category') ?? 'all';
  const sort = searchParams.get('sort') ?? 'newest';

  const writeParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setFilter = useCallback(
    (f: string) => {
      writeParams(p => {
        if (f === 'all') p.delete('filter');
        else p.set('filter', f);
        if (f !== 'curated') p.delete('category');
      });
    },
    [writeParams],
  );

  const setSearch = useCallback(
    (q: string) => {
      writeParams(p => {
        if (!q) p.delete('q');
        else p.set('q', q);
      });
    },
    [writeParams],
  );

  const openVideo = useCallback(
    (id: string) => {
      writeParams(p => {
        p.set('video', id);
        p.set('project', id);
      });
    },
    [writeParams],
  );

  const closeVideo = useCallback(() => {
    writeParams(p => {
      p.delete('video');
      p.delete('project');
      p.delete('frame');
      p.delete('review');
    });
  }, [writeParams]);

  const openProjectInput = useCallback(
    (id: string) => {
      writeParams(p => p.set('video', id));
    },
    [writeParams],
  );

  const closeProjectInput = useCallback(() => {
    if (projectId) {
      writeParams(p => p.set('video', projectId));
    }
  }, [writeParams, projectId]);

  const openFrame = useCallback(
    (idx: number) => {
      writeParams(p => p.set('frame', String(idx)));
    },
    [writeParams],
  );

  const closeFrame = useCallback(() => {
    writeParams(p => p.delete('frame'));
  }, [writeParams]);

  const openReview = useCallback(() => {
    writeParams(p => {
      p.set('review', '1');
      p.delete('frame');
    });
  }, [writeParams]);

  const closeReview = useCallback(() => {
    writeParams(p => p.delete('review'));
  }, [writeParams]);

  const setSnippetCategory = useCallback(
    (c: string) => {
      writeParams(p => {
        if (c === 'all') p.delete('category');
        else p.set('category', c);
      });
    },
    [writeParams],
  );

  const setSort = useCallback(
    (s: string) => {
      writeParams(p => {
        if (s === 'newest') p.delete('sort');
        else p.set('sort', s);
      });
    },
    [writeParams],
  );

  // --- Data loading ---
  const [data, setData] = useState<CatalogData | null>(null);
  const [snippetsData, setSnippetsData] = useState<CuratedSnippetsData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/catalog-data.json').then(r => r.json()),
      fetch('/curated-snippets.json').then(r => r.json()),
    ])
      .then(([c, s]) => {
        if (cancelled) return;
        setData(c);
        setSnippetsData(s);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load catalog', err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Derived ---
  const snippets = snippetsData?.snippets ?? [];

  const selectedVideo = useMemo(
    () => (videoId ? data?.videos.find(v => v.id === videoId) ?? null : null),
    [data, videoId],
  );

  const projectVideo = useMemo(
    () => (projectId ? data?.videos.find(v => v.id === projectId) ?? null : null),
    [data, projectId],
  );

  const appBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    data?.videos.forEach(v => {
      m[v.app] = (m[v.app] ?? 0) + 1;
    });
    return m;
  }, [data]);

  const counts = useMemo(
    () => {
      const vs = data?.videos ?? [];
      const source = vs.filter(v => v.stage === 'source' || !v.stage);
      return {
        total: vs.length,
        source: source.length,
        wip: vs.filter(v => v.stage === 'wip').length,
        final: vs.filter(v => v.stage === 'final').length,
        analyzed: vs.filter(
          v => v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed',
        ).length,
        needsWork: source.filter(
          v => v.analysisStatus === 'none' || v.analysisStatus === 'frames-only',
        ).length,
        transcribed: vs.filter(v => v.transcript || v.srt).length,
        reel: vs.filter(v => v.reelCandidate).length,
        curated: snippets.length,
        orphans: data?.orphanStoryboards?.length ?? 0,
      };
    },
    [data, snippets.length],
  );

  const snippetCategoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    snippets.forEach(s => {
      m[s.category] = (m[s.category] ?? 0) + 1;
    });
    return m;
  }, [snippets]);

  const filteredVideos = useMemo(() => {
    if (!data) return [];
    let vs = data.videos;
    if (filter !== 'all' && filter !== 'curated') {
      if (filter === 'source') {
        vs = vs.filter(v => v.stage === 'source' || !v.stage);
      } else if (filter === 'wip') {
        vs = vs.filter(v => v.stage === 'wip');
      } else if (filter === 'final') {
        vs = vs.filter(v => v.stage === 'final');
      } else if (filter === 'analyzed') {
        vs = vs.filter(
          v =>
            v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed',
        );
      } else if (filter === 'needs-work') {
        vs = vs.filter(
          v =>
            (v.stage === 'source' || !v.stage) &&
            (v.analysisStatus === 'none' || v.analysisStatus === 'frames-only'),
        );
      } else if (filter === 'transcribed') {
        vs = vs.filter(v => v.transcript || v.srt);
      } else if (filter === 'reel') {
        vs = vs.filter(v => v.reelCandidate);
      } else {
        vs = vs.filter(v => v.app === filter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      vs = vs.filter(v =>
        [v.id, v.filename, v.description, v.app, ...(v.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    const sorted = [...vs];
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.capturedAt ?? 0).getTime() - new Date(b.capturedAt ?? 0).getTime());
        break;
      case 'longest':
        sorted.sort((a, b) => b.duration - a.duration);
        break;
      case 'shortest':
        sorted.sort((a, b) => a.duration - b.duration);
        break;
      case 'largest':
        sorted.sort((a, b) => b.sizeMB - a.sizeMB);
        break;
      case 'smallest':
        sorted.sort((a, b) => a.sizeMB - b.sizeMB);
        break;
      case 'name':
        sorted.sort((a, b) => a.id.localeCompare(b.id));
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.capturedAt ?? 0).getTime() - new Date(a.capturedAt ?? 0).getTime());
        break;
    }
    return sorted;
  }, [data, filter, search, sort]);

  const filteredSnippets = useMemo(() => {
    let ss = snippets;
    if (search) {
      const q = search.toLowerCase();
      ss = ss.filter(s =>
        [s.id, s.source, s.description, s.category, ...s.tags]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    if (snippetCategory !== 'all') {
      ss = ss.filter(s => s.category === snippetCategory);
    }
    return ss;
  }, [snippets, search, snippetCategory]);

  // --- Delete ---
  const deleteVideo = useCallback(async (id: string) => {
    const video = data?.videos.find(v => v.id === id);
    if (!video) return;
    if (!confirm(`Delete ${video.filename}?`)) return;
    try {
      const res = await fetch(`/api/catalog/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: video.videoUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(prev => prev ? {
        ...prev,
        videos: prev.videos.filter(v => v.id !== id),
      } : prev);
      if (videoId === id) closeVideo();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [data, videoId, closeVideo]);

  // --- View state ---
  const [view, setViewState] = useState<string | null>(null);
  const setView = useCallback((v: string | null) => setViewState(v), []);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);

  // --- Code viewer ---
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const openFile = useCallback((path: string) => setViewingFile(path), []);
  const closeFile = useCallback(() => setViewingFile(null), []);

  // --- Lightbox ---
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const openLightbox = useCallback((s: LightboxState) => setLightbox(s), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const value = useMemo<CatalogContextValue>(
    () => ({
      data,
      snippets,
      loading,
      filter,
      setFilter,
      search,
      setSearch,
      videoId,
      openVideo,
      closeVideo,
      frameIndex,
      openFrame,
      closeFrame,
      reviewOpen,
      openReview,
      closeReview,
      snippetCategory,
      setSnippetCategory,
      sort,
      setSort,
      projectId,
      projectVideo,
      openProjectInput,
      closeProjectInput,
      selectedVideo,
      filteredVideos,
      filteredSnippets,
      appBreakdown,
      counts,
      snippetCategoryCounts,
      deleteVideo,
      view,
      setView,
      pendingFiles,
      setPendingFiles,
      viewingFile,
      openFile,
      closeFile,
      lightbox,
      openLightbox,
      closeLightbox,
    }),
    [
      data,
      snippets,
      loading,
      filter,
      setFilter,
      search,
      setSearch,
      videoId,
      openVideo,
      closeVideo,
      frameIndex,
      openFrame,
      closeFrame,
      reviewOpen,
      openReview,
      closeReview,
      snippetCategory,
      setSnippetCategory,
      sort,
      setSort,
      projectId,
      projectVideo,
      openProjectInput,
      closeProjectInput,
      selectedVideo,
      filteredVideos,
      filteredSnippets,
      appBreakdown,
      counts,
      snippetCategoryCounts,
      deleteVideo,
      view,
      setView,
      pendingFiles,
      setPendingFiles,
      viewingFile,
      openFile,
      closeFile,
      lightbox,
      openLightbox,
      closeLightbox,
    ],
  );

  return (
    <CatalogContext.Provider value={value}>
      <ReviewProvider>{children}</ReviewProvider>
    </CatalogContext.Provider>
  );
}
