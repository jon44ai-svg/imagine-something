import type { ImageZoomTransform, NormalizedRect } from '../domain/models';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
export const ZOOM_STEP_FACTOR = 1.35;

export const DEFAULT_ZOOM_TRANSFORM: ImageZoomTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export const PORTRAIT_FALLBACK_FACE: NormalizedRect = {
  x: 0.3,
  y: 0.1,
  width: 0.4,
  height: 0.4,
};

export function clampZoomScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(scale * 100) / 100));
}

/**
 * Clamps normalized pan offset (percentage of viewport width/height, in -50..50 range)
 * so the zoomed image never exposes empty void beyond its edges.
 */
export function clampPanOffset(offsetPercent: number, scale: number): number {
  if (!Number.isFinite(offsetPercent) || scale <= 1) return 0;
  const maxShift = ((scale - 1) / (2 * scale)) * 100;
  return Math.max(-maxShift, Math.min(maxShift, offsetPercent));
}

export function normalizeTransform(transform: ImageZoomTransform): ImageZoomTransform {
  const scale = clampZoomScale(transform.scale);
  return {
    scale,
    offsetX: clampPanOffset(transform.offsetX, scale),
    offsetY: clampPanOffset(transform.offsetY, scale),
  };
}

export function zoomByFactor(
  current: ImageZoomTransform,
  factor: number,
): ImageZoomTransform {
  const nextScale = clampZoomScale(current.scale * factor);
  if (nextScale <= MIN_ZOOM) {
    return { ...DEFAULT_ZOOM_TRANSFORM };
  }
  return normalizeTransform({
    scale: nextScale,
    offsetX: current.offsetX,
    offsetY: current.offsetY,
  });
}

export function panTransformByPixels(
  current: ImageZoomTransform,
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
): ImageZoomTransform {
  if (current.scale <= 1 || viewportWidth <= 0 || viewportHeight <= 0) {
    return current;
  }
  const dPercentX = (deltaX / (viewportWidth * current.scale)) * 100;
  const dPercentY = (deltaY / (viewportHeight * current.scale)) * 100;
  return normalizeTransform({
    scale: current.scale,
    offsetX: current.offsetX + dPercentX,
    offsetY: current.offsetY + dPercentY,
  });
}

/**
 * Computes a zoom transform that centers a normalized face bounding box (0..1)
 * with comfortable framing margin around the face.
 */
export function computeFaceFocusTransform(
  faceBox: NormalizedRect,
  fillRatio = 0.55,
): ImageZoomTransform {
  const safeW = Math.max(0.05, Math.min(1, faceBox.width));
  const safeH = Math.max(0.05, Math.min(1, faceBox.height));
  const maxDim = Math.max(safeW, safeH);

  const desiredScale = clampZoomScale(Math.max(1.8, Math.min(4.5, fillRatio / maxDim)));

  const centerX = faceBox.x + safeW / 2;
  const centerY = faceBox.y + safeH / 2;

  // CSS transform: scale(S) translate(offsetX%, offsetY%) moves point (cx, cy) to center (0.5, 0.5)
  const offsetX = (0.5 - centerX) * 100;
  const offsetY = (0.5 - centerY) * 100;

  return normalizeTransform({
    scale: desiredScale,
    offsetX,
    offsetY,
  });
}

/**
 * Pure heuristic skin-cluster face detector operating on a downscaled RGBA buffer.
 * Uses YCbCr skin chrominance bounds + connected component extraction + portrait scoring.
 */
export function detectSkinFaceRegions(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): NormalizedRect[] {
  if (width < 8 || height < 8 || rgba.length < width * height * 4) {
    return [];
  }

  const total = width * height;
  const mask = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    const a = rgba[idx + 3];
    if (a < 128) continue;

    // Standard YCbCr skin-tone cluster bounds (inclusive across light to deep skin tones)
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    if (y > 40 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
      mask[i] = 1;
    }
  }

  const visited = new Uint8Array(total);
  const candidates: Array<{ rect: NormalizedRect; score: number }> = [];
  const queue = new Int32Array(total);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const start = py * width + px;
      if (mask[start] === 0 || visited[start] === 1) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      visited[start] = 1;

      let minX = px;
      let maxX = px;
      let minY = py;
      let maxY = py;
      let count = 0;

      while (head < tail) {
        const current = queue[head++];
        const cx = current % width;
        const cy = (current - cx) / width;
        count += 1;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          cx > 0 ? current - 1 : -1,
          cx < width - 1 ? current + 1 : -1,
          cy > 0 ? current - width : -1,
          cy < height - 1 ? current + width : -1,
        ];

        for (let n = 0; n < 4; n++) {
          const next = neighbors[n];
          if (next >= 0 && mask[next] === 1 && visited[next] === 0) {
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
      }

      const bw = (maxX - minX + 1) / width;
      const bh = (maxY - minY + 1) / height;
      const boxArea = bw * bh;
      const fillDensity = count / Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));

      // Reject tiny noise specks or full-frame skin backgrounds
      if (boxArea < 0.008 || boxArea > 0.65 || fillDensity < 0.25) continue;

      const aspect = bw / Math.max(0.001, bh);
      if (aspect < 0.4 || aspect > 2.0) continue;

      // If cluster is tall (face + neck/torso), focus on upper portion for the head/face
      const effectiveH = bh > bw * 1.45 ? Math.min(bh, bw * 1.25) : bh;
      const centerX = minX / width + bw / 2;
      const centerY = minY / height + effectiveH / 2;

      // Favor upper-middle regions typical of human faces in portraits
      const centerBias = 1 - Math.abs(centerX - 0.5) * 0.6;
      const upperBias = 1 - Math.abs(centerY - 0.34) * 0.7;
      const score = boxArea * fillDensity * Math.max(0.2, centerBias) * Math.max(0.2, upperBias);

      candidates.push({
        rect: {
          x: Math.max(0, minX / width),
          y: Math.max(0, minY / height),
          width: Math.min(1, bw),
          height: Math.min(1, effectiveH),
        },
        score,
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => c.rect);
}
