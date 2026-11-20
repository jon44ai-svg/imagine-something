import type { AspectRatio, ImageDimensions } from '../domain/models';
import { MAX_CONCURRENCY, MIN_CONCURRENCY } from '../domain/presets';

export function round64(value: number): number {
  const safe = Number.isFinite(value) ? value : 1024;
  return Math.max(128, Math.min(2048, Math.round(safe / 64) * 64));
}

export function computeDimensions(
  aspectRatio: AspectRatio | string,
  baseSize: number,
  imgW?: number,
  imgH?: number,
  customW?: number,
  customH?: number,
): ImageDimensions {
  if (aspectRatio === 'custom') {
    return {
      width: round64(Number(customW) || 1024),
      height: round64(Number(customH) || 1024),
    };
  }

  const target = Math.max(256, Math.min(2048, Number(baseSize) || 1024));
  let ratio = 1;

  if (aspectRatio === 'match') {
    ratio = imgW && imgH ? imgW / imgH : 1;
  } else if (aspectRatio && aspectRatio.includes(':')) {
    const parts = aspectRatio.split(':');
    const rw = Number(parts[0]);
    const rh = Number(parts[1]);
    if (rw > 0 && rh > 0) {
      ratio = rw / rh;
    }
  }

  if (ratio >= 1) {
    return {
      width: round64(target),
      height: round64(target / ratio),
    };
  }

  return {
    width: round64(target * ratio),
    height: round64(target),
  };
}

export function clampConcurrency(value: number): number {
  const parsed = Number.isFinite(value) ? Math.floor(value) : 3;
  return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, parsed));
}

export function clampNumberResults(value: number): number {
  const parsed = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, Math.min(10, parsed));
}
