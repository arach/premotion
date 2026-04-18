import React, { useEffect, useState } from "react";
import type { CatalogData, CuratedSnippet, CuratedSnippetsData, Video } from "./types";
import { Sidebar } from "./components/Sidebar";
import { VideoCard } from "./components/VideoCard";
import { SnippetCard } from "./components/SnippetCard";
import { Lightbox } from "./components/Lightbox";
import { FrameViewer } from "./components/FrameViewer";
import { VideoDetail } from "./components/VideoDetail";
import "./app.css";

export function App() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [snippetsData, setSnippetsData] = useState<CuratedSnippetsData | null>(null);
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

  useEffect(() => {
    fetch("/catalog-data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);

    fetch("/curated-snippets.json")
      .then((r) => r.json())
      .then(setSnippetsData)
      .catch(console.error);
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
  };

  const isCurated = filter === "curated";

  const snippetCategoryCounts: Record<string, number> = {};
  allSnippets.forEach((s) => {
    snippetCategoryCounts[s.category] = (snippetCategoryCounts[s.category] || 0) + 1;
  });

  return (
    <div className="app">
      <Sidebar
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

        {isCurated ? (
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
