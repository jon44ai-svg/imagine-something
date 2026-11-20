import { describe, expect, it } from 'vitest';
import {
  clampConcurrency,
  clampNumberResults,
  computeDimensions,
  round64,
} from '../dimensions';

describe('dimensions utilities', () => {
  it('snaps values to multiples of 64 clamped between 128 and 2048', () => {
    expect(round64(100)).toBe(128);
    expect(round64(160)).toBe(192);
    expect(round64(1000)).toBe(1024);
    expect(round64(5000)).toBe(2048);
    expect(round64(Number.NaN)).toBe(1024);
  });

  it('computes square, landscape, and portrait aspect ratios', () => {
    expect(computeDimensions('1:1', 2048)).toEqual({ width: 2048, height: 2048 });
    expect(computeDimensions('16:9', 1024)).toEqual({ width: 1024, height: 576 });
    expect(computeDimensions('9:16', 1024)).toEqual({ width: 576, height: 1024 });
  });

  it('matches input image aspect ratio when aspectRatio is match', () => {
    expect(computeDimensions('match', 1024, 2000, 1000)).toEqual({ width: 1024, height: 512 });
    expect(computeDimensions('match', 1024, 1000, 2000)).toEqual({ width: 512, height: 1024 });
    expect(computeDimensions('match', 1024, 0, 0)).toEqual({ width: 1024, height: 1024 });
  });

  it('uses rounded custom dimensions when aspectRatio is custom', () => {
    expect(computeDimensions('custom', 2048, 0, 0, 700, 1300)).toEqual({
      width: 704,
      height: 1280,
    });
  });

  it('clamps concurrency and numberResults safely', () => {
    expect(clampConcurrency(0)).toBe(1);
    expect(clampConcurrency(4.9)).toBe(4);
    expect(clampConcurrency(99)).toBe(10);
    expect(clampNumberResults(0)).toBe(1);
    expect(clampNumberResults(25)).toBe(10);
  });
});
