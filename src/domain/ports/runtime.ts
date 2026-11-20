export interface PoolRunOptions {
  concurrency: number;
  signal?: AbortSignal;
}

export interface ITaskScheduler {
  runPool<T>(
    items: readonly T[],
    worker: (item: T, signal: AbortSignal) => Promise<void>,
    options: PoolRunOptions,
  ): Promise<void>;
}

export interface IClock {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export interface IIdGenerator {
  next(): string;
}
