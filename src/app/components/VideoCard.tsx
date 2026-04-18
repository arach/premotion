import React, { useState, useCallback, useMemo } from "react";
import type { Video, VisionTag } from "../types";
import { formatTime, formatDuration, statusBadgeClass } from "../utils";

interface LightboxData {
  src: string;
  time: string;
  desc: string;
  tags: string[];
}

type AnalyzeStatus = "idle" | "running" | "done" | "error";

interface Props {
  video: Video;
  onOpenLightbox: (data: LightboxData) => void;
  onOpenFrameViewer?: (video: Video, startIndex: number) => void;
  onOpenDetail?: (video: Video) => void;
}

export function VideoCard({ video, onOpenLightbox, onOpenFrameViewer, onOpenDetail }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus>("idle");
  const [analyzeLog, setAnalyzeLog] = useState<string[]>([]);
  const [hoverSceneIdx, setHoverSceneIdx] = useState<number | null>(null);
  const [hoverFrameIdx, setHoverFrameIdx] = useState<number | null>(null);

  const runAnalyze = useCallback(async () => {
    setAnalyzeStatus("running");
    setAnalyzeLog([]);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: video.id,
        sourcePath: video.sourcePath,
        filename: video.demosPath?.replace(/^demos\//, ""),
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setAnalyzeStatus("error");
      setAnalyzeLog([data.error]);
      return;
    }

    const poll = setInterval(async () => {
      const s = await fetch(`/api/status/${video.id}`).then((r) => r.json());
      setAnalyzeLog(s.log || []);
      if (s.status === "done" || s.status === "error") {
        setAnalyzeStatus(s.status);
        clearInterval(poll);
      }
    }, 1000);
  }, [video]);

  const tagMap: Record<string, VisionTag> = {};
  if (video.visionTags) {
    video.visionTags.forEach((t) => {
      tagMap[t.frameFile] = t;
    });
  }

  const scenes = video.edl?.scenes || video.scenes || [];
  const highlights = video.edl?.highlights || [];
  const hasFrames = video.frames && video.frames.length > 0;
  const previewFrames = hasFrames ? video.frames!.slice(0, 6) : [];

  const frameSceneMap = useMemo(() => {
    if (!hasFrames) return {};
    const map: Record<number, number> = {};
    video.frames!.forEach((f, fi) => {
      const tag = tagMap[f];
      if (tag?.time == null) return;
      for (let si = 0; si < scenes.length; si++) {
        const s = scenes[si];
        const start = s.start ?? s.time ?? 0;
        const end = s.end ?? Infinity;
        if (tag.time >= start && tag.time < end) {
          map[fi] = si;
          break;
        }
      }
    });
    return map;
  }, [video.frames, scenes, tagMap, hasFrames]);

  const sceneFrameMap = useMemo(() => {
    const map: Record<number, number[]> = {};
    Object.entries(frameSceneMap).forEach(([fi, si]) => {
      if (!map[si]) map[si] = [];
      map[si].push(Number(fi));
    });
    return map;
  }, [frameSceneMap]);

  const activeSceneIdx = hoverSceneIdx ?? (hoverFrameIdx != null ? frameSceneMap[hoverFrameIdx] ?? null : null);
  const activeFrameIdxs = hoverFrameIdx != null
    ? [hoverFrameIdx]
    : (hoverSceneIdx != null ? (sceneFrameMap[hoverSceneIdx] || []) : []);

  return (
    <div className={`video-card ${expanded ? "expanded" : ""}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <span className="badge badge-app">{video.app}</span>
        <span className="card-id">{video.id}</span>
        <div className="card-meta">
          <span>{video.resolution || ""}</span>
          <span>{formatDuration(video.duration)}</span>
          <span>{video.sizeMB ? `${video.sizeMB} MB` : ""}</span>
          {video.frameCount ? <span>{video.frameCount} frames</span> : null}
        </div>
        <span className={`badge ${statusBadgeClass(video.analysisStatus)}`}>
          {video.analysisStatus}
        </span>
        {video.reelCandidate && <span className="badge badge-reel">reel</span>}
        {onOpenDetail && (
          <span
            className="row-breakout"
            title="Open detail page"
            onClick={(e) => { e.stopPropagation(); onOpenDetail(video); }}
          >&rarr;</span>
        )}
        <span className="chevron">&#9654;</span>
      </div>

      {expanded && (
        <div className="card-body">
          {/* Hero frame strip */}
          {hasFrames ? (
            <div className="card-hero">
              <div className="hero-strip">
                {previewFrames.map((f, i) => {
                  const src = `demos/${video.storyboardDir}/${f}`;
                  const tag = tagMap[f];
                  const isLinked = activeFrameIdxs.includes(i);
                  return (
                    <div
                      key={f}
                      className={`hero-frame ${isLinked ? "hero-frame-active" : ""}`}
                      onClick={() => onOpenFrameViewer?.(video, i)}
                      onMouseEnter={() => setHoverFrameIdx(i)}
                      onMouseLeave={() => setHoverFrameIdx(null)}
                    >
                      <img src={src} alt={f} loading="lazy" />
                      {tag?.time != null && (
                        <span className="hero-time">{formatTime(tag.time)}</span>
                      )}
                    </div>
                  );
                })}
                {video.frames!.length > 6 && (
                  <div
                    className="hero-frame hero-more"
                    onClick={() => onOpenFrameViewer?.(video, 6)}
                  >
                    <span>+{video.frames!.length - 6}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card-hero card-hero-empty">
              {analyzeStatus === "idle" && (
                <button className="analyze-btn" onClick={runAnalyze}>
                  Analyze Video
                </button>
              )}
              {analyzeStatus === "running" && (
                <div className="analyze-running">
                  <span>Analyzing...</span>
                  {analyzeLog.length > 0 && (
                    <pre className="analyze-log">
                      {analyzeLog.slice(-8).join("")}
                    </pre>
                  )}
                </div>
              )}
              {analyzeStatus === "done" && (
                <span className="analyze-running">Done — reload to see results</span>
              )}
              {analyzeStatus === "error" && (
                <div className="analyze-running">
                  <span>Error</span>
                  <pre className="analyze-log">{analyzeLog.join("\n")}</pre>
                </div>
              )}
            </div>
          )}

          {/* Summary grid */}
          <div className="card-summary">
            <div className="summary-col summary-desc">
              <div className="section-title">Description</div>
              <p className="description">
                {video.description || "(no description)"}
              </p>
              {video.tags?.length > 0 && (
                <div className="tag-list">
                  {video.tags.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="summary-col summary-stats">
              <div className="summary-stat-grid">
                <SummaryStat label="Duration" value={formatDuration(video.duration)} />
                <SummaryStat label="Resolution" value={video.resolution} />
                <SummaryStat label="Scenes" value={scenes.length || "--"} />
                <SummaryStat label="Frames" value={video.frameCount || "--"} />
                <SummaryStat label="Highlights" value={highlights.length || "--"} />
                <SummaryStat
                  label="Active"
                  value={video.edl?.stats?.activeTime ? formatDuration(video.edl.stats.activeTime) : "--"}
                />
              </div>
            </div>
          </div>

          {/* Scenes preview */}
          {scenes.length > 0 && (
            <div className="card-section">
              <div className="section-title">
                Scenes ({scenes.length})
              </div>
              <div className="timeline">
                {scenes.map((s, i) => {
                  const start = s.start ?? s.time ?? 0;
                  const isLinked = activeSceneIdx === i;
                  return (
                    <div
                      key={i}
                      className={`timeline-row ${isLinked ? "timeline-row-active" : ""}`}
                      onMouseEnter={() => setHoverSceneIdx(i)}
                      onMouseLeave={() => setHoverSceneIdx(null)}
                    >
                      <span className="timeline-time">
                        {formatTime(start)}
                        {s.end != null ? ` \u2192 ${formatTime(s.end)}` : ""}
                      </span>
                      {s.activity && (
                        <span className={`timeline-activity ${s.activity}`}>
                          {s.activity}
                        </span>
                      )}
                      <span className="timeline-desc">
                        {s.description || "(no description)"}
                      </span>
                      {sceneFrameMap[i] && (
                        <span className="timeline-frame-count">
                          {sceneFrameMap[i].length}f
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Details button */}
          <div className="card-actions">
            {onOpenDetail && (
              <button className="detail-btn" onClick={() => onOpenDetail(video)}>
                View Full Details
              </button>
            )}
            {hasFrames && onOpenFrameViewer && (
              <button className="detail-btn detail-btn-secondary" onClick={() => onOpenFrameViewer(video, 0)}>
                Browse Frames
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="summary-stat">
      <div className="summary-stat-val">{value ?? "--"}</div>
      <div className="summary-stat-label">{label}</div>
    </div>
  );
}
