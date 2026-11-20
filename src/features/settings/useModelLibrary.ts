import { useEffect, useState } from 'react';
import { useServices } from '../../app/ServicesContext';
import type { ModelLibrary } from '../../domain/modelLibrary';
import { blockedParametersFor } from '../../domain/modelLibrary';

export function useModelLibrary() {
  const { modelLibrary } = useServices();
  const [library, setLibrary] = useState<ModelLibrary>(() => modelLibrary.snapshot());

  useEffect(() => modelLibrary.subscribe(setLibrary), [modelLibrary]);

  return {
    library,
    blockedFor: (modelId: string) => blockedParametersFor(library, modelId),
    isFavorite: (modelId: string) =>
      library.favorites.some((id) => id.toLowerCase() === modelId.trim().toLowerCase()),
    setFavorite: (modelId: string, favorite: boolean) => modelLibrary.setFavorite(modelId, favorite),
  };
}
