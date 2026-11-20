import type {
  BatchExecutionSummary,
  BatchProgressSnapshot,
  GenerationSettings,
  InputRecord,
  OutputRecord,
} from '../../domain/models';
import type { ITaskScheduler } from '../../domain/ports/runtime';
import type { IInputWriter } from '../../domain/ports/storage';
import { isAbortError } from '../../utils/clock';
import { clampConcurrency } from '../../utils/dimensions';
import type { ProcessSingleInputUseCase } from './processSingleInputUseCase';

export interface BatchRunCallbacks {
  onInputUpdated?: (input: InputRecord) => void;
  onOutputsCreated?: (outputs: OutputRecord[]) => void;
  onProgress?: (snapshot: BatchProgressSnapshot) => void;
}

export class BatchRunController {
  private readonly masterController = new AbortController();
  private readonly itemControllers = new Map<string, AbortController>();
  private stopped = false;

  get signal(): AbortSignal {
    return this.masterController.signal;
  }

  get isStopped(): boolean {
    return this.stopped;
  }

  registerItem(inputId: string): AbortController {
    const controller = new AbortController();
    if (this.masterController.signal.aborted) {
      controller.abort();
    }
    this.itemControllers.set(inputId, controller);
    return controller;
  }

  unregisterItem(inputId: string): void {
    this.itemControllers.delete(inputId);
  }

  cancelItem(inputId: string): boolean {
    const controller = this.itemControllers.get(inputId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  stopAll(): void {
    this.stopped = true;
    this.masterController.abort();
    for (const controller of this.itemControllers.values()) {
      controller.abort();
    }
  }
}

export class RunBatchPipelineUseCase {
  private readonly inputWriter: IInputWriter;
  private readonly scheduler: ITaskScheduler;
  private readonly processSingleInput: ProcessSingleInputUseCase;

  constructor(
    inputWriter: IInputWriter,
    scheduler: ITaskScheduler,
    processSingleInput: ProcessSingleInputUseCase,
  ) {
    this.inputWriter = inputWriter;
    this.scheduler = scheduler;
    this.processSingleInput = processSingleInput;
  }

  async execute(
    queue: readonly InputRecord[],
    settings: GenerationSettings,
    apiKey: string,
    controller: BatchRunController,
    callbacks: BatchRunCallbacks = {},
  ): Promise<BatchExecutionSummary> {
    const total = queue.length;
    if (total === 0) {
      return {
        total: 0,
        completed: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
        stopped: false,
      };
    }

    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let cancelled = 0;
    const activeMap = new Map<string, string>();

    const emitProgress = () => {
      const percentage = Math.round((completed / total) * 100);
      callbacks.onProgress?.({
        total,
        completed,
        succeeded,
        failed,
        cancelled,
        activeIds: Array.from(activeMap.keys()),
        activeNames: Array.from(activeMap.values()),
        percentage,
        stopping: controller.isStopped,
      });
    };

    emitProgress();

    await this.scheduler.runPool(
      queue,
      async (item) => {
        if (controller.signal.aborted) return;

        const itemController = controller.registerItem(item.id);
        activeMap.set(item.id, item.name);

        const processingRecord: InputRecord = {
          ...item,
          status: 'processing',
          error: '',
        };
        await this.inputWriter.save(processingRecord);
        callbacks.onInputUpdated?.(processingRecord);
        emitProgress();

        try {
          const outputs = await this.processSingleInput.execute(
            processingRecord,
            settings,
            apiKey,
            itemController.signal,
          );
          callbacks.onOutputsCreated?.(outputs);

          const doneRecord: InputRecord = {
            ...processingRecord,
            status: 'done',
            error: '',
          };
          await this.inputWriter.save(doneRecord);
          callbacks.onInputUpdated?.(doneRecord);
          succeeded += 1;
          completed += 1;
        } catch (err) {
          if (isAbortError(err) || itemController.signal.aborted || controller.isStopped) {
            const revertedRecord: InputRecord = {
              ...processingRecord,
              status: 'pending',
              error: '',
            };
            await this.inputWriter.save(revertedRecord);
            callbacks.onInputUpdated?.(revertedRecord);
            cancelled += 1;
          } else {
            const errorMessage = err instanceof Error ? err.message : 'Unknown API error';
            const errorRecord: InputRecord = {
              ...processingRecord,
              status: 'error',
              error: errorMessage,
            };
            await this.inputWriter.save(errorRecord);
            callbacks.onInputUpdated?.(errorRecord);
            failed += 1;
            completed += 1;
          }
        } finally {
          activeMap.delete(item.id);
          controller.unregisterItem(item.id);
          emitProgress();
        }
      },
      {
        concurrency: clampConcurrency(settings.concurrency),
        signal: controller.signal,
      },
    );

    return {
      total,
      completed,
      succeeded,
      failed,
      cancelled,
      stopped: controller.isStopped,
    };
  }
}
