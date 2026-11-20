import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueueData } from './QueueDataContext';

export type LightboxViewMode = 'inspect' | 'slider' | 'side-by-side';

export interface LightboxContextValue {
  activeOutputId: string | null;
  activeInputId: string | null;
  compareEnabled: boolean;
  viewMode: LightboxViewMode;
  aspectPreviewOpen: boolean;
  aspectPreviewInputId: string | null;
  openLightbox: (outputId: string, initialMode?: LightboxViewMode) => void;
  openInputLightbox: (inputId: string) => void;
  closeLightbox: () => void;
  toggleCompare: () => void;
  setViewMode: (mode: LightboxViewMode) => void;
  openAspectPreview: (inputId?: string) => void;
  closeAspectPreview: () => void;
  goPrev: () => void;
  goNext: () => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const { outputs } = useQueueData();
  const [activeOutputId, setActiveOutputId] = useState<string | null>(null);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<LightboxViewMode>('inspect');
  const [aspectPreviewOpen, setAspectPreviewOpen] = useState<boolean>(false);
  const [aspectPreviewInputId, setAspectPreviewInputId] = useState<string | null>(null);

  const openLightbox = useCallback((outputId: string, initialMode?: LightboxViewMode) => {
    setActiveInputId(null);
    setActiveOutputId(outputId);
    if (initialMode) {
      setViewModeState(initialMode);
    }
  }, []);

  const openInputLightbox = useCallback((inputId: string) => {
    setActiveOutputId(null);
    setActiveInputId(inputId);
    setViewModeState('inspect');
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveOutputId(null);
    setActiveInputId(null);
  }, []);

  const toggleCompare = useCallback(() => {
    setViewModeState((prev) => (prev === 'side-by-side' ? 'inspect' : 'side-by-side'));
  }, []);

  const setViewMode = useCallback((mode: LightboxViewMode) => {
    setViewModeState(mode);
  }, []);

  const openAspectPreview = useCallback((inputId?: string) => {
    setAspectPreviewInputId(inputId ?? null);
    setAspectPreviewOpen(true);
  }, []);

  const closeAspectPreview = useCallback(() => {
    setAspectPreviewOpen(false);
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

  const compareEnabled = viewMode === 'side-by-side';

  const value = useMemo<LightboxContextValue>(
    () => ({
      activeOutputId,
      activeInputId,
      compareEnabled,
      viewMode,
      aspectPreviewOpen,
      aspectPreviewInputId,
      openLightbox,
      openInputLightbox,
      closeLightbox,
      toggleCompare,
      setViewMode,
      openAspectPreview,
      closeAspectPreview,
      goPrev,
      goNext,
    }),
    [
      activeOutputId,
      activeInputId,
      compareEnabled,
      viewMode,
      aspectPreviewOpen,
      aspectPreviewInputId,
      openLightbox,
      openInputLightbox,
      closeLightbox,
      toggleCompare,
      setViewMode,
      openAspectPreview,
      closeAspectPreview,
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
