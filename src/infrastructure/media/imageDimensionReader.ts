import type { ImageDimensions } from '../../domain/models';
import type { IImageDimensionReader } from '../../domain/ports/media';

export class BrowserImageDimensionReader implements IImageDimensionReader {
  readDimensions(blob: Blob): Promise<ImageDimensions> {
    return new Promise<ImageDimensions>((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    });
  }
}
