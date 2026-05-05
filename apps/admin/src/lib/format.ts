/** Tiny presentational helpers used across the admin dashboard. */

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || isNaN(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatTokens(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}

export function shortId(id: string | null | undefined, len = 8): string {
  if (!id) return "—";
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}

/**
 * Human-readable "X minutes ago" / "yesterday" relative to now. Returns
 * `null` for invalid dates so callers can fall back to `formatDateTime`.
 */
export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  return `${Math.floor(day / 30)}mo ago`;
}

/** Median of a number array (zero on empty), used for cohort latency. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
