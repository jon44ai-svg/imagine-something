import type { NormalizedRect } from '../../domain/models';

interface NativeDetectedFace {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface NativeFaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): {
    detect(image: HTMLImageElement): Promise<NativeDetectedFace[]>;
  };
}

function getNativeFaceDetector(): NativeFaceDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { FaceDetector?: NativeFaceDetectorConstructor })
    .FaceDetector;
  return typeof candidate === 'function' ? candidate : null;
}

export async function detectFacesWithBrowserApi(
  img: HTMLImageElement,
): Promise<NormalizedRect[] | null> {
  const Ctor = getNativeFaceDetector();
  if (!Ctor || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return null;
  }

  try {
    const detector = new Ctor({ fastMode: true, maxDetectedFaces: 5 });
    const detected = await detector.detect(img);
    if (!Array.isArray(detected) || detected.length === 0) {
      return [];
    }
    return detected.map((face) => ({
      x: Math.max(0, face.boundingBox.x / img.naturalWidth),
      y: Math.max(0, face.boundingBox.y / img.naturalHeight),
      width: Math.min(1, face.boundingBox.width / img.naturalWidth),
      height: Math.min(1, face.boundingBox.height / img.naturalHeight),
    }));
  } catch {
    return null;
  }
}
