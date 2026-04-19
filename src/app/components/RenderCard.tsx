import React, { useState, useRef, useCallback } from "react";
import type { Render } from "../types";

interface Props {
  render: Render;
  onFeedbackSaved: (name: string, rating: string, notes: string) => void;
}

const RATING_OPTIONS = [
  { value: "", label: "--" },
  { value: "ship", label: "SHIP" },
  { value: "strong", label: "Strong" },
  { value: "decent", label: "Decent" },
  { value: "needs-work", label: "Needs Work" },
  { value: "bad", label: "Bad" },
  { value: "kill", label: "Kill" },
];

export function RenderCard({ render, onFeedbackSaved }: Props) {
  const [rating, setRating] = useState(render.feedback?.rating || "");
  const [notes, setNotes] = useState(render.feedback?.notes || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback(
    (r: string, n: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: render.name, rating: r, notes: n }),
        });
        setSaving(false);
        setDirty(false);
        onFeedbackSaved(render.name, r, n);
      }, 600);
    },
    [render.name, onFeedbackSaved]
  );

  const handleRating = (val: string) => {
    setRating(val);
    setDirty(true);
    save(val, notes);
  };

  const handleNotes = (val: string) => {
    setNotes(val);
    setDirty(true);
    save(rating, val);
  };

  const fmtDuration = (s: number) => {
    if (!s) return "--";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  const ratingClass = rating
    ? `rc-rating-${rating}`
    : "";

  return (
    <div className={`rc ${ratingClass}`}>
      <div className="rc-video-wrap">
        <video
          src={`/renders/${render.filename}`}
          controls
          preload="metadata"
          playsInline
        />
      </div>
      <div className="rc-info">
        <div className="rc-title-row">
          <div className="rc-name">{render.name}</div>
          <a
            className="rc-grab"
            href={`/renders/${render.filename}`}
            target="_blank"
            rel="noopener"
            title="Open in new tab"
          >
            grab
          </a>
        </div>
        <div className="rc-meta">
          <span className="rc-badge rc-badge-project">{render.project}</span>
          <span>{fmtDuration(render.duration)}</span>
          <span>{render.sizeMB} MB</span>
        </div>
        <div className="rc-feedback">
          <div className="rc-rating-row">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`rc-rating-btn ${rating === opt.value ? "active" : ""} ${opt.value ? `rc-rb-${opt.value}` : ""}`}
                onClick={() => handleRating(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            className="rc-notes"
            placeholder="Notes..."
            value={notes}
            onChange={(e) => handleNotes(e.target.value)}
            rows={2}
          />
          {saving && <span className="rc-saving">saving...</span>}
          {dirty && !saving && <span className="rc-dirty">unsaved</span>}
        </div>
      </div>
    </div>
  );
}
