import { describe, expect, it } from 'vitest';
import {
  clampPanOffset,
  clampZoomScale,
  computeFaceFocusTransform,
  DEFAULT_ZOOM_TRANSFORM,
  detectSkinFaceRegions,
  panTransformByPixels,
  zoomByFactor,
} from '../zoomGeometry';

describe('zoomGeometry utilities', () => {
  it('clamps zoom scale between 1 and 6 and resets pan when zoomed back to 1x', () => {
    expect(clampZoomScale(0.2)).toBe(1);
    expect(clampZoomScale(10)).toBe(6);
    expect(clampPanOffset(40, 1)).toBe(0);

    const zoomedIn = zoomByFactor(DEFAULT_ZOOM_TRANSFORM, 2);
    expect(zoomedIn.scale).toBe(2);

    const zoomedOut = zoomByFactor(zoomedIn, 0.2);
    expect(zoomedOut).toEqual(DEFAULT_ZOOM_TRANSFORM);
  });

  it('pans proportionally to pixel deltas and clamps within image edges', () => {
    const panned = panTransformByPixels({ scale: 2, offsetX: 0, offsetY: 0 }, 100, -50, 200, 200);
    // At scale 2, max shift is (2-1)/(2*2)*100 = 25%
    expect(panned.offsetX).toBe(25);
    expect(panned.offsetY).toBe(-12.5);

    const overPanned = panTransformByPixels(panned, 1000, 1000, 200, 200);
    expect(overPanned.offsetX).toBe(25);
    expect(overPanned.offsetY).toBe(25);
  });

  it('computes a centered zoom transform for a detected face bounding box', () => {
    const transform = computeFaceFocusTransform({
      x: 0.4,
      y: 0.15,
      width: 0.2,
      height: 0.2,
    });

    // Face size 0.2 -> fillRatio 0.55 / 0.2 = 2.75x
    expect(transform.scale).toBe(2.75);
    // Center x = 0.5 -> offsetX = 0; Center y = 0.25 -> offsetY = +25% clamped to maxShift
    expect(transform.offsetX).toBe(0);
    expect(transform.offsetY).toBeGreaterThan(20);
  });

  it('detects a synthetic skin-tone face region in an RGBA pixel buffer', () => {
    const w = 64;
    const h = 64;
    const rgba = new Uint8ClampedArray(w * h * 4);

    // Fill background with cool dark blue (non-skin)
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = 20;
      rgba[i * 4 + 1] = 35;
      rgba[i * 4 + 2] = 75;
      rgba[i * 4 + 3] = 255;
    }

    // Draw a 16x18 face-like warm skin patch in upper-center (x: 24..39, y: 10..27)
    for (let y = 10; y < 28; y++) {
      for (let x = 24; x < 40; x++) {
        const idx = (y * w + x) * 4;
        rgba[idx] = 215;
        rgba[idx + 1] = 165;
        rgba[idx + 2] = 130;
        rgba[idx + 3] = 255;
      }
    }

    const regions = detectSkinFaceRegions(rgba, w, h);
    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(regions[0].x).toBeCloseTo(24 / w, 1);
    expect(regions[0].y).toBeCloseTo(10 / h, 1);
    expect(regions[0].width).toBeCloseTo(16 / w, 1);
  });
});
