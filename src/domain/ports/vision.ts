import type { FaceDetectionResult } from '../models';

export interface IFaceDetector {
  detectFaces(imageSrc: string, cacheKey?: string): Promise<FaceDetectionResult>;
}
