import type { ITaskScheduler, PoolRunOptions } from '../domain/ports/runtime';
import { clampConcurrency } from './dimensions';

export class BoundedConcurrencyPool implements ITaskScheduler {
  async runPool<T>(
    items: readonly T[],
    worker: (item: T, signal: AbortSignal) => Promise<void>,
    options: PoolRunOptions,
  ): Promise<void> {
    if (items.length === 0) return;

    const fallbackController = new AbortController();
    const effectiveSignal = options.signal ?? fallbackController.signal;
    const workerCount = Math.min(items.length, clampConcurrency(options.concurrency));

    let nextIndex = 0;

    const runWorker = async (): Promise<void> => {
      while (!effectiveSignal.aborted) {
        const currentIndex = nextIndex;
        if (currentIndex >= items.length) break;
        nextIndex += 1;

        const item = items[currentIndex];
        await worker(item, effectiveSignal);
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < workerCount; i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);
  }
}
