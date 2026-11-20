import { describe, expect, it } from 'vitest';
import {
  formatSizingPreview,
  resolveModelCapabilities,
  resolveTargetSizing,
} from '../modelCapabilities';
import { DEFAULT_SETTINGS } from '../presets';

describe('modelCapabilities', () => {
  it('disables diffusion-only params for google:* models like google:nano-banana@2.1', () => {
    const caps = resolveModelCapabilities('google:nano-banana@2.1');
    expect(caps.supportsSteps).toBe(false);
    expect(caps.supportsCfgScale).toBe(false);
    expect(caps.supportsAcceleration).toBe(false);
    expect(caps.supportsNegativePrompt).toBe(false);
    expect(caps.supportsSeedImage).toBe(false);
    expect(caps.maxOutputQuality).toBe(99);
    expect(caps.dimensionMode).toBe('googleNanoBanana');
  });

  it('keeps full diffusion parameters enabled for runware:* models', () => {
    const caps = resolveModelCapabilities('runware:400@6');
    expect(caps.supportsSteps).toBe(true);
    expect(caps.supportsCfgScale).toBe(true);
    expect(caps.supportsAcceleration).toBe(true);
    expect(caps.supportsSeedImage).toBe(true);
    expect(caps.dimensionMode).toBe('multipleOf64');
  });

  it('resolves resolution tier for google:nano-banana@2.1 when aspectRatio is match', () => {
    const sizing = resolveTargetSizing(
      {
        ...DEFAULT_SETTINGS,
        model: 'google:nano-banana@2.1',
        aspectRatio: 'match',
        baseSize: 2048,
      },
      1600,
      900,
    );

    expect(sizing.mode).toBe('resolution');
    if (sizing.mode === 'resolution') {
      expect(sizing.resolution).toBe('2K');
    }
    expect(
      formatSizingPreview({
        ...DEFAULT_SETTINGS,
        model: 'google:nano-banana@2.1',
        aspectRatio: 'match',
        baseSize: 1024,
      }),
    ).toBe('Match Input (1K)');
  });

  it('maps explicit aspect ratios on google:nano-banana@2.1 to supported Runware dimensions', () => {
    const sizing16x9 = resolveTargetSizing({
      ...DEFAULT_SETTINGS,
      model: 'google:nano-banana@2.1',
      aspectRatio: '16:9',
      baseSize: 2048,
    });
    expect(sizing16x9).toEqual({ mode: 'dimensions', width: 2752, height: 1536 });

    const sizing1x1 = resolveTargetSizing({
      ...DEFAULT_SETTINGS,
      model: 'google:nano-banana@2.1',
      aspectRatio: '1:1',
      baseSize: 1024,
    });
    expect(sizing1x1).toEqual({ mode: 'dimensions', width: 1024, height: 1024 });
  });
});
