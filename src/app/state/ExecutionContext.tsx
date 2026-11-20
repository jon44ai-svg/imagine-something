import { notifications } from '@mantine/notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { BatchRunController } from '../../application/useCases/runBatchPipelineUseCase';
import type { BatchProgressSnapshot } from '../../domain/models';
import { useServices } from '../ServicesContext';
import { useQueueData } from './QueueDataContext';
import { useSettings } from './SettingsContext';

export interface ExecutionContextValue {
  isRunning: boolean;
  progress: BatchProgressSnapshot | null;
  progressVisible: boolean;
  statusMessage: string;
  runPipeline: (targetIds?: string[]) => Promise<void>;
  retryFailed: () => Promise<void>;
  stopAll: () => void;
  cancelItem: (inputId: string) => void;
}

const ExecutionContext = createContext<ExecutionContextValue | null>(null);

export function ExecutionProvider({ children }: { children: ReactNode }) {
  const { validatePreflight, runBatchPipeline } = useServices();
  const { settings, apiKey, requestFocusField } = useSettings();
  const { inputs, upsertInputInState, appendOutputsInState } = useQueueData();
  const navigate = useNavigate();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgressSnapshot | null>(null);
  const [progressVisible, setProgressVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const controllerRef = useRef<BatchRunController | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      controllerRef.current?.stopAll();
    };
  }, []);

  const runPipeline = useCallback(
    async (targetIds?: string[]) => {
      if (isRunning) return;

      const preflight = validatePreflight.execute(apiKey, settings);
      if (!preflight.ok) {
        notifications.show({
          message: preflight.message,
          color: 'red',
        });
        requestFocusField(preflight.field);
        navigate('/settings');
        return;
      }

      const queue = targetIds
        ? inputs.filter((item) => targetIds.includes(item.id))
        : inputs.filter((item) => item.status === 'pending');

      if (queue.length === 0) {
        notifications.show({
          message: 'No pending images to process. Add images or click Reset All to Pending.',
          color: 'indigo',
        });
        return;
      }

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      const controller = new BatchRunController();
      controllerRef.current = controller;
      setIsRunning(true);
      setProgressVisible(true);
      setStatusMessage('Starting pipeline...');

      const summary = await runBatchPipeline.execute(queue, settings, apiKey, controller, {
        onInputUpdated: upsertInputInState,
        onOutputsCreated: appendOutputsInState,
        onProgress: (snapshot) => {
          setProgress(snapshot);
          if (snapshot.stopping) {
            setStatusMessage('Stopping active tasks...');
          } else if (snapshot.activeNames.length === 1) {
            setStatusMessage(
              `Processing ${snapshot.completed + 1} of ${snapshot.total} - ${snapshot.activeNames[0]}`,
            );
          } else if (snapshot.activeNames.length > 1) {
            setStatusMessage(
              `Running ${snapshot.activeNames.length} in parallel (${snapshot.completed} / ${snapshot.total} done)`,
            );
          }
        },
      });

      controllerRef.current = null;
      setIsRunning(false);

      if (summary.stopped) {
        setStatusMessage(`Stopped after ${summary.completed} of ${summary.total} image(s).`);
        notifications.show({
          message: 'Pipeline stopped.',
          color: 'indigo',
        });
      } else {
        const failPart = summary.failed > 0 ? `, ${summary.failed} failed` : '';
        const cancelPart = summary.cancelled > 0 ? `, ${summary.cancelled} cancelled` : '';
        setStatusMessage(`Completed: ${summary.succeeded} succeeded${failPart}${cancelPart}.`);
        notifications.show({
          message:
            summary.failed === 0
              ? `Pipeline finished! Processed ${summary.succeeded} image(s).`
              : `Pipeline finished: ${summary.succeeded} succeeded, ${summary.failed} failed.`,
          color: summary.failed === 0 ? 'teal' : 'red',
        });
      }

      hideTimerRef.current = setTimeout(() => {
        setProgressVisible(false);
      }, 4000);
    },
    [
      isRunning,
      validatePreflight,
      apiKey,
      settings,
      requestFocusField,
      navigate,
      inputs,
      runBatchPipeline,
      upsertInputInState,
      appendOutputsInState,
    ],
  );

  const retryFailed = useCallback(async () => {
    const failedIds = inputs.filter((item) => item.status === 'error').map((item) => item.id);
    await runPipeline(failedIds);
  }, [inputs, runPipeline]);

  const stopAll = useCallback(() => {
    if (!controllerRef.current) return;
    setStatusMessage('Stopping...');
    controllerRef.current.stopAll();
  }, []);

  const cancelItem = useCallback((inputId: string) => {
    controllerRef.current?.cancelItem(inputId);
  }, []);

  const value = useMemo<ExecutionContextValue>(
    () => ({
      isRunning,
      progress,
      progressVisible,
      statusMessage,
      runPipeline,
      retryFailed,
      stopAll,
      cancelItem,
    }),
    [isRunning, progress, progressVisible, statusMessage, runPipeline, retryFailed, stopAll, cancelItem],
  );

  return <ExecutionContext.Provider value={value}>{children}</ExecutionContext.Provider>;
}

export function useExecution(): ExecutionContextValue {
  const ctx = useContext(ExecutionContext);
  if (!ctx) {
    throw new Error('useExecution must be used inside an ExecutionProvider');
  }
  return ctx;
}
