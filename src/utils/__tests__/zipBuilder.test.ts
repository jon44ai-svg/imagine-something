import { describe, expect, it } from 'vitest';
import { crc32 } from '../crc32';
import { StoreZipBuilder } from '../zipBuilder';

describe('crc32 and StoreZipBuilder', () => {
  it('computes standard IEEE 802.3 CRC32 for "123456789"', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes)).toBe(0xcbf43926);
  });

  it('builds a valid STORE ZIP archive with local headers, central directory, and EOCD', async () => {
    const builder = new StoreZipBuilder();
    const zipBlob = await builder.buildZip([
      { name: 'a.txt', blob: new Blob(['alpha'], { type: 'text/plain' }) },
      { name: 'b.txt', blob: new Blob(['bravo'], { type: 'text/plain' }) },
    ]);

    expect(zipBlob.type).toBe('application/zip');
    const buffer = await zipBlob.arrayBuffer();
    const view = new DataView(buffer);

    // Local file header signature at byte 0
    expect(view.getUint32(0, true)).toBe(0x04034b50);

    // End of central directory record at the tail (22 bytes)
    const eocdOffset = buffer.byteLength - 22;
    expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
    expect(view.getUint16(eocdOffset + 8, true)).toBe(2);
    expect(view.getUint16(eocdOffset + 10, true)).toBe(2);

    const centralOffset = view.getUint32(eocdOffset + 16, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
  });
});
