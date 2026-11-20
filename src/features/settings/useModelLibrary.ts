import { useEffect, useState } from 'react';
import { useServices } from '../../app/ServicesContext';
import {
  blockedParametersFor,
  supportedDimensionsFor,
  type ModelLibrary,
} from '../../domain/modelLibrary';
import type { ImageDimensions } from '../../domain/models';

export function useModelLibrary() {
  const { modelLibrary } = useServices();
  const [library, setLibrary] = useState<ModelLibrary>(() => modelLibrary.snapshot());

  useEffect(() => modelLibrary.subscribe(setLibrary), [modelLibrary]);

  return {
    library,
    blockedFor: (modelId: string) => blockedParametersFor(library, modelId),
    supportedDimensionsFor: (modelId: string) => supportedDimensionsFor(library, modelId),
    isFavorite: (modelId: string) =>
      library.favorites.some((id) => id.toLowerCase() === modelId.trim().toLowerCase()),
    setFavorite: (modelId: string, favorite: boolean) => modelLibrary.setFavorite(modelId, favorite),
    rememberSupportedDimensions: (modelId: string, dimensions: readonly ImageDimensions[]) =>
      modelLibrary.rememberSupportedDimensions(modelId, dimensions),
    clearModelKnowledge: (modelId: string) => modelLibrary.clearModelKnowledge(modelId),
  };
}
