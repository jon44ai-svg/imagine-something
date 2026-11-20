import {
  blockedParametersFor,
  DEFAULT_MODEL_LIBRARY,
  forgetModelKnowledge,
  mergeModelLibrary,
  supportedDimensionsFor,
  withBlockedParameter,
  withFavorite,
  withSupportedDimensions,
  type ModelLibrary,
} from '../../domain/modelLibrary';
import type { ImageDimensions } from '../../domain/models';
import type { IModelLibraryReader, IModelLibraryWriter } from '../../domain/ports/modelLibrary';
import { LS_MODEL_LIBRARY_KEY } from '../../domain/presets';

export class LocalStorageModelLibraryStore implements IModelLibraryReader, IModelLibraryWriter {
  private readonly storage: Storage;
  private readonly key: string;
  private library: ModelLibrary;
  private readonly listeners = new Set<(library: ModelLibrary) => void>();

  constructor(storage: Storage = window.localStorage, key: string = LS_MODEL_LIBRARY_KEY) {
    this.storage = storage;
    this.key = key;
    this.library = this.read();
  }

  snapshot(): ModelLibrary {
    return this.library;
  }

  blockedFor(modelId: string): readonly string[] {
    return blockedParametersFor(this.library, modelId);
  }

  supportedDimensionsFor(modelId: string): readonly ImageDimensions[] {
    return supportedDimensionsFor(this.library, modelId);
  }

  subscribe(listener: (library: ModelLibrary) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  rememberBlocked(modelId: string, parameter: string): void {
    const next = withBlockedParameter(this.library, modelId, parameter);
    if (next === this.library) return;
    this.commit(next);
  }

  rememberSupportedDimensions(modelId: string, dimensions: readonly ImageDimensions[]): void {
    const next = withSupportedDimensions(this.library, modelId, dimensions);
    if (next === this.library) return;
    this.commit(next);
  }

  clearModelKnowledge(modelId: string): void {
    const next = forgetModelKnowledge(this.library, modelId);
    if (next === this.library) return;
    this.commit(next);
  }

  setFavorite(modelId: string, favorite: boolean): void {
    const next = withFavorite(this.library, modelId, favorite);
    if (next === this.library) return;
    this.commit(next);
  }

  private commit(next: ModelLibrary): void {
    this.library = next;
    try {
      this.storage.setItem(this.key, JSON.stringify(next));
    } catch (err) {
      console.error('Failed to persist model library:', err);
    }
    for (const listener of this.listeners) listener(next);
  }

  private read(): ModelLibrary {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return structuredClone(DEFAULT_MODEL_LIBRARY);
      return mergeModelLibrary(JSON.parse(raw) as Partial<ModelLibrary>);
    } catch {
      return structuredClone(DEFAULT_MODEL_LIBRARY);
    }
  }
}
