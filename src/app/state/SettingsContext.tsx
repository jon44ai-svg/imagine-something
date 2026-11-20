import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GenerationSettings, PreflightField } from '../../domain/models';
import { DEFAULT_SETTINGS, MODEL_PRESETS } from '../../domain/presets';
import { useServices } from '../ServicesContext';

export interface SettingsContextValue {
  settings: GenerationSettings;
  apiKey: string;
  isLoaded: boolean;
  requestedFocusField: PreflightField | null;
  updateSettings: (patch: Partial<GenerationSettings>) => void;
  applyModelPreset: (presetId: string) => void;
  setApiKey: (value: string) => void;
  toggleSettingsHidden: () => void;
  requestFocusField: (field: PreflightField | null) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { settingsReader, settingsWriter, credentialReader, credentialWriter } = useServices();

  const [settings, setSettings] = useState<GenerationSettings>({ ...DEFAULT_SETTINGS });
  const [apiKey, setApiKeyState] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [requestedFocusField, setRequestedFocusField] = useState<PreflightField | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([settingsReader.load(), credentialReader.getApiKey()]).then(
      ([loadedSettings, loadedKey]) => {
        if (!active) return;
        setSettings(loadedSettings);
        setApiKeyState(loadedKey);
        setIsLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, [settingsReader, credentialReader]);

  const updateSettings = useCallback(
    (patch: Partial<GenerationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        void settingsWriter.save(next);
        return next;
      });
    },
    [settingsWriter],
  );

  const applyModelPreset = useCallback(
    (presetId: string) => {
      const preset = MODEL_PRESETS[presetId];
      if (!preset) return;
      updateSettings({
        model: preset.id,
        steps: preset.steps,
        CFGScale: preset.CFGScale,
        acceleration: preset.acceleration,
        inputMode: preset.inputMode,
      });
    },
    [updateSettings],
  );

  const setApiKey = useCallback(
    (value: string) => {
      setApiKeyState(value);
      void credentialWriter.setApiKey(value);
    },
    [credentialWriter],
  );

  const toggleSettingsHidden = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, settingsHidden: !prev.settingsHidden };
      void settingsWriter.save(next);
      return next;
    });
  }, [settingsWriter]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      apiKey,
      isLoaded,
      requestedFocusField,
      updateSettings,
      applyModelPreset,
      setApiKey,
      toggleSettingsHidden,
      requestFocusField: setRequestedFocusField,
    }),
    [
      settings,
      apiKey,
      isLoaded,
      requestedFocusField,
      updateSettings,
      applyModelPreset,
      setApiKey,
      toggleSettingsHidden,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside a SettingsProvider');
  }
  return ctx;
}
