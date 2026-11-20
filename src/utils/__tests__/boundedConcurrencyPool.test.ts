import { describe, expect, it } from 'vitest';
import { BoundedConcurrencyPool } from '../boundedConcurrencyPool';

describe('BoundedConcurrencyPool', () => {
  it('never exceeds the configured concurrency limit and runs all items', async () => {
    const pool = new BoundedConcurrencyPool();
    const items = [1, 2, 3, 4, 5, 6, 7];

    let active = 0;
    let peakActive = 0;
    const processed: number[] = [];

    await pool.runPool(
      items,
      async (item) => {
        active += 1;
        peakActive = Math.max(peakActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        processed.push(item);
        active -= 1;
      },
      { concurrency: 3 },
    );

    expect(peakActive).toBeLessThanOrEqual(3);
    expect(peakActive).toBe(3);
    expect(processed.sort((a, b) => a - b)).toEqual(items);
  });

  it('runs sequentially when concurrency is 1', async () => {
    const pool = new BoundedConcurrencyPool();
    const order: string[] = [];

    await pool.runPool(
      ['a', 'b', 'c'],
      async (item) => {
        order.push(`start:${item}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(`end:${item}`);
      },
      { concurrency: 1 },
    );

    expect(order).toEqual(['start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c']);
  });

  it('stops pulling new items once AbortSignal fires', async () => {
    const pool = new BoundedConcurrencyPool();
    const controller = new AbortController();
    const started: number[] = [];

    await pool.runPool(
      [1, 2, 3, 4, 5],
      async (item) => {
        started.push(item);
        if (item === 2) {
          controller.abort();
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
      },
      { concurrency: 2, signal: controller.signal },
    );

    expect(started).toEqual([1, 2]);
  });
});
