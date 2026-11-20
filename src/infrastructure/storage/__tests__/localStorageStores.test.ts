import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, LS_API_KEY, LS_MODEL_LIBRARY_KEY, LS_SETTINGS_KEY } from '../../../domain/presets';
import { LocalStorageCredentialStore } from '../localStorageCredentialStore';
import { LocalStorageModelLibraryStore } from '../localStorageModelLibraryStore';
import { LocalStorageSettingsStore } from '../localStorageSettingsStore';

describe('LocalStorage stores (backwards-compatible keys)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('merges legacy stored settings with new Phase-1 defaults using runware_i2i_settings_v1', async () => {
    // Simulate legacy app_index.html JSON without concurrency or deliveryMethod
    window.localStorage.setItem(
      LS_SETTINGS_KEY,
      JSON.stringify({
        model: 'runware:400@3',
        positivePrompt: '80s pixel art',
        baseSize: 1024,
      }),
    );

    const store = new LocalStorageSettingsStore();
    const loaded = await store.load();

    expect(loaded.model).toBe('runware:400@3');
    expect(loaded.positivePrompt).toBe('80s pixel art');
    expect(loaded.baseSize).toBe(1024);
    expect(loaded.concurrency).toBe(DEFAULT_SETTINGS.concurrency);
    expect(loaded.deliveryMethod).toBe(DEFAULT_SETTINGS.deliveryMethod);
  });

  it('falls back to DEFAULT_SETTINGS when stored JSON is corrupt', async () => {
    window.localStorage.setItem(LS_SETTINGS_KEY, '{invalid-json');
    const store = new LocalStorageSettingsStore();
    const loaded = await store.load();
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it('persists and clears API key under runware_i2i_api_key', async () => {
    const store = new LocalStorageCredentialStore();
    await store.setApiKey('  rw_secret_123  ');
    expect(window.localStorage.getItem(LS_API_KEY)).toBe('rw_secret_123');
    expect(await store.getApiKey()).toBe('rw_secret_123');

    await store.setApiKey('   ');
    expect(window.localStorage.getItem(LS_API_KEY)).toBeNull();
    expect(await store.getApiKey()).toBe('');
  });

  it('persists favorite models and parameters learned from API errors', () => {
    const store = new LocalStorageModelLibraryStore();
    expect(store.blockedFor('meta:muse@image')).toEqual(['steps']);

    store.setFavorite('meta:muse@image', true);
    store.rememberBlocked('custom:model@2', 'CFGScale');

    const reloaded = new LocalStorageModelLibraryStore();
    expect(reloaded.snapshot().favorites).toEqual(['meta:muse@image']);
    expect(reloaded.blockedFor('custom:model@2')).toEqual(['CFGScale']);
    expect(window.localStorage.getItem(LS_MODEL_LIBRARY_KEY)).toContain('custom:model@2');
  });
});
