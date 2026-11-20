import type { IClock } from '../domain/ports/runtime';

export function createAbortError(message = 'Operation aborted'): DOMException {
  return new DOMException(message, 'AbortError');
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  if (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: unknown }).name === 'AbortError'
  ) {
    return true;
  }
  return false;
}

export class SystemClock implements IClock {
  now(): number {
    return Date.now();
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    return new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(createAbortError());
      };

      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, Math.max(0, ms));

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
