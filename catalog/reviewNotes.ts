import type { ReviewNote, Video } from "@/lib/types";
import { formatTime } from "@/lib/types";

const key = (videoId: string) => `premotion:review-notes:${videoId}`;

export function loadNotes(videoId: string): ReviewNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(videoId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotes(videoId: string, notes: ReviewNote[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(videoId), JSON.stringify(notes));
  } catch {
    // quota or unavailable — fail silent
  }
}

export function createNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function formatRect(r: { x: number; y: number; w: number; h: number }): string {
  const fmt = (n: number) => n.toFixed(3);
  return `${fmt(r.x)},${fmt(r.y)},${fmt(r.w)},${fmt(r.h)}`;
}

export function exportNotesAsPrompt(video: Video, notes: ReviewNote[]): string {
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const lines: string[] = [];
  lines.push(`# Review — ${video.id}`);
  if (video.videoUrl) lines.push(`Source: ${video.videoUrl}`);
  if (video.composition) lines.push(`Composition: ${video.composition}`);
  if (video.resolution) lines.push(`Resolution: ${video.resolution}`);
  lines.push(`Duration: ${formatTime(video.duration)}`);
  lines.push("");
  lines.push(
    `Rect coordinates are normalized (0..1) over the full video frame: x,y,w,h.`,
  );
  lines.push("");
  lines.push(`## Notes (${sorted.length})`);
  lines.push("");
  if (sorted.length === 0) {
    lines.push("_No notes yet._");
  } else {
    for (const n of sorted) {
      const stamp = formatTime(n.time) +
        (n.endTime != null ? `–${formatTime(n.endTime)}` : "");
      const rect = n.rect ? `, rect ${formatRect(n.rect)}` : "";
      const kind = n.kind.toUpperCase();
      const comment = n.comment.trim() || "(no comment)";
      lines.push(`- [${stamp}${rect}] ${kind}: ${comment}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
