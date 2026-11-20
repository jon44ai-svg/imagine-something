/**
 * Format an elapsed generation duration in milliseconds into a compact human-readable label.
 */
export function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '0ms';
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  if (durationMs < 60_000) {
    const seconds = durationMs / 1000;
    if (seconds >= 59.95) {
      return '1m 0s';
    }
    return `${seconds.toFixed(1)}s`;
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
