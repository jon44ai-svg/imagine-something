import type { ModelLibrary } from '../modelLibrary';
import type { ImageDimensions } from '../models';

export interface IModelLibraryReader {
  snapshot(): ModelLibrary;
  blockedFor(modelId: string): readonly string[];
  supportedDimensionsFor(modelId: string): readonly ImageDimensions[];
  subscribe(listener: (library: ModelLibrary) => void): () => void;
}

export interface IModelLibraryWriter {
  rememberBlocked(modelId: string, parameter: string): void;
  rememberSupportedDimensions(modelId: string, dimensions: readonly ImageDimensions[]): void;
  clearModelKnowledge(modelId: string): void;
  setFavorite(modelId: string, favorite: boolean): void;
}
