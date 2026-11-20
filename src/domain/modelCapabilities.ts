import { computeDimensions, round64 } from '../utils/dimensions';
import {
  formatDimensionKey,
  parseDimensionKey,
  pickClosestSupportedDimension,
} from './modelLibrary';
import type { AspectRatio, GenerationSettings, ImageDimensions, ResolutionTier } from './models';

export interface ModelCapabilities {
  supportsSteps: boolean;
  supportsCfgScale: boolean;
  supportsAcceleration: boolean;
  supportsNegativePrompt: boolean;
  supportsSeedImage: boolean;
  maxOutputQuality: number;
  dimensionMode: 'multipleOf64' | 'googleNanoBanana';
}

export type ResolvedTargetSizing =
  | {
      mode: 'resolution';
      resolution: ResolutionTier;
      fallbackDimensions: ImageDimensions;
    }
  | {
      mode: 'dimensions';
      width: number;
      height: number;
    };

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  supportsSteps: true,
  supportsCfgScale: true,
  supportsAcceleration: true,
  supportsNegativePrompt: true,
  supportsSeedImage: true,
  maxOutputQuality: 100,
  dimensionMode: 'multipleOf64',
};

const GOOGLE_NANO_BANANA_CAPABILITIES: ModelCapabilities = {
  supportsSteps: false,
  supportsCfgScale: false,
  supportsAcceleration: false,
  supportsNegativePrompt: false,
  supportsSeedImage: false,
  maxOutputQuality: 99,
  dimensionMode: 'googleNanoBanana',
};

// Official Runware Google Nano Banana supported dimension table (1K / 2K / 4K)
const NANO_BANANA_DIMENSIONS: Record<ResolutionTier, Record<string, ImageDimensions>> = {
  '1K': {
    '1:1': { width: 1024, height: 1024 },
    '3:2': { width: 1264, height: 848 },
    '2:3': { width: 848, height: 1264 },
    '4:3': { width: 1200, height: 896 },
    '3:4': { width: 896, height: 1200 },
    '16:9': { width: 1376, height: 768 },
    '9:16': { width: 768, height: 1376 },
  },
  '2K': {
    '1:1': { width: 2048, height: 2048 },
    '3:2': { width: 2528, height: 1696 },
    '2:3': { width: 1696, height: 2528 },
    '4:3': { width: 2400, height: 1792 },
    '3:4': { width: 1792, height: 2400 },
    '16:9': { width: 2752, height: 1536 },
    '9:16': { width: 1536, height: 2752 },
  },
  '4K': {
    '1:1': { width: 4096, height: 4096 },
    '3:2': { width: 5056, height: 3392 },
    '2:3': { width: 3392, height: 5056 },
    '4:3': { width: 4800, height: 3584 },
    '3:4': { width: 3584, height: 4800 },
    '16:9': { width: 5504, height: 3072 },
    '9:16': { width: 3072, height: 5504 },
  },
};

const BLOCKED_PARAMETER_FLAGS: Record<string, keyof ModelCapabilities> = {
  steps: 'supportsSteps',
  CFGScale: 'supportsCfgScale',
  acceleration: 'supportsAcceleration',
  negativePrompt: 'supportsNegativePrompt',
  seedImage: 'supportsSeedImage',
  strength: 'supportsSeedImage',
};

export function resolveModelCapabilities(
  modelId: string,
  blockedParameters: readonly string[] = [],
): ModelCapabilities {
  const normalized = (modelId || '').trim().toLowerCase();
  let capabilities =
    normalized.startsWith('google:')
      ? GOOGLE_NANO_BANANA_CAPABILITIES
      : normalized === 'meta:muse@image'
        ? { ...DEFAULT_CAPABILITIES, supportsSteps: false }
        : DEFAULT_CAPABILITIES;

  for (const parameter of blockedParameters) {
    const flag = BLOCKED_PARAMETER_FLAGS[parameter];
    if (flag) capabilities = { ...capabilities, [flag]: false };
  }
  return capabilities;
}

export function baseSizeToResolutionTier(baseSize: number): ResolutionTier {
  if (baseSize <= 1024) return '1K';
  if (baseSize <= 2048) return '2K';
  return '4K';
}

export function resolveTargetSizing(
  settings: Pick<
    GenerationSettings,
    'model' | 'aspectRatio' | 'baseSize' | 'customWidth' | 'customHeight'
  > &
    Partial<Pick<GenerationSettings, 'resolutionMode' | 'fixedResolution'>>,
  inputWidth?: number,
  inputHeight?: number,
  supportedDimensions?: readonly ImageDimensions[],
): ResolvedTargetSizing {
  if (supportedDimensions && supportedDimensions.length > 0) {
    if (settings.resolutionMode === 'fixed' && settings.fixedResolution) {
      const parsed = parseDimensionKey(settings.fixedResolution);
      const exact = parsed
        ? supportedDimensions.find(
            (d) => d.width === parsed.width && d.height === parsed.height,
          )
        : undefined;
      if (exact) {
        return {
          mode: 'dimensions',
          width: exact.width,
          height: exact.height,
        };
      }
    }

    const chosen = pickClosestSupportedDimension(
      supportedDimensions,
      inputWidth,
      inputHeight,
      settings.baseSize,
    );
    return {
      mode: 'dimensions',
      width: chosen.width,
      height: chosen.height,
    };
  }

  const capabilities = resolveModelCapabilities(settings.model);

  if (capabilities.dimensionMode === 'googleNanoBanana') {
    const tier = baseSizeToResolutionTier(settings.baseSize);

    if (settings.aspectRatio === 'match') {
      const fallbackDimensions = computeDimensions(
        'match',
        settings.baseSize,
        inputWidth,
        inputHeight,
      );
      return {
        mode: 'resolution',
        resolution: tier,
        fallbackDimensions,
      };
    }

    if (settings.aspectRatio === 'custom') {
      return {
        mode: 'dimensions',
        width: round64(settings.customWidth),
        height: round64(settings.customHeight),
      };
    }

    const mapped = NANO_BANANA_DIMENSIONS[tier][settings.aspectRatio];
    if (mapped) {
      return {
        mode: 'dimensions',
        width: mapped.width,
        height: mapped.height,
      };
    }
  }

  const dims = computeDimensions(
    settings.aspectRatio as AspectRatio,
    settings.baseSize,
    inputWidth,
    inputHeight,
    settings.customWidth,
    settings.customHeight,
  );

  return {
    mode: 'dimensions',
    width: dims.width,
    height: dims.height,
  };
}

export function formatSizingPreview(
  settings: Pick<
    GenerationSettings,
    'model' | 'aspectRatio' | 'baseSize' | 'customWidth' | 'customHeight'
  > &
    Partial<Pick<GenerationSettings, 'resolutionMode' | 'fixedResolution'>>,
  supportedDimensions?: readonly ImageDimensions[],
): string {
  if (supportedDimensions && supportedDimensions.length > 0) {
    if (settings.resolutionMode === 'fixed' && settings.fixedResolution) {
      const parsed = parseDimensionKey(settings.fixedResolution);
      const exact = parsed
        ? supportedDimensions.find(
            (d) => d.width === parsed.width && d.height === parsed.height,
          )
        : undefined;
      if (exact) {
        return `${formatDimensionKey(exact)} (Fixed)`;
      }
    }
    return `Infer (${supportedDimensions.length} sizes)`;
  }

  const resolved = resolveTargetSizing(settings, 1024, 1024);
  if (resolved.mode === 'resolution') {
    return `Match Input (${resolved.resolution})`;
  }
  if (settings.aspectRatio === 'match') {
    return `Auto (max ${settings.baseSize}px)`;
  }
  return `${resolved.width} x ${resolved.height}`;
}
