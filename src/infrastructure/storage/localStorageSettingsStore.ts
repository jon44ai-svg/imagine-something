import type { GenerationSettings } from '../../domain/models';
import type { ISettingsReader, ISettingsWriter } from '../../domain/ports/storage';
import { DEFAULT_SETTINGS, LS_SETTINGS_KEY } from '../../domain/presets';

export class LocalStorageSettingsStore implements ISettingsReader, ISettingsWriter {
  private readonly storage: Storage;
  private readonly key: string;

  constructor(storage: Storage = window.localStorage, key: string = LS_SETTINGS_KEY) {
    this.storage = storage;
    this.key = key;
  }

  async load(): Promise<GenerationSettings> {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GenerationSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(settings: GenerationSettings): Promise<void> {
    try {
      this.storage.setItem(this.key, JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to persist settings:', err);
    }
  }
}
