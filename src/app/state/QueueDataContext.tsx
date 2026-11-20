import { notifications } from '@mantine/notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { InputRecord, OutputRecord } from '../../domain/models';
import { MAX_IMAGES } from '../../domain/presets';
import { useServices } from '../ServicesContext';

export interface QueueDataContextValue {
  inputs: InputRecord[];
  outputs: OutputRecord[];
  isHydrated: boolean;
  storageError: string | null;
  totalCost: number;
  getObjectUrl: (id: string, blob?: Blob | null, fallbackUrl?: string) => string;
  addFiles: (files: readonly File[]) => Promise<void>;
  removeInput: (inputId: string) => Promise<void>;
  removeOutput: (outputId: string) => Promise<void>;
  resetAllToPending: () => Promise<void>;
  clearOutputs: () => Promise<void>;
  clearAll: () => Promise<void>;
  upsertInputInState: (record: InputRecord) => void;
  appendOutputsInState: (records: OutputRecord[]) => void;
}

const QueueDataContext = createContext<QueueDataContextValue | null>(null);

export function QueueDataProvider({ children }: { children: ReactNode }) {
  const {
    recoverStuckItems,
    outputReader,
    objectUrlRegistry,
    ingestFiles,
    removeInput: removeInputUseCase,
    removeOutput: removeOutputUseCase,
    resetQueue,
    clearStorage,
  } = useServices();

  const [inputs, setInputs] = useState<InputRecord[]>([]);
  const [outputs, setOutputs] = useState<OutputRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([recoverStuckItems.execute(), outputReader.list()])
      .then(([recoveredInputs, storedOutputs]) => {
        if (!active) return;
        setInputs(recoveredInputs);
        setOutputs(storedOutputs);
        setIsHydrated(true);
      })
      .catch((err) => {
        if (!active) return;
        console.error('IndexedDB initialization error:', err);
        const message =
          'IndexedDB failed to open. Private browsing or sandboxed iframes may restrict storage.';
        setStorageError(message);
        setIsHydrated(true);
        notifications.show({
          title: 'Storage Error',
          message,
          color: 'red',
        });
      });

    return () => {
      active = false;
    };
  }, [recoverStuckItems, outputReader]);

  const getObjectUrl = useCallback(
    (id: string, blob?: Blob | null, fallbackUrl?: string) =>
      objectUrlRegistry.acquire(id, blob, fallbackUrl),
    [objectUrlRegistry],
  );

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      const result = await ingestFiles.execute(files);

      if (result.limitReached) {
        notifications.show({
          message: `Pipeline limit reached (${MAX_IMAGES} images max). Remove some images first.`,
          color: 'red',
        });
        return;
      }

      if (result.added.length > 0) {
        setInputs((prev) => [...prev, ...result.added]);
        notifications.show({
          message: `Added ${result.added.length} image(s) to pipeline.`,
          color: 'teal',
        });
      }

      if (result.skippedLimit > 0) {
        notifications.show({
          message: `Skipped ${result.skippedLimit} image(s) - max ${MAX_IMAGES} images in pipeline.`,
          color: 'indigo',
        });
      }

      if (result.skippedNonImage > 0) {
        notifications.show({
          message: `Skipped ${result.skippedNonImage} non-image file(s).`,
          color: 'indigo',
        });
      }
    },
    [ingestFiles],
  );

  const removeInput = useCallback(
    async (inputId: string) => {
      const removedOutputIds = await removeInputUseCase.execute(inputId);
      const removedSet = new Set(removedOutputIds);
      setInputs((prev) => prev.filter((item) => item.id !== inputId));
      setOutputs((prev) => prev.filter((out) => !removedSet.has(out.id)));
    },
    [removeInputUseCase],
  );

  const removeOutput = useCallback(
    async (outputId: string) => {
      await removeOutputUseCase.execute(outputId);
      setOutputs((prev) => prev.filter((out) => out.id !== outputId));
    },
    [removeOutputUseCase],
  );

  const resetAllToPending = useCallback(async () => {
    const updated = await resetQueue.execute();
    setInputs(updated);
    notifications.show({
      message: 'All queued images reset to Pending.',
      color: 'indigo',
    });
  }, [resetQueue]);

  const clearOutputs = useCallback(async () => {
    await clearStorage.clearOutputs();
    setOutputs([]);
    notifications.show({
      message: 'All generated outputs cleared.',
      color: 'indigo',
    });
  }, [clearStorage]);

  const clearAll = useCallback(async () => {
    await clearStorage.clearAll();
    setInputs([]);
    setOutputs([]);
    notifications.show({
      message: 'Queue and outputs cleared.',
      color: 'indigo',
    });
  }, [clearStorage]);

  const upsertInputInState = useCallback((record: InputRecord) => {
    setInputs((prev) => prev.map((item) => (item.id === record.id ? record : item)));
  }, []);

  const appendOutputsInState = useCallback((records: OutputRecord[]) => {
    if (records.length === 0) return;
    setOutputs((prev) => [...prev, ...records]);
  }, []);

  const totalCost = useMemo(
    () => outputs.reduce((sum, out) => sum + (typeof out.cost === 'number' ? out.cost : 0), 0),
    [outputs],
  );

  const value = useMemo<QueueDataContextValue>(
    () => ({
      inputs,
      outputs,
      isHydrated,
      storageError,
      totalCost,
      getObjectUrl,
      addFiles,
      removeInput,
      removeOutput,
      resetAllToPending,
      clearOutputs,
      clearAll,
      upsertInputInState,
      appendOutputsInState,
    }),
    [
      inputs,
      outputs,
      isHydrated,
      storageError,
      totalCost,
      getObjectUrl,
      addFiles,
      removeInput,
      removeOutput,
      resetAllToPending,
      clearOutputs,
      clearAll,
      upsertInputInState,
      appendOutputsInState,
    ],
  );

  return <QueueDataContext.Provider value={value}>{children}</QueueDataContext.Provider>;
}

export function useQueueData(): QueueDataContextValue {
  const ctx = useContext(QueueDataContext);
  if (!ctx) {
    throw new Error('useQueueData must be used inside a QueueDataProvider');
  }
  return ctx;
}
