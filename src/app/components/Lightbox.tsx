import React, { useEffect } from "react";

interface Props {
  src: string;
  time: string;
  desc: string;
  tags: string[];
  onClose: () => void;
}

export function Lightbox({ src, time, desc, tags, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={src} alt="" />
      <div className="lightbox-info">
        <div className="lightbox-time">{time}</div>
        {desc && <div className="lightbox-desc">{desc}</div>}
        {tags.length > 0 && (
          <div className="lightbox-tags">
            {tags.map((t) => (
              <span key={t} className="frame-tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
