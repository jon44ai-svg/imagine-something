import type { IZipArchiveBuilder, ZipEntry } from '../domain/ports/export';
import { crc32 } from './crc32';

export class StoreZipBuilder implements IZipArchiveBuilder {
  async buildZip(entries: readonly ZipEntry[]): Promise<Blob> {
    const encoder = new TextEncoder();
    const localParts: Uint8Array<ArrayBuffer>[] = [];
    const centralParts: Uint8Array<ArrayBuffer>[] = [];
    let offset = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const nameBytes = new Uint8Array(encoder.encode(entry.name));
      const buffer = await entry.blob.arrayBuffer();
      const dataBytes = new Uint8Array(buffer);
      const crc = crc32(dataBytes);
      const size = dataBytes.length;

      const lfh = new ArrayBuffer(30);
      const lv = new DataView(lfh);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);

      localParts.push(new Uint8Array(lfh), nameBytes, dataBytes);

      const cdh = new ArrayBuffer(46);
      const cv = new DataView(cdh);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);

      centralParts.push(new Uint8Array(cdh), nameBytes);
      offset += 30 + nameBytes.length + size;
    }

    let centralSize = 0;
    for (let j = 0; j < centralParts.length; j++) {
      centralSize += centralParts[j].length;
    }

    const eocd = new ArrayBuffer(22);
    const ev = new DataView(eocd);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, new Uint8Array(eocd)], {
      type: 'application/zip',
    });
  }
}
