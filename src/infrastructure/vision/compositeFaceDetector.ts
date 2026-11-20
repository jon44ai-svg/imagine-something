import type { FaceDetectionResult } from '../../domain/models';
import type { IFaceDetector } from '../../domain/ports/vision';
import { PORTRAIT_FALLBACK_FACE } from '../../utils/zoomGeometry';
import { detectFacesWithBrowserApi } from './browserFaceDetector';
import { detectFacesWithCanvasHeuristic } from './canvasFaceDetector';

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for face detection'));
    img.src = src;
  });
}

export class CompositeFaceDetector implements IFaceDetector {
  private readonly cache = new Map<string, FaceDetectionResult>();

  async detectFaces(imageSrc: string, cacheKey?: string): Promise<FaceDetectionResult> {
    const key = cacheKey || imageSrc;
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const img = await loadHtmlImage(imageSrc);

      const nativeBoxes = await detectFacesWithBrowserApi(img);
      if (nativeBoxes && nativeBoxes.length > 0) {
        const result: FaceDetectionResult = { boxes: nativeBoxes, source: 'native' };
        this.cache.set(key, result);
        return result;
      }

      const heuristicBoxes = detectFacesWithCanvasHeuristic(img);
      if (heuristicBoxes.length > 0) {
        const result: FaceDetectionResult = { boxes: heuristicBoxes, source: 'heuristic' };
        this.cache.set(key, result);
        return result;
      }
    } catch {
      // Fall through to portrait upper-center fallback
    }

    const fallback: FaceDetectionResult = {
      boxes: [PORTRAIT_FALLBACK_FACE],
      source: 'portrait-fallback',
    };
    this.cache.set(key, fallback);
    return fallback;
  }
}
