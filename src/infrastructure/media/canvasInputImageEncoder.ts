import type { InputRecord } from '../../domain/models';
import type { IInputImageEncoder } from '../../domain/ports/media';
import { blobToDataURI } from '../../utils/imageCodec';

const SUPPORTED_DIRECT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIRECT_SIDE = 3072;
const MAX_DIRECT_BYTES = 12 * 1024 * 1024;
const DOWNSCALE_TARGET_SIDE = 2048;

export class CanvasInputImageEncoder implements IInputImageEncoder {
  async toInferenceDataUri(input: InputRecord): Promise<string> {
    const maxSide = Math.max(input.width || 0, input.height || 0);
    if (
      SUPPORTED_DIRECT_TYPES.has(input.type) &&
      maxSide <= MAX_DIRECT_SIDE &&
      input.blob.size <= MAX_DIRECT_BYTES
    ) {
      return blobToDataURI(input.blob);
    }

    return new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(input.blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const naturalMax = Math.max(img.naturalWidth, img.naturalHeight, 1);
        const scale = Math.min(1, DOWNSCALE_TARGET_SIDE / naturalMax);
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          blobToDataURI(input.blob).then(resolve).catch(reject);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.94));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        blobToDataURI(input.blob).then(resolve).catch(reject);
      };
      img.src = url;
    });
  }
}
