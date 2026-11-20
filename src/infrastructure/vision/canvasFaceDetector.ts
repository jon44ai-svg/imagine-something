import type { NormalizedRect } from '../../domain/models';
import { detectSkinFaceRegions } from '../../utils/zoomGeometry';

const ANALYSIS_MAX_SIDE = 160;

export function detectFacesWithCanvasHeuristic(img: HTMLImageElement): NormalizedRect[] {
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return [];
  }

  const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, ANALYSIS_MAX_SIDE / maxSide);
  const w = Math.max(8, Math.round(img.naturalWidth * scale));
  const h = Math.max(8, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  try {
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    return detectSkinFaceRegions(imageData.data, w, h);
  } catch {
    // Tainted canvas (cross-origin URL without CORS headers)
    return [];
  }
}
