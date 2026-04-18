import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { Video, VisionTag, Scene, TranscriptSegment, Highlight } from "../types";
import { formatTime, formatDuration } from "../utils";

interface Props {
  video: Video;
  startIndex: number;
  onClose: () => void;
}

export function FrameViewer({ video, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const frames = video.frames || [];
  const total = frames.length;

  const tagMap = useMemo(() => {
    const map: Record<string, VisionTag> = {};
    video.visionTags?.forEach((t) => { map[t.frameFile] = t; });
    return map;
  }, [video.visionTags]);

  const scenes = video.edl?.scenes || video.scenes || [];

  const currentFrame = frames[index];
  const tag = currentFrame ? tagMap[currentFrame] : undefined;
  const frameTime = tag?.time ?? null;
  const src = video.storyboardDir ? `demos/${video.storyboardDir}/${currentFrame}` : "";

  const currentScene = useMemo(() => {
    if (frameTime == null) return null;
    return scenes.find((s) => {
      const start = s.start ?? s.time ?? 0;
      const end = s.end ?? Infinity;
      return frameTime >= start && frameTime < end;
    }) || null;
  }, [scenes, frameTime]);

  const currentTranscript = useMemo(() => {
    if (frameTime == null || !video.transcript?.segments) return [];
    return video.transcript.segments.filter(
      (seg) => frameTime >= seg.start && frameTime <= seg.end + 0.5
    );
  }, [video.transcript, frameTime]);

  const currentHighlights = useMemo(() => {
    if (frameTime == null || !video.edl?.highlights) return [];
    return video.edl.highlights.filter(
      (h) => Math.abs(h.time - frameTime) < 3
    );
  }, [video.edl?.highlights, frameTime]);

  const progress = video.duration && frameTime != null ? (frameTime / video.duration) * 100 : 0;

  const go = useCallback((dir: number) => {
    setIndex((prev) => Math.max(0, Math.min(total - 1, prev + dir)));
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(total - 1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, go, total]);

  useEffect(() => {
    const thumb = filmstripRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  if (!frames.length) return null;

  return (
    <div className="fv-overlay">
      <div className="fv-header">
        <div className="fv-title">{video.id}</div>
        <div className="fv-counter">{index + 1} / {total}</div>
        <div className="fv-meta">
          {frameTime != null && <span>{formatTime(frameTime)}</span>}
          <span>{formatDuration(video.duration)}</span>
          <span>{video.resolution}</span>
        </div>
        <button className="fv-close" onClick={onClose}>&times;</button>
      </div>

      <div className="fv-body">
        <div className="fv-main">
          <button
            className="fv-nav fv-nav-prev"
            onClick={() => go(-1)}
            disabled={index === 0}
          >
            &#8249;
          </button>
          <div className="fv-image-wrap">
            <img src={src} alt={currentFrame} key={currentFrame} />
          </div>
          <button
            className="fv-nav fv-nav-next"
            onClick={() => go(1)}
            disabled={index === total - 1}
          >
            &#8250;
          </button>
        </div>

        <div className="fv-panel">
          {tag?.description && (
            <div className="fv-section">
              <div className="fv-label">Description</div>
              <div className="fv-text">{tag.description}</div>
            </div>
          )}

          {tag?.contentType && (
            <div className="fv-section">
              <div className="fv-label">Content Type</div>
              <div className="fv-badge-row">
                <span className="fv-badge">{tag.contentType}</span>
              </div>
            </div>
          )}

          {tag?.tags && tag.tags.length > 0 && (
            <div className="fv-section">
              <div className="fv-label">Tags</div>
              <div className="fv-badge-row">
                {tag.tags.map((t) => (
                  <span key={t} className="fv-tag">{t}</span>
                ))}
              </div>
            </div>
          )}

          {currentScene && (
            <div className="fv-section">
              <div className="fv-label">Scene {currentScene.index ?? ""}</div>
              <div className="fv-scene-time">
                {formatTime(currentScene.start ?? currentScene.time ?? 0)}
                {currentScene.end != null && ` \u2192 ${formatTime(currentScene.end)}`}
              </div>
              {currentScene.activity && (
                <span className={`fv-activity fv-activity-${currentScene.activity}`}>
                  {currentScene.activity}
                </span>
              )}
              {currentScene.description && (
                <div className="fv-text fv-scene-desc">{currentScene.description}</div>
              )}
            </div>
          )}

          {currentHighlights.length > 0 && (
            <div className="fv-section">
              <div className="fv-label">Highlights</div>
              {currentHighlights.map((h, i) => (
                <div key={i} className="fv-highlight">
                  <span className="fv-highlight-time">{formatTime(h.time)}</span>
                  <span className="fv-highlight-reason">{h.reason}</span>
                </div>
              ))}
            </div>
          )}

          {currentTranscript.length > 0 && (
            <div className="fv-section">
              <div className="fv-label">Transcript</div>
              {currentTranscript.map((seg) => (
                <div key={seg.id} className="fv-transcript-seg">
                  <span className="fv-transcript-time">{formatTime(seg.start)}</span>
                  <span className="fv-transcript-text">{seg.text}</span>
                </div>
              ))}
            </div>
          )}

          {!tag?.description && !currentScene && currentTranscript.length === 0 && (
            <div className="fv-empty">No annotations for this frame</div>
          )}
        </div>
      </div>

      <div className="fv-footer">
        <div className="fv-timeline">
          <div className="fv-timeline-fill" style={{ width: `${progress}%` }} />
          {scenes.map((s, i) => {
            const start = s.start ?? s.time ?? 0;
            const pct = video.duration ? (start / video.duration) * 100 : 0;
            return (
              <div
                key={i}
                className="fv-timeline-mark"
                style={{ left: `${pct}%` }}
                title={s.description}
              />
            );
          })}
        </div>
        <div className="fv-filmstrip" ref={filmstripRef}>
          {frames.map((f, i) => (
            <div
              key={f}
              className={`fv-thumb ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
            >
              <img
                src={`demos/${video.storyboardDir}/${f}`}
                alt={f}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
