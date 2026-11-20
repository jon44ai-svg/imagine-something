import type { ICredentialReader, ICredentialWriter } from '../../domain/ports/storage';
import { LS_API_KEY } from '../../domain/presets';

export class LocalStorageCredentialStore implements ICredentialReader, ICredentialWriter {
  private readonly storage: Storage;
  private readonly key: string;

  constructor(storage: Storage = window.localStorage, key: string = LS_API_KEY) {
    this.storage = storage;
    this.key = key;
  }

  async getApiKey(): Promise<string> {
    try {
      return this.storage.getItem(this.key) || '';
    } catch {
      return '';
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    try {
      const trimmed = apiKey.trim();
      if (trimmed) {
        this.storage.setItem(this.key, trimmed);
      } else {
        this.storage.removeItem(this.key);
      }
    } catch (err) {
      console.error('Failed to persist API key:', err);
    }
  }
}
