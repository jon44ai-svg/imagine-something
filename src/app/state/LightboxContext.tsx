import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueueData } from './QueueDataContext';

export interface LightboxContextValue {
  activeOutputId: string | null;
  activeInputId: string | null;
  compareEnabled: boolean;
  openLightbox: (outputId: string) => void;
  openInputLightbox: (inputId: string) => void;
  closeLightbox: () => void;
  toggleCompare: () => void;
  goPrev: () => void;
  goNext: () => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const { outputs } = useQueueData();
  const [activeOutputId, setActiveOutputId] = useState<string | null>(null);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);

  const openLightbox = useCallback((outputId: string) => {
    setActiveInputId(null);
    setActiveOutputId(outputId);
  }, []);

  const openInputLightbox = useCallback((inputId: string) => {
    setActiveOutputId(null);
    setActiveInputId(inputId);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveOutputId(null);
    setActiveInputId(null);
  }, []);

  const toggleCompare = useCallback(() => {
    setCompareEnabled((prev) => !prev);
  }, []);

  const goPrev = useCallback(() => {
    setActiveOutputId((current) => {
      if (!current) return null;
      const idx = outputs.findIndex((o) => o.id === current);
      return idx > 0 ? outputs[idx - 1].id : current;
    });
  }, [outputs]);

  const goNext = useCallback(() => {
    setActiveOutputId((current) => {
      if (!current) return null;
      const idx = outputs.findIndex((o) => o.id === current);
      return idx >= 0 && idx < outputs.length - 1 ? outputs[idx + 1].id : current;
    });
  }, [outputs]);

  const value = useMemo<LightboxContextValue>(
    () => ({
      activeOutputId,
      activeInputId,
      compareEnabled,
      openLightbox,
      openInputLightbox,
      closeLightbox,
      toggleCompare,
      goPrev,
      goNext,
    }),
    [
      activeOutputId,
      activeInputId,
      compareEnabled,
      openLightbox,
      openInputLightbox,
      closeLightbox,
      toggleCompare,
      goPrev,
      goNext,
    ],
  );

  return <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>;
}

export function useLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) {
    throw new Error('useLightbox must be used inside a LightboxProvider');
  }
  return ctx;
}
