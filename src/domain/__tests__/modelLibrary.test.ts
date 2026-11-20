import { describe, expect, it } from 'vitest';
import {
  computeAspectCompatibility,
  DEFAULT_MODEL_LIBRARY,
  forgetModelKnowledge,
  formatAspectRatioLabel,
  mergeModelLibrary,
  META_MUSE_SUPPORTED_DIMENSIONS,
  parseSupportedDimensions,
  parseUnsupportedParameter,
  pickClosestSupportedDimension,
  supportedDimensionsFor,
  withBlockedParameter,
  withFavorite,
  withSupportedDimensions,
} from '../modelLibrary';

describe('model library', () => {
  it('parses Runware unsupported-parameter errors', () => {
    expect(
      parseUnsupportedParameter(
        "Unsupported use of 'steps' parameter. This parameter is not supported for the selected model.",
      ),
    ).toBe('steps');
    expect(parseUnsupportedParameter("parameter 'CFGScale' is not supported")).toBe('CFGScale');
    expect(parseUnsupportedParameter("Unsupported use of 'scheduler' parameter")).toBeNull();
  });

  it('parses Runware unsupported width/height dimension allowlist errors', () => {
    const dims = parseSupportedDimensions(
      "Unsupported use of width/height parameters. The specified dimensions are not supported for the selected model. Supported values are: '1600x1600', '1920x1280', '1280x1920', '1792x1344', '1344x1792', '2048x1152', '1152x2048', '2352x1008'.",
    );

    expect(dims).toEqual(META_MUSE_SUPPORTED_DIMENSIONS);
    expect(parseSupportedDimensions('Invalid API key')).toBeNull();
  });

  it('seeds meta:muse@image with its 8 supported dimensions and supports picking closest aspect match', () => {
    const seeded = supportedDimensionsFor(DEFAULT_MODEL_LIBRARY, 'META:MUSE@IMAGE');
    expect(seeded).toHaveLength(8);

    // 3:2 landscape -> 1920x1280
    expect(pickClosestSupportedDimension(seeded, 3000, 2000)).toEqual({ width: 1920, height: 1280 });
    // 9:16 portrait -> 1152x2048
    expect(pickClosestSupportedDimension(seeded, 1080, 1920)).toEqual({ width: 1152, height: 2048 });
    // 21:9 ultrawide -> 2352x1008
    expect(pickClosestSupportedDimension(seeded, 2560, 1080)).toEqual({ width: 2352, height: 1008 });
    // 1:1 square -> 1600x1600
    expect(pickClosestSupportedDimension(seeded, 1000, 1000)).toEqual({ width: 1600, height: 1600 });
  });

  it('computes aspect-ratio compatibility, crop rectangle, and severity accurately', () => {
    const exact = computeAspectCompatibility(1920, 1280, 1920, 1280);
    expect(exact.severity).toBe('exact');
    expect(exact.cropPercent).toBe(0);
    expect(exact.targetAspectLabel).toBe('3:2');
    expect(exact.cropRect).toEqual({ x: 0, y: 0, width: 1, height: 1 });

    // Wide 16:9 image into 1:1 square crops ~44% of width -> heavy
    const heavy = computeAspectCompatibility(1600, 900, 1600, 1600);
    expect(heavy.severity).toBe('heavy');
    expect(heavy.cropPercent).toBe(44);
    expect(heavy.cropRect.width).toBeCloseTo(9 / 16, 4);
    expect(heavy.cropRect.height).toBe(1);
    expect(formatAspectRatioLabel(2352, 1008)).toBe('7:3');
  });

  it('records blocked parameters, supported dimensions, favorites, and supports forgetting learned knowledge', () => {
    const blocked = withBlockedParameter(DEFAULT_MODEL_LIBRARY, 'bytedance:foo@1', 'steps');
    expect(
      withBlockedParameter(blocked, 'bytedance:foo@1', 'steps').blockedParameters['bytedance:foo@1'],
    ).toEqual(['steps']);

    const withDims = withSupportedDimensions(blocked, 'bytedance:foo@1', [
      { width: 1024, height: 1024 },
      { width: 1024, height: 1024 },
      { width: 1280, height: 720 },
    ]);
    expect(supportedDimensionsFor(withDims, 'bytedance:foo@1')).toEqual([
      { width: 1024, height: 1024 },
      { width: 1280, height: 720 },
    ]);

    const forgotten = forgetModelKnowledge(withDims, 'bytedance:foo@1');
    expect(supportedDimensionsFor(forgotten, 'bytedance:foo@1')).toEqual([]);

    const favorited = withFavorite(blocked, ' meta:muse@image ', true);
    expect(favorited.favorites).toEqual(['meta:muse@image']);
    expect(withFavorite(favorited, 'META:MUSE@IMAGE', false).favorites).toEqual([]);
  });

  it('merges stored favorites and learned constraints with seeded meta:muse@image knowledge', () => {
    const merged = mergeModelLibrary({
      favorites: [' runware:400@6 ', ''],
      blockedParameters: { 'custom:model@1': ['steps', 'not-a-param'] },
      supportedDimensions: { 'custom:model@1': [{ width: 1024, height: 768 }] },
    });
    expect(merged.favorites).toEqual(['runware:400@6']);
    expect(merged.blockedParameters['meta:muse@image']).toEqual(['steps']);
    expect(merged.supportedDimensions['meta:muse@image']).toHaveLength(8);
    expect(merged.supportedDimensions['custom:model@1']).toEqual([{ width: 1024, height: 768 }]);
  });
});
