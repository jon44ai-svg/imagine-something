import { describe, expect, it, vi } from 'vitest';
import type { InferenceRequest, PollOutcome } from '../../../domain/models';
import type { IAsyncJobPoller, IAsyncJobSubmitter } from '../../../domain/ports/inference';
import type { IClock } from '../../../domain/ports/runtime';
import { createAbortError } from '../../../utils/clock';
import { AsyncPollingGenerationStrategy } from '../asyncPollingGenerationStrategy';

function makeRequest(overrides: Partial<InferenceRequest> = {}): InferenceRequest {
  return {
    apiKey: 'rw_key',
    model: 'runware:400@6',
    positivePrompt: 'stylize',
    negativePrompt: '',
    width: 1024,
    height: 1024,
    numberResults: 1,
    outputType: 'dataURI',
    outputFormat: 'JPG',
    outputQuality: 95,
    steps: '4',
    CFGScale: '3.5',
    acceleration: 'high',
    inputMode: 'referenceImages',
    strength: '0.75',
    inputDataUri: 'data:image/png;base64,AA==',
    deliveryMethod: 'async',
    asyncPollIntervalMs: 1000,
    asyncTimeoutMs: 10000,
    ...overrides,
  };
}

function createFakeClock() {
  let current = 0;
  const sleeps: number[] = [];

  const clock: IClock = {
    now: () => current,
    sleep: async (ms: number, signal?: AbortSignal) => {
      if (signal?.aborted) throw createAbortError();
      sleeps.push(ms);
      current += ms;
    },
  };

  return { clock, sleeps };
}

describe('AsyncPollingGenerationStrategy', () => {
  it('returns immediately if submitAsync already includes immediateOutputs', async () => {
    const submitter: IAsyncJobSubmitter = {
      submitAsync: vi.fn().mockResolvedValue({
        taskUUID: 'job-1',
        immediateOutputs: [{ imageDataURI: 'data:image/jpeg;base64,AA==' }],
      }),
    };
    const poller: IAsyncJobPoller = {
      pollResult: vi.fn(),
    };
    const { clock } = createFakeClock();

    const strategy = new AsyncPollingGenerationStrategy(submitter, poller, clock);
    const results = await strategy.execute(makeRequest());

    expect(results).toHaveLength(1);
    expect(poller.pollResult).not.toHaveBeenCalled();
  });

  it('polls until completed across multiple pending responses', async () => {
    const submitter: IAsyncJobSubmitter = {
      submitAsync: vi.fn().mockResolvedValue({ taskUUID: 'job-2' }),
    };
    const poller: IAsyncJobPoller = {
      pollResult: vi
        .fn<IAsyncJobPoller['pollResult']>()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({
          status: 'completed',
          outputs: [{ imageDataURI: 'data:image/jpeg;base64,ZZ==' }],
        }),
    };
    const { clock, sleeps } = createFakeClock();

    const strategy = new AsyncPollingGenerationStrategy(submitter, poller, clock);
    const results = await strategy.execute(makeRequest());

    expect(poller.pollResult).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1000, 1000, 1000]);
    expect(results[0].imageDataURI).toBe('data:image/jpeg;base64,ZZ==');
  });

  it('throws when polling returns failed status', async () => {
    const submitter: IAsyncJobSubmitter = {
      submitAsync: vi.fn().mockResolvedValue({ taskUUID: 'job-3' }),
    };
    const poller: IAsyncJobPoller = {
      pollResult: vi.fn().mockResolvedValue({ status: 'failed', error: 'Out of credits' }),
    };
    const { clock } = createFakeClock();

    const strategy = new AsyncPollingGenerationStrategy(submitter, poller, clock);
    await expect(strategy.execute(makeRequest())).rejects.toThrow('Out of credits');
  });

  it('times out deterministically when deadline expires', async () => {
    const submitter: IAsyncJobSubmitter = {
      submitAsync: vi.fn().mockResolvedValue({ taskUUID: 'job-4' }),
    };
    const poller: IAsyncJobPoller = {
      pollResult: vi.fn().mockResolvedValue({ status: 'pending' } satisfies PollOutcome),
    };
    const { clock } = createFakeClock();

    const strategy = new AsyncPollingGenerationStrategy(submitter, poller, clock);
    await expect(
      strategy.execute(makeRequest({ asyncPollIntervalMs: 2000, asyncTimeoutMs: 6000 })),
    ).rejects.toThrow(/timed out/i);
  });

  it('aborts cleanly if signal is aborted during polling', async () => {
    const controller = new AbortController();
    const submitter: IAsyncJobSubmitter = {
      submitAsync: vi.fn().mockResolvedValue({ taskUUID: 'job-5' }),
    };
    const poller: IAsyncJobPoller = {
      pollResult: vi.fn().mockImplementation(async () => {
        controller.abort();
        return { status: 'pending' } satisfies PollOutcome;
      }),
    };
    const { clock } = createFakeClock();

    const strategy = new AsyncPollingGenerationStrategy(submitter, poller, clock);
    await expect(strategy.execute(makeRequest(), controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
