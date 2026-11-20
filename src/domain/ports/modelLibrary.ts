import type { ModelLibrary } from '../modelLibrary';

export interface IModelLibraryReader {
  snapshot(): ModelLibrary;
  blockedFor(modelId: string): readonly string[];
  subscribe(listener: (library: ModelLibrary) => void): () => void;
}

export interface IModelLibraryWriter {
  rememberBlocked(modelId: string, parameter: string): void;
  setFavorite(modelId: string, favorite: boolean): void;
}
