export const BASE_PIXELS_PER_SECOND = 80;

/**
 * Converts milliseconds to pixel offset based on zoom level.
 */
export function timeToPixels(timeMs: number, zoomLevel: number): number {
  return (timeMs / 1000) * BASE_PIXELS_PER_SECOND * zoomLevel;
}

/**
 * Converts pixel offset to milliseconds based on zoom level.
 */
export function pixelsToTime(pixels: number, zoomLevel: number): number {
  const pxPerSec = BASE_PIXELS_PER_SECOND * zoomLevel;
  if (pxPerSec <= 0) return 0;
  return Math.round((pixels / pxPerSec) * 1000);
}

/**
 * Formats milliseconds into standard timeline timecode format: mm:ss:SSS
 * Example: 00:04:120
 */
export function formatTimecode(timeMs: number): string {
  const safeMs = Math.max(0, Math.round(timeMs));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const milliseconds = safeMs % 1000;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const sss = String(milliseconds).padStart(3, '0');

  return `${mm}:${ss}:${sss}`;
}

/**
 * Formats duration cleanly for badges: e.g. 12.0s
 */
export function formatDurationSeconds(ms: number): string {
  const secs = ms / 1000;
  return `${secs.toFixed(1)}s`;
}

/**
 * Determines major and minor tick intervals based on zoom level.
 */
export function getRulerIntervals(zoomLevel: number) {
  if (zoomLevel >= 4) {
    return { majorStepMs: 500, minorTicksCount: 5 }; // every 500ms, minor every 100ms
  }
  if (zoomLevel >= 2) {
    return { majorStepMs: 1000, minorTicksCount: 5 }; // every 1s, minor every 200ms
  }
  if (zoomLevel >= 0.75) {
    return { majorStepMs: 1000, minorTicksCount: 4 }; // every 1s, minor every 250ms
  }
  if (zoomLevel >= 0.35) {
    return { majorStepMs: 2000, minorTicksCount: 4 }; // every 2s, minor every 500ms
  }
  return { majorStepMs: 5000, minorTicksCount: 5 }; // every 5s, minor every 1s
}
