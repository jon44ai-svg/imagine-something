import type { ImageDimensions, NormalizedRect } from './models';

export const OMITABLE_PARAMETERS = [
  'steps',
  'CFGScale',
  'acceleration',
  'negativePrompt',
  'seedImage',
  'strength',
] as const;

export type OmitableParameter = (typeof OMITABLE_PARAMETERS)[number];

export type AspectCompatibilitySeverity = 'exact' | 'good' | 'moderate' | 'heavy';

export interface AspectCompatibility {
  inputWidth: number;
  inputHeight: number;
  targetWidth: number;
  targetHeight: number;
  inputRatio: number;
  targetRatio: number;
  targetAspectLabel: string;
  cropPercent: number;
  severity: AspectCompatibilitySeverity;
  /** Centered region of the original image (0..1) that survives a cover-crop into target aspect */
  cropRect: NormalizedRect;
}

export interface ModelLibrary {
  favorites: string[];
  blockedParameters: Record<string, string[]>;
  supportedDimensions: Record<string, ImageDimensions[]>;
}

export const META_MUSE_SUPPORTED_DIMENSIONS: readonly ImageDimensions[] = [
  { width: 1600, height: 1600 },
  { width: 1920, height: 1280 },
  { width: 1280, height: 1920 },
  { width: 1792, height: 1344 },
  { width: 1344, height: 1792 },
  { width: 2048, height: 1152 },
  { width: 1152, height: 2048 },
  { width: 2352, height: 1008 },
];

export const DEFAULT_MODEL_LIBRARY: ModelLibrary = {
  favorites: [],
  blockedParameters: {
    'meta:muse@image': ['steps'],
  },
  supportedDimensions: {
    'meta:muse@image': META_MUSE_SUPPORTED_DIMENSIONS.map((d) => ({ ...d })),
  },
};

const UNSUPPORTED_PARAMETER_PATTERNS = [
  /unsupported use of '([^']+)' parameter/i,
  /parameter '([^']+)' is not supported/i,
];

const UNSUPPORTED_DIMENSIONS_INDICATOR =
  /unsupported use of width\/height|dimensions?\s+are\s+not\s+supported|supported\s+values\s+are/i;

const DIMENSION_PAIR_REGEX = /\b(\d{2,5})\s*[x×]\s*(\d{2,5})\b/gi;

export function formatDimensionKey(dim: ImageDimensions): string {
  return `${dim.width}x${dim.height}`;
}

export function parseDimensionKey(key: string): ImageDimensions | null {
  const match = /^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(key);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) {
    return null;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export function formatAspectRatioLabel(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '1:1';
  }
  const w = Math.round(width);
  const h = Math.round(height);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(w, h);
  const rw = w / divisor;
  const rh = h / divisor;
  if (rw <= 32 && rh <= 32) {
    return `${rw}:${rh}`;
  }
  return `${(w / h).toFixed(2)}:1`;
}

export function parseUnsupportedParameter(message: string): OmitableParameter | null {
  for (const pattern of UNSUPPORTED_PARAMETER_PATTERNS) {
    const match = pattern.exec(message);
    const name = match?.[1];
    if (name && isOmitableParameter(name)) return name;
  }
  return null;
}

export function parseSupportedDimensions(message: string): ImageDimensions[] | null {
  if (!UNSUPPORTED_DIMENSIONS_INDICATOR.test(message)) {
    return null;
  }

  const seen = new Set<string>();
  const parsed: ImageDimensions[] = [];
  for (const match of message.matchAll(DIMENSION_PAIR_REGEX)) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) {
      continue;
    }
    const key = `${width}x${height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push({ width, height });
  }

  return parsed.length > 0 ? parsed : null;
}

export function isOmitableParameter(name: string): name is OmitableParameter {
  return (OMITABLE_PARAMETERS as readonly string[]).includes(name);
}

function findCaseInsensitiveKey<T>(record: Record<string, T>, modelId: string): string | undefined {
  const trimmed = modelId.trim();
  if (!trimmed) return undefined;
  if (Object.prototype.hasOwnProperty.call(record, trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  return Object.keys(record).find((candidate) => candidate.toLowerCase() === lower);
}

export function blockedParametersFor(library: ModelLibrary, modelId: string): string[] {
  const key = findCaseInsensitiveKey(library.blockedParameters, modelId);
  return key ? library.blockedParameters[key] : [];
}

export function supportedDimensionsFor(library: ModelLibrary, modelId: string): ImageDimensions[] {
  const key = findCaseInsensitiveKey(library.supportedDimensions, modelId);
  return key ? library.supportedDimensions[key] : [];
}

export function withBlockedParameter(
  library: ModelLibrary,
  modelId: string,
  parameter: string,
): ModelLibrary {
  const model = modelId.trim();
  if (!model || !isOmitableParameter(parameter)) return library;
  const existing = blockedParametersFor(library, model);
  if (existing.includes(parameter)) return library;
  return {
    ...library,
    blockedParameters: {
      ...library.blockedParameters,
      [model]: [...existing, parameter],
    },
  };
}

function deduplicateDimensions(dimensions: readonly ImageDimensions[]): ImageDimensions[] {
  const seen = new Set<string>();
  const clean: ImageDimensions[] = [];
  for (const dim of dimensions) {
    if (
      !dim ||
      !Number.isFinite(dim.width) ||
      !Number.isFinite(dim.height) ||
      dim.width < 64 ||
      dim.height < 64
    ) {
      continue;
    }
    const width = Math.round(dim.width);
    const height = Math.round(dim.height);
    const key = `${width}x${height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({ width, height });
  }
  return clean;
}

export function withSupportedDimensions(
  library: ModelLibrary,
  modelId: string,
  dimensions: readonly ImageDimensions[],
): ModelLibrary {
  const model = modelId.trim();
  if (!model) return library;
  const clean = deduplicateDimensions(dimensions);
  if (clean.length === 0) return library;

  const existingKey = findCaseInsensitiveKey(library.supportedDimensions, model);
  const existing = existingKey ? library.supportedDimensions[existingKey] : [];
  if (
    existing.length === clean.length &&
    existing.every((d, i) => d.width === clean[i].width && d.height === clean[i].height)
  ) {
    return library;
  }

  const nextDimensions = { ...library.supportedDimensions };
  if (existingKey && existingKey !== model) {
    delete nextDimensions[existingKey];
  }
  nextDimensions[model] = clean;

  return {
    ...library,
    supportedDimensions: nextDimensions,
  };
}

export function forgetModelKnowledge(library: ModelLibrary, modelId: string): ModelLibrary {
  const model = modelId.trim();
  if (!model) return library;
  const blockedKey = findCaseInsensitiveKey(library.blockedParameters, model);
  const dimsKey = findCaseInsensitiveKey(library.supportedDimensions, model);
  if (!blockedKey && !dimsKey) return library;

  const nextBlocked = { ...library.blockedParameters };
  if (blockedKey) delete nextBlocked[blockedKey];

  const nextDimensions = { ...library.supportedDimensions };
  if (dimsKey) delete nextDimensions[dimsKey];

  return {
    ...library,
    blockedParameters: nextBlocked,
    supportedDimensions: nextDimensions,
  };
}

export function withFavorite(
  library: ModelLibrary,
  modelId: string,
  favorite: boolean,
): ModelLibrary {
  const model = modelId.trim();
  if (!model) return library;
  const without = library.favorites.filter((id) => id.toLowerCase() !== model.toLowerCase());
  return {
    ...library,
    favorites: favorite ? [...without, model] : without,
  };
}

export function pickClosestSupportedDimension(
  allowed: readonly ImageDimensions[],
  inputWidth?: number,
  inputHeight?: number,
  preferredBaseSize = 1600,
): ImageDimensions {
  if (allowed.length === 0) {
    return { width: 1024, height: 1024 };
  }

  const validInput =
    typeof inputWidth === 'number' &&
    typeof inputHeight === 'number' &&
    inputWidth > 0 &&
    inputHeight > 0;
  const inputRatio = validInput ? inputWidth / inputHeight : 1;

  let best = allowed[0];
  let bestRatioDist = Number.POSITIVE_INFINITY;
  let bestSizeDist = Number.POSITIVE_INFINITY;

  for (const dim of allowed) {
    const dimRatio = dim.width / dim.height;
    const ratioDist = Math.abs(Math.log(dimRatio / inputRatio));
    const sizeDist = Math.abs(Math.max(dim.width, dim.height) - preferredBaseSize);

    if (
      ratioDist < bestRatioDist - 1e-4 ||
      (Math.abs(ratioDist - bestRatioDist) <= 1e-4 && sizeDist < bestSizeDist)
    ) {
      best = dim;
      bestRatioDist = ratioDist;
      bestSizeDist = sizeDist;
    }
  }

  return best;
}

export function computeAspectCompatibility(
  inputWidth: number,
  inputHeight: number,
  targetWidth: number,
  targetHeight: number,
): AspectCompatibility {
  const safeInW = inputWidth > 0 ? inputWidth : targetWidth;
  const safeInH = inputHeight > 0 ? inputHeight : targetHeight;
  const safeTargetW = targetWidth > 0 ? targetWidth : 1024;
  const safeTargetH = targetHeight > 0 ? targetHeight : 1024;

  const inputRatio = safeInW / safeInH;
  const targetRatio = safeTargetW / safeTargetH;

  let cropWidth = 1;
  let cropHeight = 1;
  if (inputRatio > targetRatio) {
    // Original is wider than target — left/right edges get cropped
    cropWidth = Math.min(1, targetRatio / inputRatio);
  } else if (targetRatio > inputRatio) {
    // Original is taller than target — top/bottom edges get cropped
    cropHeight = Math.min(1, inputRatio / targetRatio);
  }

  const cropRect: NormalizedRect = {
    x: (1 - cropWidth) / 2,
    y: (1 - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };

  const cropPercent = Math.max(0, Math.min(100, Math.round((1 - cropWidth * cropHeight) * 100)));
  const severity: AspectCompatibilitySeverity =
    cropPercent <= 2
      ? 'exact'
      : cropPercent <= 15
        ? 'good'
        : cropPercent <= 30
          ? 'moderate'
          : 'heavy';

  return {
    inputWidth: safeInW,
    inputHeight: safeInH,
    targetWidth: safeTargetW,
    targetHeight: safeTargetH,
    inputRatio,
    targetRatio,
    targetAspectLabel: formatAspectRatioLabel(safeTargetW, safeTargetH),
    cropPercent,
    severity,
    cropRect,
  };
}

export function mergeModelLibrary(parsed: Partial<ModelLibrary> | null | undefined): ModelLibrary {
  const favorites = Array.isArray(parsed?.favorites)
    ? parsed.favorites
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
        .map((id) => id.trim())
    : [];

  const blockedParameters: Record<string, string[]> = {
    ...DEFAULT_MODEL_LIBRARY.blockedParameters,
  };
  if (parsed?.blockedParameters && typeof parsed.blockedParameters === 'object') {
    for (const [model, params] of Object.entries(parsed.blockedParameters)) {
      if (!Array.isArray(params)) continue;
      const kept = params.filter(
        (param): param is string => typeof param === 'string' && isOmitableParameter(param),
      );
      if (kept.length > 0) blockedParameters[model] = kept;
    }
  }

  const supportedDimensions: Record<string, ImageDimensions[]> = {};
  for (const [model, dims] of Object.entries(DEFAULT_MODEL_LIBRARY.supportedDimensions)) {
    supportedDimensions[model] = dims.map((d) => ({ ...d }));
  }
  if (parsed?.supportedDimensions && typeof parsed.supportedDimensions === 'object') {
    for (const [model, dims] of Object.entries(parsed.supportedDimensions)) {
      if (!Array.isArray(dims)) continue;
      const clean = deduplicateDimensions(dims as ImageDimensions[]);
      if (clean.length > 0) supportedDimensions[model] = clean;
    }
  }

  return {
    favorites: [...new Set(favorites)],
    blockedParameters,
    supportedDimensions,
  };
}
