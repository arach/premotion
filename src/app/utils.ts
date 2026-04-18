export function formatTime(s: number | null | undefined): string {
  if (s == null) return "--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDuration(s: number | null | undefined): string {
  if (s == null) return "--";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

export function statusBadgeClass(status: string): string {
  if (status === "complete" || status === "analyzed" || status === "transcribed")
    return "badge-complete";
  if (status === "frames-only") return "badge-frames-only";
  return "badge-none";
}
