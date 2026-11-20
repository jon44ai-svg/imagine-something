export const OMITABLE_PARAMETERS = [
  'steps',
  'CFGScale',
  'acceleration',
  'negativePrompt',
  'seedImage',
  'strength',
] as const;

export type OmitableParameter = (typeof OMITABLE_PARAMETERS)[number];

export interface ModelLibrary {
  favorites: string[];
  blockedParameters: Record<string, string[]>;
}

export const DEFAULT_MODEL_LIBRARY: ModelLibrary = {
  favorites: [],
  blockedParameters: {
    'meta:muse@image': ['steps'],
  },
};

const UNSUPPORTED_PARAMETER_PATTERNS = [
  /unsupported use of '([^']+)' parameter/i,
  /parameter '([^']+)' is not supported/i,
];

export function parseUnsupportedParameter(message: string): OmitableParameter | null {
  for (const pattern of UNSUPPORTED_PARAMETER_PATTERNS) {
    const match = pattern.exec(message);
    const name = match?.[1];
    if (name && isOmitableParameter(name)) return name;
  }
  return null;
}

export function isOmitableParameter(name: string): name is OmitableParameter {
  return (OMITABLE_PARAMETERS as readonly string[]).includes(name);
}

export function blockedParametersFor(library: ModelLibrary, modelId: string): string[] {
  const trimmed = modelId.trim();
  if (!trimmed) return [];
  const direct = library.blockedParameters[trimmed];
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  const key = Object.keys(library.blockedParameters).find((candidate) => candidate.toLowerCase() === lower);
  return key ? library.blockedParameters[key] : [];
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

export function withFavorite(library: ModelLibrary, modelId: string, favorite: boolean): ModelLibrary {
  const model = modelId.trim();
  if (!model) return library;
  const without = library.favorites.filter((id) => id.toLowerCase() !== model.toLowerCase());
  return {
    ...library,
    favorites: favorite ? [...without, model] : without,
  };
}

export function mergeModelLibrary(parsed: Partial<ModelLibrary> | null | undefined): ModelLibrary {
  const favorites = Array.isArray(parsed?.favorites)
    ? parsed.favorites.filter((id): id is string => typeof id === 'string' && id.trim() !== '').map((id) => id.trim())
    : [];
  const blockedParameters: Record<string, string[]> = {
    ...DEFAULT_MODEL_LIBRARY.blockedParameters,
  };
  if (parsed?.blockedParameters && typeof parsed.blockedParameters === 'object') {
    for (const [model, params] of Object.entries(parsed.blockedParameters)) {
      if (!Array.isArray(params)) continue;
      const kept = params.filter((param): param is string => typeof param === 'string' && isOmitableParameter(param));
      if (kept.length > 0) blockedParameters[model] = kept;
    }
  }
  return {
    favorites: [...new Set(favorites)],
    blockedParameters,
  };
}
