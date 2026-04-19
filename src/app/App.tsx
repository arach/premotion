import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { CatalogData, CuratedSnippet, CuratedSnippetsData, Video, Render } from "./types";
import { Sidebar } from "./components/Sidebar";
import { VideoCard } from "./components/VideoCard";
import { SnippetCard } from "./components/SnippetCard";
import { Lightbox } from "./components/Lightbox";
import { FrameViewer } from "./components/FrameViewer";
import { VideoDetail } from "./components/VideoDetail";
import { RenderCard } from "./components/RenderCard";
import "./app.css";

export function App() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [snippetsData, setSnippetsData] = useState<CuratedSnippetsData | null>(null);
  const initSection = (): "sources" | "renders" => {
    const hash = window.location.hash.replace("#/", "");
    return hash === "renders" ? "renders" : "sources";
  };
  const [section, setSectionRaw] = useState<"sources" | "renders">(initSection);
  const setSection = useCallback((s: "sources" | "renders") => {
    setSectionRaw(s);
    window.location.hash = s === "renders" ? "#/renders" : "#/sources";
  }, []);
  const [filter, setFilter] = useState("all");
  const [snippetCategoryFilter, setSnippetCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<{
    src: string;
    time: string;
    desc: string;
    tags: string[];
  } | null>(null);
  const [frameViewer, setFrameViewer] = useState<{
    video: Video;
    startIndex: number;
  } | null>(null);
  const [detailVideo, setDetailVideo] = useState<Video | null>(null);
  const [renders, setRenders] = useState<Render[]>([]);
  const [renderProjectFilter, setRenderProjectFilter] = useState("all");

  useEffect(() => {
    fetch("/catalog-data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);

    fetch("/curated-snippets.json")
      .then((r) => r.json())
      .then(setSnippetsData)
      .catch(console.error);

    fetch("/api/renders")
      .then((r) => r.json())
      .then((d) => setRenders(d.renders || []))
      .catch(console.error);

    const onHash = () => {
      const hash = window.location.hash.replace("#/", "");
      setSectionRaw(hash === "renders" ? "renders" : "sources");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const handleFeedbackSaved = useCallback((name: string, rating: string, notes: string) => {
    setRenders((prev) =>
      prev.map((r) =>
        r.name === name
          ? { ...r, feedback: { rating, notes, updatedAt: new Date().toISOString() } }
          : r
      )
    );
  }, []);

  if (!data) {
    return (
      <div className="loading">
        <div className="loader-bars">
          <div className="loader-bar" />
          <div className="loader-bar" />
          <div className="loader-bar" />
          <div className="loader-bar" />
          <div className="loader-bar" />
        </div>
        <div className="loader-text">Loading catalog</div>
      </div>
    );
  }

  // Detail page view
  if (detailVideo) {
    return (
      <div className="app">
        <Sidebar
          section={section}
          onSection={(s) => { setSection(s); setDetailVideo(null); }}
          filter={filter}
          onFilter={(f) => {
            setDetailVideo(null);
            setFilter(f);
            if (f !== "curated") setSnippetCategoryFilter("all");
          }}
          search={search}
          onSearch={setSearch}
          apps={(() => {
            const apps: Record<string, number> = {};
            data.videos.forEach((v) => { apps[v.app] = (apps[v.app] || 0) + 1; });
            return apps;
          })()}
          counts={{
            total: data.videos.length,
            analyzed: data.videos.filter((v) => v.analysisStatus === "complete" || v.analysisStatus === "analyzed").length,
            transcribed: data.videos.filter((v) => v.transcript || v.srt).length,
            reel: data.videos.filter((v) => v.reelCandidate).length,
            orphans: data.orphanStoryboards?.length || 0,
            curated: snippetsData?.snippets?.length || 0,
            renders: renders.length,
          }}
        />
        <main className="main">
          <VideoDetail
            video={detailVideo}
            onBack={() => setDetailVideo(null)}
            onOpenFrameViewer={(video, idx) => setFrameViewer({ video, startIndex: idx })}
          />
        </main>
        {frameViewer && (
          <FrameViewer
            video={frameViewer.video}
            startIndex={frameViewer.startIndex}
            onClose={() => setFrameViewer(null)}
          />
        )}
      </div>
    );
  }

  const allSnippets = snippetsData?.snippets || [];

  let videos = data.videos;

  if (filter !== "all" && filter !== "curated") {
    if (filter === "analyzed") {
      videos = videos.filter(
        (v) =>
          v.analysisStatus === "complete" || v.analysisStatus === "analyzed"
      );
    } else if (filter === "needs-work") {
      videos = videos.filter(
        (v) =>
          v.analysisStatus === "none" || v.analysisStatus === "frames-only"
      );
    } else if (filter === "transcribed") {
      videos = videos.filter((v) => v.transcript || v.srt);
    } else if (filter === "reel") {
      videos = videos.filter((v) => v.reelCandidate);
    } else {
      videos = videos.filter((v) => v.app === filter);
    }
  }

  if (search) {
    const q = search.toLowerCase();
    videos = videos.filter((v) => {
      const haystack = [v.id, v.filename, v.description, v.app, ...(v.tags || [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  let filteredSnippets = allSnippets;
  if (search) {
    const q = search.toLowerCase();
    filteredSnippets = filteredSnippets.filter((s) => {
      const haystack = [s.id, s.source, s.description, s.category, ...s.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  if (snippetCategoryFilter !== "all") {
    filteredSnippets = filteredSnippets.filter(
      (s) => s.category === snippetCategoryFilter
    );
  }

  const apps: Record<string, number> = {};
  data.videos.forEach((v) => {
    apps[v.app] = (apps[v.app] || 0) + 1;
  });

  const counts = {
    total: data.videos.length,
    analyzed: data.videos.filter(
      (v) => v.analysisStatus === "complete" || v.analysisStatus === "analyzed"
    ).length,
    transcribed: data.videos.filter((v) => v.transcript || v.srt).length,
    reel: data.videos.filter((v) => v.reelCandidate).length,
    orphans: data.orphanStoryboards?.length || 0,
    curated: allSnippets.length,
    renders: renders.length,
  };

  const isCurated = filter === "curated";

  const snippetCategoryCounts: Record<string, number> = {};
  allSnippets.forEach((s) => {
    snippetCategoryCounts[s.category] = (snippetCategoryCounts[s.category] || 0) + 1;
  });

  return (
    <div className="app">
      <Sidebar
        section={section}
        onSection={setSection}
        filter={filter}
        onFilter={(f) => {
          setFilter(f);
          if (f !== "curated") setSnippetCategoryFilter("all");
        }}
        search={search}
        onSearch={setSearch}
        apps={apps}
        counts={counts}
      />
      <main className="main">
        <div className="stats-row">
          <Stat value={counts.total} label="VIDEOS" />
          <Stat value={counts.analyzed} label="ANALYZED" />
          <Stat value={counts.transcribed} label="TRANSCRIBED" />
          <Stat value={counts.reel} label="REEL READY" />
          <Stat value={counts.curated} label="CURATED" />
        </div>

        {section === "renders" ? (
          <RendersSection
            renders={renders}
            search={search}
            projectFilter={renderProjectFilter}
            onProjectFilter={setRenderProjectFilter}
            onFeedbackSaved={handleFeedbackSaved}
          />
        ) : isCurated ? (
          <CuratedSection
            snippets={filteredSnippets}
            allSnippets={allSnippets}
            categoryFilter={snippetCategoryFilter}
            onCategoryFilter={setSnippetCategoryFilter}
            categoryCounts={snippetCategoryCounts}
            onOpenLightbox={setLightbox}
          />
        ) : (
          <>
            {(() => {
              const hasData = videos.filter((v) => v.frames && v.frames.length > 0);
              const empty = videos.filter((v) => !v.frames || v.frames.length === 0);
              return (
                <>
                  {hasData.length > 0 && (
                    <>
                      <div className="bucket-label">{hasData.length} indexed</div>
                      <div className="video-grid">
                        {hasData.map((v) => (
                          <VideoCard
                            key={v.id}
                            video={v}
                            onOpenLightbox={setLightbox}
                            onOpenFrameViewer={(video, idx) => setFrameViewer({ video, startIndex: idx })}
                            onOpenDetail={setDetailVideo}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {empty.length > 0 && (
                    <>
                      <div className="bucket-label">{empty.length} unprocessed</div>
                      <div className="video-grid video-grid-empty">
                        {empty.map((v) => (
                          <VideoCard
                            key={v.id}
                            video={v}
                            onOpenLightbox={setLightbox}
                            onOpenFrameViewer={(video, idx) => setFrameViewer({ video, startIndex: idx })}
                            onOpenDetail={setDetailVideo}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {videos.length === 0 && (
                    <div className="empty">No videos match the current filter</div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </main>
      {lightbox && (
        <Lightbox {...lightbox} onClose={() => setLightbox(null)} />
      )}
      {frameViewer && (
        <FrameViewer
          video={frameViewer.video}
          startIndex={frameViewer.startIndex}
          onClose={() => setFrameViewer(null)}
        />
      )}
    </div>
  );
}

function CuratedSection({
  snippets,
  allSnippets,
  categoryFilter,
  onCategoryFilter,
  categoryCounts,
  onOpenLightbox,
}: {
  snippets: CuratedSnippet[];
  allSnippets: CuratedSnippet[];
  categoryFilter: string;
  onCategoryFilter: (c: string) => void;
  categoryCounts: Record<string, number>;
  onOpenLightbox: (data: { src: string; time: string; desc: string; tags: string[] }) => void;
}) {
  const categories = ["all", "capture", "read", "listen", "explore"];
  const fiveStarCount = allSnippets.filter((s) => s.rating === 5).length;
  const fourStarCount = allSnippets.filter((s) => s.rating === 4).length;

  return (
    <>
      <div className="curated-header">
        <div className="curated-title">CURATED SNIPPETS</div>
        <div className="curated-subtitle">
          Best moments from Talkie Capture & Read demos
          <span className="curated-meta">
            {fiveStarCount} top-rated / {fourStarCount} strong / {allSnippets.length} total
          </span>
        </div>
      </div>
      <div className="curated-filters">
        {categories.map((c) => (
          <button
            key={c}
            className={`curated-filter-btn ${categoryFilter === c ? "active" : ""}`}
            onClick={() => onCategoryFilter(c)}
          >
            {c === "all" ? "ALL" : c.toUpperCase()}
            <span className="curated-filter-count">
              {c === "all" ? allSnippets.length : categoryCounts[c] || 0}
            </span>
          </button>
        ))}
      </div>
      {snippets.length > 0 ? (
        <div className="snippet-grid">
          {snippets.map((s) => (
            <SnippetCard key={s.id} snippet={s} onOpenLightbox={onOpenLightbox} />
          ))}
        </div>
      ) : (
        <div className="empty">No snippets match the current filter</div>
      )}
    </>
  );
}

type SortKey = "recent" | "name" | "duration" | "size";

function RendersSection({
  renders,
  search,
  projectFilter,
  onProjectFilter,
  onFeedbackSaved,
}: {
  renders: Render[];
  search: string;
  projectFilter: string;
  onProjectFilter: (p: string) => void;
  onFeedbackSaved: (name: string, rating: string, notes: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("recent");

  const projectCounts: Record<string, number> = {};
  renders.forEach((r) => {
    projectCounts[r.project] = (projectCounts[r.project] || 0) + 1;
  });

  const ratingCounts = useMemo(() => {
    const counts: Record<string, number> = { rated: 0, unrated: 0, ship: 0, strong: 0, kill: 0 };
    renders.forEach((r) => {
      if (r.feedback?.rating) {
        counts.rated++;
        counts[r.feedback.rating] = (counts[r.feedback.rating] || 0) + 1;
      } else {
        counts.unrated++;
      }
    });
    return counts;
  }, [renders]);

  let filtered = renders;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) =>
      [r.name, r.project].join(" ").toLowerCase().includes(q)
    );
  }
  if (projectFilter !== "all") {
    filtered = filtered.filter((r) => r.project === projectFilter);
  }

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "recent": return arr.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      case "name": return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "duration": return arr.sort((a, b) => b.duration - a.duration);
      case "size": return arr.sort((a, b) => b.sizeMB - a.sizeMB);
    }
  }, [filtered, sort]);

  const projects = Object.entries(projectCounts).sort((a, b) => b[1] - a[1]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "recent", label: "Recent" },
    { key: "name", label: "Name" },
    { key: "duration", label: "Duration" },
    { key: "size", label: "Size" },
  ];

  return (
    <>
      <div className="renders-header">
        <div className="renders-title">FINISHED VIDEOS</div>
        <div className="renders-subtitle">
          {renders.length} rendered
          <span className="renders-meta">
            {ratingCounts.ship || 0} ship / {ratingCounts.strong || 0} strong / {ratingCounts.unrated} unrated
          </span>
        </div>
      </div>
      <div className="renders-toolbar">
        <div className="renders-filters">
          <button
            className={`curated-filter-btn ${projectFilter === "all" ? "active" : ""}`}
            onClick={() => onProjectFilter("all")}
          >
            ALL <span className="curated-filter-count">{renders.length}</span>
          </button>
          {projects.map(([p, count]) => (
            <button
              key={p}
              className={`curated-filter-btn ${projectFilter === p ? "active" : ""}`}
              onClick={() => onProjectFilter(p)}
            >
              {p.toUpperCase()} <span className="curated-filter-count">{count}</span>
            </button>
          ))}
        </div>
        <div className="renders-sort">
          {sortOptions.map((o) => (
            <button
              key={o.key}
              className={`sort-btn ${sort === o.key ? "active" : ""}`}
              onClick={() => setSort(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {sorted.length > 0 ? (
        <div className="renders-grid">
          {sorted.map((r) => (
            <RenderCard key={r.name} render={r} onFeedbackSaved={onFeedbackSaved} />
          ))}
        </div>
      ) : (
        <div className="empty">No renders match the current filter/search</div>
      )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
