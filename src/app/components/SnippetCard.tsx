import React from "react";
import type { CuratedSnippet } from "../types";
import { formatTime } from "../utils";

interface LightboxData {
  src: string;
  time: string;
  desc: string;
  tags: string[];
}

interface Props {
  snippet: CuratedSnippet;
  onOpenLightbox: (data: LightboxData) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  capture: "CAPTURE",
  read: "READ",
  listen: "LISTEN",
  explore: "EXPLORE",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="snippet-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "star-filled" : "star-empty"}>
          {i < rating ? "\u2605" : "\u2606"}
        </span>
      ))}
    </span>
  );
}

export function SnippetCard({ snippet, onOpenLightbox }: Props) {
  const frameSrc = `curated-frames/${snippet.id}.jpg`;

  return (
    <div
      className="snippet-card"
      onClick={() =>
        onOpenLightbox({
          src: frameSrc,
          time: formatTime(snippet.timestamp),
          desc: snippet.description,
          tags: snippet.tags,
        })
      }
    >
      <div className="snippet-thumb">
        <img src={frameSrc} alt={snippet.description} loading="lazy" />
        <div className="snippet-timestamp">{formatTime(snippet.timestamp)}</div>
        <div className={`snippet-category snippet-category-${snippet.category}`}>
          {CATEGORY_LABELS[snippet.category] || snippet.category.toUpperCase()}
        </div>
      </div>
      <div className="snippet-info">
        <div className="snippet-header">
          <span className="snippet-source">{snippet.source.replace(".mp4", "")}</span>
          <Stars rating={snippet.rating} />
        </div>
        <div className="snippet-desc">{snippet.description}</div>
        {snippet.tags.length > 0 && (
          <div className="snippet-tags">
            {snippet.tags.slice(0, 4).map((t) => (
              <span key={t} className="snippet-tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
