import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Video, VisionTag } from "../types";
import { formatTime, formatDuration, statusBadgeClass } from "../utils";

interface Props {
  video: Video;
  onBack: () => void;
  onOpenFrameViewer: (video: Video, startIndex: number) => void;
}

export function VideoDetail({ video, onBack, onOpenFrameViewer }: Props) {
  const [reviewStatus, setReviewStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [review, setReview] = useState<any>(null);
  const [hoverSceneIdx, setHoverSceneIdx] = useState<number | null>(null);
  const [hoverFrameIdx, setHoverFrameIdx] = useState<number | null>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const runReview = useCallback(async () => {
    setReviewStatus("loading");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setReview(data.review);
        setReviewStatus("done");
      } else {
        setReview({ error: data.error });
        setReviewStatus("error");
      }
    } catch (err: any) {
      setReview({ error: err.message });
      setReviewStatus("error");
    }
  }, [video.id]);

  const tagMap: Record<string, VisionTag> = {};
  if (video.visionTags) {
    video.visionTags.forEach((t) => { tagMap[t.frameFile] = t; });
  }

  const scenes = video.edl?.scenes || video.scenes || [];
  const highlights = video.edl?.highlights || [];
  const clips = video.edl?.suggestedClips || [];
  const deadTime = video.edl?.deadTime || [];
  const hasFrames = video.frames && video.frames.length > 0;

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

  useEffect(() => {
    if (hoverSceneIdx != null) {
      const frames = sceneFrameMap[hoverSceneIdx];
      if (frames?.length) {
        frameRefs.current[frames[0]]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [hoverSceneIdx, sceneFrameMap]);

  useEffect(() => {
    if (hoverFrameIdx != null) {
      const si = frameSceneMap[hoverFrameIdx];
      if (si != null) {
        sceneRefs.current[si]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [hoverFrameIdx, frameSceneMap]);

  return (
    <div className="vd">
      {/* Top bar */}
      <div className="vd-topbar">
        <button className="vd-back" onClick={onBack}>&larr; Back</button>
        <span className="badge badge-app">{video.app}</span>
        <span className="vd-title">{video.id}</span>
        <span className={`badge ${statusBadgeClass(video.analysisStatus)}`}>
          {video.analysisStatus}
        </span>
        {video.reelCandidate && <span className="badge badge-reel">reel</span>}
      </div>

      {/* Hero: description + stats side by side */}
      <div className="vd-hero">
        <div className="vd-hero-left">
          <p className="vd-description">{video.description || "(no description)"}</p>
          {video.tags?.length > 0 && (
            <div className="tag-list" style={{ marginTop: 10 }}>
              {video.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="vd-hero-right">
          <div className="vd-stat-grid">
            <VdStat label="Duration" value={formatDuration(video.duration)} />
            <VdStat label="Resolution" value={video.resolution} />
            <VdStat label="FPS" value={video.fps} />
            <VdStat label="Codec" value={video.codec} />
            <VdStat label="Size" value={video.sizeMB ? `${video.sizeMB} MB` : "--"} />
            <VdStat label="Captured" value={video.capturedAt ? video.capturedAt.split("T")[0] : "--"} />
            <VdStat label="Scenes" value={scenes.length} />
            <VdStat label="Frames" value={video.frameCount || "--"} />
            <VdStat label="Highlights" value={highlights.length} />
            <VdStat label="Clips" value={clips.length} />
            {video.edl?.stats && (
              <>
                <VdStat label="Active" value={formatDuration(video.edl.stats.activeTime)} />
                <VdStat label="Idle" value={formatDuration(video.edl.stats.idleTime)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Frames gallery */}
      {hasFrames && (
        <div className="vd-section">
          <div className="vd-section-header">
            <span className="vd-section-title">Frames ({video.frames!.length})</span>
            <button className="detail-btn detail-btn-secondary" onClick={() => onOpenFrameViewer(video, 0)}>
              Browse All
            </button>
          </div>
          <div className="vd-frames">
            {video.frames!.map((f, i) => {
              const src = `demos/${video.storyboardDir}/${f}`;
              const tag = tagMap[f];
              const isLinked = activeFrameIdxs.includes(i);
              return (
                <div
                  key={f}
                  ref={(el) => { frameRefs.current[i] = el; }}
                  className={`vd-frame ${isLinked ? "vd-frame-active" : ""}`}
                  onClick={() => onOpenFrameViewer(video, i)}
                  onMouseEnter={() => setHoverFrameIdx(i)}
                  onMouseLeave={() => setHoverFrameIdx(null)}
                >
                  <img src={src} alt={f} loading="lazy" />
                  <div className="vd-frame-info">
                    <span className="vd-frame-time">
                      {tag?.time != null ? formatTime(tag.time) : f}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column layout: scenes + editorial */}
      <div className="vd-columns">
        {/* Scenes */}
        {scenes.length > 0 && (
          <div className="vd-col">
            <div className="vd-section-title">Scenes ({scenes.length})</div>
            <div className="vd-scene-list">
              {scenes.map((s, i) => {
                const start = s.start ?? s.time ?? 0;
                const isLinked = activeSceneIdx === i;
                const frameCount = sceneFrameMap[i]?.length || 0;
                return (
                  <div
                    key={i}
                    ref={(el) => { sceneRefs.current[i] = el; }}
                    className={`vd-scene ${isLinked ? "vd-scene-active" : ""}`}
                    onMouseEnter={() => setHoverSceneIdx(i)}
                    onMouseLeave={() => setHoverSceneIdx(null)}
                  >
                    <div className="vd-scene-head">
                      <span className="vd-scene-num">{s.index ?? i + 1}</span>
                      <span className="vd-scene-time">
                        {formatTime(start)}
                        {s.end != null ? ` \u2192 ${formatTime(s.end)}` : ""}
                      </span>
                      {s.activity && (
                        <span className={`vd-scene-activity vd-activity-${s.activity}`}>
                          {s.activity}
                        </span>
                      )}
                      {frameCount > 0 && (
                        <span className="vd-scene-fcount">{frameCount}f</span>
                      )}
                    </div>
                    <div className="vd-scene-body">
                      {s.description || "(no description)"}
                    </div>
                    {s.tags && s.tags.length > 0 && (
                      <div className="vd-scene-tags">
                        {s.tags.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editorial: highlights, clips, dead time */}
        <div className="vd-col">
          {highlights.length > 0 && (
            <>
              <div className="vd-section-title">Highlights ({highlights.length})</div>
              <div className="vd-editorial-list">
                {highlights.map((h, i) => (
                  <div key={i} className="vd-editorial-item">
                    <span className="vd-editorial-time">{formatTime(h.time)}</span>
                    <span className="vd-editorial-text">{h.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {clips.length > 0 && (
            <>
              <div className="vd-section-title" style={{ marginTop: 20 }}>
                Suggested Clips ({clips.length})
              </div>
              <div className="vd-editorial-list">
                {clips.map((c, i) => (
                  <div key={i} className="vd-editorial-item">
                    <div className="vd-clip-header">
                      <span className="vd-editorial-text vd-clip-title">{c.title}</span>
                      <span className="vd-editorial-time">
                        {formatTime(c.start)} &rarr; {formatTime(c.end)}
                      </span>
                    </div>
                    <div className="vd-clip-reason">{c.reason}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {deadTime.length > 0 && (
            <>
              <div className="vd-section-title" style={{ marginTop: 20 }}>
                Dead Time ({deadTime.length})
              </div>
              <div className="vd-editorial-list">
                {deadTime.map((d, i) => (
                  <div key={i} className="vd-editorial-item">
                    <span className="vd-editorial-time">
                      {formatTime(d.start)} &rarr; {formatTime(d.end)}
                      {" "}({d.duration || Math.round(d.end - d.start)}s)
                    </span>
                    <span className="vd-editorial-text">{d.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transcript */}
      {video.transcript?.segments && video.transcript.segments.length > 0 && (
        <div className="vd-section">
          <div className="vd-section-title">Transcript ({video.transcript.segments.length} segments)</div>
          <div className="vd-transcript">
            {video.transcript.segments.map((seg) => (
              <div key={seg.id} className="vd-transcript-seg">
                <span className="vd-transcript-time">{formatTime(seg.start)}</span>
                <span className="vd-transcript-text">{seg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {video.srt && !video.transcript?.segments && (
        <div className="vd-section">
          <div className="vd-section-title">Transcript (SRT)</div>
          <div className="srt-block">{video.srt}</div>
        </div>
      )}

      {/* AI Review */}
      <div className="vd-section">
        <div className="vd-section-header">
          <span className="vd-section-title">AI Review</span>
          {reviewStatus === "idle" && (
            <button className="detail-btn" onClick={runReview}>
              Review with AI
            </button>
          )}
        </div>
        {reviewStatus === "loading" && (
          <div className="analyze-running">Reviewing...</div>
        )}
        {reviewStatus === "error" && (
          <div className="review-error">{review?.error || "Unknown error"}</div>
        )}
        {reviewStatus === "done" && review && <ReviewResult review={review} />}
      </div>

      {/* Metadata footer */}
      <div className="vd-section vd-metadata">
        <div className="vd-section-title">Metadata</div>
        <div className="meta-grid">
          <MetaItem label="File" value={video.filename} />
          <MetaItem label="Source" value={video.sourcePath} />
          <MetaItem label="Demos" value={video.demosPath} />
          <MetaItem label="Storyboard" value={video.storyboardDir} />
          <MetaItem label="Composition" value={video.composition} />
          <MetaItem label="FPS" value={video.fps} />
          <MetaItem label="Codec" value={video.codec} />
          <MetaItem label="Captured" value={video.capturedAt} />
        </div>
      </div>
    </div>
  );
}

function VdStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="vd-stat">
      <div className="vd-stat-val">{value ?? "--"}</div>
      <div className="vd-stat-label">{label}</div>
    </div>
  );
}

function ReviewResult({ review }: { review: any }) {
  return (
    <div className="review-result">
      {review.verdict && (
        <div className="review-verdict">{review.verdict}</div>
      )}
      {review.script?.narrative_arc && (
        <div className="review-section">
          <div className="review-label">Narrative</div>
          <div className="review-text">{review.script.narrative_arc}</div>
        </div>
      )}
      {review.usable?.length > 0 && (
        <div className="review-section">
          <div className="review-label">Usable</div>
          {review.usable.map((u: any, i: number) => (
            <div key={i} className="review-item">
              <span className="review-time">{formatTime(u.time)}</span>
              <span className="review-what">{u.what}</span>
              <span className="review-why">{u.why}</span>
            </div>
          ))}
        </div>
      )}
      {review.emphasis?.length > 0 && (
        <div className="review-section">
          <div className="review-label">Emphasis</div>
          {review.emphasis.map((e: any, i: number) => (
            <div key={i} className="review-item">
              <span className="review-time">{formatTime(e.time)}</span>
              <span className="review-what">{e.what}</span>
              <span className={`review-strength review-strength-${e.strength}`}>
                {e.strength}
              </span>
            </div>
          ))}
        </div>
      )}
      {review.script?.suggested_sequence?.length > 0 && (
        <div className="review-section">
          <div className="review-label">Suggested Sequence</div>
          {review.script.suggested_sequence.map((s: any, i: number) => (
            <div key={i} className="review-item">
              <span className="review-time">
                {formatTime(s.start)} &rarr; {formatTime(s.end)}
              </span>
              <span className="review-what">{s.label}</span>
              {s.note && <span className="review-why">{s.note}</span>}
            </div>
          ))}
        </div>
      )}
      {review.script?.repetitive?.length > 0 && (
        <div className="review-section">
          <div className="review-label">Repetitive</div>
          {review.script.repetitive.map((r: string, i: number) => (
            <div key={i} className="review-item">
              <span className="review-why">{r}</span>
            </div>
          ))}
        </div>
      )}
      {review.script?.missing?.length > 0 && (
        <div className="review-section">
          <div className="review-label">Missing</div>
          {review.script.missing.map((m: string, i: number) => (
            <div key={i} className="review-item">
              <span className="review-why">{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="meta-key">{label}</div>
      <div className="meta-val">{value ?? "--"}</div>
    </div>
  );
}
