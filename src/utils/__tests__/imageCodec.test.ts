import { describe, expect, it } from 'vitest';
import { base64ToBlob, blobToDataURI, dataURIToBlob } from '../imageCodec';

describe('imageCodec utilities', () => {
  it('converts a Data URI to a Blob preserving MIME type and content', async () => {
    const base64 = btoa('hello-image');
    const blob = dataURIToBlob(`data:image/png;base64,${base64}`);
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('hello-image');
  });

  it('converts raw base64 to a Blob with format-mapped MIME type', async () => {
    const blob = base64ToBlob(btoa('webp-bytes'), 'WEBP');
    expect(blob.type).toBe('image/webp');
    expect(await blob.text()).toBe('webp-bytes');
  });

  it('encodes a Blob back to a Data URI', async () => {
    const blob = new Blob(['pixel-data'], { type: 'image/jpeg' });
    const uri = await blobToDataURI(blob);
    expect(uri.startsWith('data:image/jpeg;base64,')).toBe(true);
    const decoded = dataURIToBlob(uri);
    expect(await decoded.text()).toBe('pixel-data');
  });
});
