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
  snippetCategory: string;
  setSnippetCategory: (c: string) => void;

  // Derived
  selectedVideo: Video | null;
  filteredVideos: Video[];
  filteredSnippets: CuratedSnippet[];
  appBreakdown: Record<string, number>;
  counts: {
    total: number;
    analyzed: number;
    transcribed: number;
    reel: number;
    curated: number;
    orphans: number;
  };
  snippetCategoryCounts: Record<string, number>;

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
  const frameParam = searchParams.get('frame');
  const frameIndex = frameParam != null && frameParam !== '' && !Number.isNaN(Number(frameParam))
    ? Number(frameParam)
    : null;
  const snippetCategory = searchParams.get('category') ?? 'all';

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
      writeParams(p => p.set('video', id));
    },
    [writeParams],
  );

  const closeVideo = useCallback(() => {
    writeParams(p => {
      p.delete('video');
      p.delete('frame');
    });
  }, [writeParams]);

  const openFrame = useCallback(
    (idx: number) => {
      writeParams(p => p.set('frame', String(idx)));
    },
    [writeParams],
  );

  const closeFrame = useCallback(() => {
    writeParams(p => p.delete('frame'));
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

  const appBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    data?.videos.forEach(v => {
      m[v.app] = (m[v.app] ?? 0) + 1;
    });
    return m;
  }, [data]);

  const counts = useMemo(
    () => ({
      total: data?.videos.length ?? 0,
      analyzed:
        data?.videos.filter(
          v =>
            v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed',
        ).length ?? 0,
      transcribed: data?.videos.filter(v => v.transcript || v.srt).length ?? 0,
      reel: data?.videos.filter(v => v.reelCandidate).length ?? 0,
      curated: snippets.length,
      orphans: data?.orphanStoryboards?.length ?? 0,
    }),
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
      if (filter === 'analyzed') {
        vs = vs.filter(
          v =>
            v.analysisStatus === 'complete' || v.analysisStatus === 'analyzed',
        );
      } else if (filter === 'needs-work') {
        vs = vs.filter(
          v =>
            v.analysisStatus === 'none' || v.analysisStatus === 'frames-only',
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
    return vs;
  }, [data, filter, search]);

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
      snippetCategory,
      setSnippetCategory,
      selectedVideo,
      filteredVideos,
      filteredSnippets,
      appBreakdown,
      counts,
      snippetCategoryCounts,
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
      snippetCategory,
      setSnippetCategory,
      selectedVideo,
      filteredVideos,
      filteredSnippets,
      appBreakdown,
      counts,
      snippetCategoryCounts,
      lightbox,
      openLightbox,
      closeLightbox,
    ],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}
