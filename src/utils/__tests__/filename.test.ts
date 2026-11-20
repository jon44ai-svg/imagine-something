import { describe, expect, it } from 'vitest';
import {
  buildOutputFilename,
  buildZipArchiveFilename,
  deduplicateFilename,
  formatExtension,
  sanitizeBaseName,
} from '../filename';

describe('filename utilities', () => {
  it('sanitizes filenames and strips extensions', () => {
    expect(sanitizeBaseName('my photo (final)!.png')).toBe('my_photo_final_');
    expect(sanitizeBaseName('')).toBe('image');
    expect(sanitizeBaseName('a'.repeat(100) + '.jpg')).toHaveLength(60);
  });

  it('resolves extensions from explicit format or MIME type', () => {
    expect(formatExtension('JPEG')).toBe('jpg');
    expect(formatExtension('WEBP')).toBe('webp');
    expect(formatExtension(undefined, 'image/png')).toBe('png');
    expect(formatExtension(undefined, 'image/webp')).toBe('webp');
    expect(formatExtension(undefined, '')).toBe('jpg');
  });

  it('builds output filenames with index suffix', () => {
    expect(buildOutputFilename('portrait.png', 2, 'WEBP')).toBe('portrait_edit_2.webp');
  });

  it('deduplicates colliding filenames cleanly', () => {
    const used = new Set<string>();
    expect(deduplicateFilename('cat_edit_1.jpg', used)).toBe('cat_edit_1.jpg');
    expect(deduplicateFilename('cat_edit_1.jpg', used)).toBe('cat_edit_1_2.jpg');
    expect(deduplicateFilename('cat_edit_1.jpg', used)).toBe('cat_edit_1_3.jpg');
  });

  it('formats ZIP archive filename with ISO timestamp', () => {
    const name = buildZipArchiveFilename(Date.UTC(2026, 10, 20, 12, 34, 56));
    expect(name).toBe('runware-outputs-2026-11-20-12-34-56.zip');
  });
});
