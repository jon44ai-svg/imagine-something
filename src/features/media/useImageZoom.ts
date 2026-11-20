import { useCallback, useEffect, useState } from 'react';
import { useServices } from '../../app/ServicesContext';
import type { FaceDetectionResult, ImageZoomTransform } from '../../domain/models';
import {
  computeFaceFocusTransform,
  DEFAULT_ZOOM_TRANSFORM,
  panTransformByPixels,
  ZOOM_STEP_FACTOR,
  zoomByFactor,
} from '../../utils/zoomGeometry';

export interface UseImageZoomOptions {
  imageSrc: string;
  cacheKey?: string;
  initialFaceFocus?: boolean;
}

export interface UseImageZoomResult {
  transform: ImageZoomTransform;
  isZoomed: boolean;
  faceFocusActive: boolean;
  faceResult: FaceDetectionResult | null;
  activeFaceIndex: number;
  isDetectingFace: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleQuickZoom: () => void;
  applyWheelZoom: (deltaY: number) => void;
  panByPixels: (dx: number, dy: number, viewportW: number, viewportH: number) => void;
  toggleFaceFocus: () => Promise<void>;
  focusFace: (faceIndex?: number) => Promise<void>;
}

export function useImageZoom({
  imageSrc,
  cacheKey,
  initialFaceFocus = false,
}: UseImageZoomOptions): UseImageZoomResult {
  const { faceDetector } = useServices();

  const [transform, setTransform] = useState<ImageZoomTransform>({ ...DEFAULT_ZOOM_TRANSFORM });
  const [faceFocusActive, setFaceFocusActive] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(null);
  const [activeFaceIndex, setActiveFaceIndex] = useState(0);
  const [isDetectingFace, setIsDetectingFace] = useState(false);

  // Reset zoom when image changes
  useEffect(() => {
    setTransform({ ...DEFAULT_ZOOM_TRANSFORM });
    setFaceFocusActive(false);
    setFaceResult(null);
    setActiveFaceIndex(0);
  }, [imageSrc, cacheKey]);

  const focusFace = useCallback(
    async (requestedIndex?: number) => {
      if (!imageSrc) return;
      setIsDetectingFace(true);
      try {
        const result = await faceDetector.detectFaces(imageSrc, cacheKey);
        setFaceResult(result);
        const count = result.boxes.length;
        if (count === 0) return;

        const targetIndex =
          requestedIndex !== undefined ? ((requestedIndex % count) + count) % count : 0;
        const box = result.boxes[targetIndex];
        setActiveFaceIndex(targetIndex);
        setFaceFocusActive(true);
        setTransform(computeFaceFocusTransform(box));
      } finally {
        setIsDetectingFace(false);
      }
    },
    [faceDetector, imageSrc, cacheKey],
  );

  // Support external default face-focus toggle (e.g., Gallery-wide "Focus Faces")
  useEffect(() => {
    if (initialFaceFocus && imageSrc) {
      void focusFace(0);
    } else if (!initialFaceFocus) {
      setFaceFocusActive(false);
      setTransform({ ...DEFAULT_ZOOM_TRANSFORM });
    }
  }, [initialFaceFocus, imageSrc, focusFace]);

  const zoomIn = useCallback(() => {
    setFaceFocusActive(false);
    setTransform((prev) => zoomByFactor(prev, ZOOM_STEP_FACTOR));
  }, []);

  const zoomOut = useCallback(() => {
    setFaceFocusActive(false);
    setTransform((prev) => zoomByFactor(prev, 1 / ZOOM_STEP_FACTOR));
  }, []);

  const resetZoom = useCallback(() => {
    setFaceFocusActive(false);
    setTransform({ ...DEFAULT_ZOOM_TRANSFORM });
  }, []);

  const toggleQuickZoom = useCallback(() => {
    setFaceFocusActive(false);
    setTransform((prev) =>
      prev.scale > 1.05 ? { ...DEFAULT_ZOOM_TRANSFORM } : { scale: 2.5, offsetX: 0, offsetY: 0 },
    );
  }, []);

  const applyWheelZoom = useCallback((deltaY: number) => {
    setFaceFocusActive(false);
    const factor = deltaY < 0 ? 1.18 : 1 / 1.18;
    setTransform((prev) => zoomByFactor(prev, factor));
  }, []);

  const panByPixels = useCallback(
    (dx: number, dy: number, viewportW: number, viewportH: number) => {
      setFaceFocusActive(false);
      setTransform((prev) => panTransformByPixels(prev, dx, dy, viewportW, viewportH));
    },
    [],
  );

  const toggleFaceFocus = useCallback(async () => {
    if (faceFocusActive && faceResult) {
      if (faceResult.boxes.length > 1 && activeFaceIndex < faceResult.boxes.length - 1) {
        await focusFace(activeFaceIndex + 1);
      } else {
        resetZoom();
      }
      return;
    }
    await focusFace(0);
  }, [faceFocusActive, faceResult, activeFaceIndex, focusFace, resetZoom]);

  return {
    transform,
    isZoomed: transform.scale > 1.01,
    faceFocusActive,
    faceResult,
    activeFaceIndex,
    isDetectingFace,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleQuickZoom,
    applyWheelZoom,
    panByPixels,
    toggleFaceFocus,
    focusFace,
  };
}
