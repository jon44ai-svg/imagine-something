import { describe, expect, it, vi } from 'vitest';
import type {
  GenerationSettings,
  InputRecord,
  OutputRecord,
} from '../../../domain/models';
import type { IObjectUrlRegistry } from '../../../domain/ports/export';
import type { IGenerationStrategyResolver } from '../../../domain/ports/inference';
import type {
  IImageDimensionReader,
  IInputImageEncoder,
  IOutputImageHydrator,
} from '../../../domain/ports/media';
import type { IClock, IIdGenerator } from '../../../domain/ports/runtime';
import type {
  IInputReader,
  IInputWriter,
  IOutputReader,
  IOutputWriter,
} from '../../../domain/ports/storage';
import { DEFAULT_SETTINGS } from '../../../domain/presets';
import { BoundedConcurrencyPool } from '../../../utils/boundedConcurrencyPool';
import { createAbortError } from '../../../utils/clock';
import { IngestFilesUseCase } from '../ingestFilesUseCase';
import { ProcessSingleInputUseCase } from '../processSingleInputUseCase';
import { RecoverStuckItemsUseCase } from '../recoverStuckItemsUseCase';
import { RemoveInputUseCase } from '../removeInputUseCase';
import { BatchRunController, RunBatchPipelineUseCase } from '../runBatchPipelineUseCase';
import { ValidateRunPreflightUseCase } from '../validateRunPreflightUseCase';

function createInMemoryStores() {
  const inputs = new Map<string, InputRecord>();
  const outputs = new Map<string, OutputRecord>();

  const inputStore: IInputReader & IInputWriter = {
    list: async () => Array.from(inputs.values()).sort((a, b) => a.order - b.order),
    getById: async (id) => inputs.get(id),
    save: async (record) => {
      inputs.set(record.id, { ...record });
    },
    remove: async (id) => {
      inputs.delete(id);
    },
    clear: async () => {
      inputs.clear();
    },
  };

  const outputStore: IOutputReader & IOutputWriter = {
    list: async () => Array.from(outputs.values()).sort((a, b) => a.createdAt - b.createdAt),
    listByInputId: async (inputId) =>
      Array.from(outputs.values()).filter((o) => o.inputId === inputId),
    save: async (record) => {
      outputs.set(record.id, { ...record });
    },
    remove: async (id) => {
      outputs.delete(id);
    },
    removeByInputId: async (inputId) => {
      for (const [id, out] of outputs.entries()) {
        if (out.inputId === inputId) outputs.delete(id);
      }
    },
    clear: async () => {
      outputs.clear();
    },
  };

  return { inputs, outputs, inputStore, outputStore };
}

function makeInputRecord(id: string, order: number, status: InputRecord['status'] = 'pending'): InputRecord {
  return {
    id,
    name: `${id}.png`,
    type: 'image/png',
    width: 512,
    height: 512,
    blob: new Blob(['img'], { type: 'image/png' }),
    status,
    error: '',
    order,
    createdAt: 1000 + order,
  };
}

describe('Queue & maintenance use-cases', () => {
  it('IngestFilesUseCase filters non-images and enforces max capacity', async () => {
    const { inputStore } = createInMemoryStores();
    const dimReader: IImageDimensionReader = {
      readDimensions: async () => ({ width: 800, height: 600 }),
    };
    let seq = 0;
    const idGen: IIdGenerator = { next: () => `id-${++seq}` };
    const clock: IClock = { now: () => 5000, sleep: async () => {} };

    const useCase = new IngestFilesUseCase(inputStore, inputStore, dimReader, idGen, clock, 2);

    const files = [
      new File(['a'], 'one.png', { type: 'image/png' }),
      new File(['txt'], 'notes.txt', { type: 'text/plain' }),
      new File(['b'], 'two.jpg', { type: 'image/jpeg' }),
      new File(['c'], 'three.webp', { type: 'image/webp' }),
    ];

    const res = await useCase.execute(files);
    expect(res.added).toHaveLength(2);
    expect(res.skippedNonImage).toBe(1);
    expect(res.skippedLimit).toBe(1);
    expect(res.limitReached).toBe(false);
    expect((await inputStore.list()).map((i) => i.name)).toEqual(['one.png', 'two.jpg']);

    const resFull = await useCase.execute([new File(['d'], 'four.png', { type: 'image/png' })]);
    expect(resFull.limitReached).toBe(true);
  });

  it('RemoveInputUseCase cascades outputs and revokes object URLs', async () => {
    const { inputStore, outputStore } = createInMemoryStores();
    await inputStore.save(makeInputRecord('in-1', 1));
    await outputStore.save({
      id: 'out-1',
      inputId: 'in-1',
      inputName: 'in-1.png',
      blob: null,
      imageURL: '',
      format: 'JPG',
      width: 512,
      height: 512,
      prompt: 'p',
      model: 'm',
      seed: null,
      cost: null,
      createdAt: 1,
    });

    const released: string[] = [];
    const urlRegistry: IObjectUrlRegistry = {
      acquire: () => '',
      release: (id) => released.push(id),
      releaseAll: () => {},
    };

    const removeInput = new RemoveInputUseCase(inputStore, outputStore, outputStore, urlRegistry);
    const removedOutputs = await removeInput.execute('in-1');

    expect(removedOutputs).toEqual(['out-1']);
    expect(released).toEqual(['out-1', 'in-1']);
    expect(await inputStore.list()).toHaveLength(0);
    expect(await outputStore.list()).toHaveLength(0);
  });

  it('RecoverStuckItemsUseCase resets processing items back to pending', async () => {
    const { inputStore } = createInMemoryStores();
    await inputStore.save(makeInputRecord('in-1', 1, 'processing'));
    await inputStore.save(makeInputRecord('in-2', 2, 'done'));

    const recover = new RecoverStuckItemsUseCase(inputStore, inputStore);
    const items = await recover.execute();

    expect(items.find((i) => i.id === 'in-1')?.status).toBe('pending');
    expect(items.find((i) => i.id === 'in-2')?.status).toBe('done');
  });

  it('ValidateRunPreflightUseCase identifies missing apiKey, model, or prompt', () => {
    const validator = new ValidateRunPreflightUseCase();
    expect(validator.execute('', DEFAULT_SETTINGS)).toMatchObject({ ok: false, field: 'apiKey' });
    expect(validator.execute('key', { ...DEFAULT_SETTINGS, model: '' })).toMatchObject({
      ok: false,
      field: 'model',
    });
    expect(validator.execute('key', { ...DEFAULT_SETTINGS, positivePrompt: '   ' })).toMatchObject({
      ok: false,
      field: 'positivePrompt',
    });
    expect(
      validator.execute('key', { ...DEFAULT_SETTINGS, positivePrompt: 'retro style' }),
    ).toEqual({ ok: true });
  });

  it('ProcessSingleInputUseCase records elapsed generation durationMs from the clock', async () => {
    const { outputStore } = createInMemoryStores();
    let nowMs = 10_000;
    const clock: IClock = {
      now: () => nowMs,
      sleep: async () => {},
    };

    const encoder: IInputImageEncoder = {
      toInferenceDataUri: async () => 'data:image/png;base64,AA==',
    };
    const hydrator: IOutputImageHydrator = {
      hydrateBlob: async () => new Blob(['gen'], { type: 'image/jpeg' }),
    };
    const resolver: IGenerationStrategyResolver = {
      resolve: () => ({
        execute: async () => {
          nowMs += 4320;
          return [{ imageDataURI: 'data:image/jpeg;base64,AA==', seed: 42, cost: 0.002 }];
        },
      }),
    };

    const useCase = new ProcessSingleInputUseCase(
      encoder,
      resolver,
      hydrator,
      outputStore,
      { next: () => 'out-timed' },
      clock,
    );

    const saved = await useCase.execute(
      makeInputRecord('in-1', 1),
      { ...DEFAULT_SETTINGS, positivePrompt: 'studio portrait' },
      'rw_key',
    );

    expect(saved).toHaveLength(1);
    expect(saved[0].durationMs).toBe(4320);
  });
});

describe('RunBatchPipelineUseCase (parallelism, global stop & per-item cancel)', () => {
  function buildBatchHarness(
    executeFn: (inputId: string, signal?: AbortSignal) => Promise<void>,
  ) {
    const { inputStore, outputStore } = createInMemoryStores();
    let seq = 0;

    const encoder: IInputImageEncoder = {
      toInferenceDataUri: async (input) => `data:image/png;base64,${btoa(input.id)}`,
    };
    const hydrator: IOutputImageHydrator = {
      hydrateBlob: async () => new Blob(['gen'], { type: 'image/jpeg' }),
    };
    const resolver: IGenerationStrategyResolver = {
      resolve: () => ({
        execute: async (req, signal) => {
          const decodedId = atob(req.inputDataUri.split(',')[1]);
          await executeFn(decodedId, signal);
          return [{ imageDataURI: 'data:image/jpeg;base64,AA==', cost: 0.001 }];
        },
      }),
    };

    const processSingle = new ProcessSingleInputUseCase(
      encoder,
      resolver,
      hydrator,
      outputStore,
      { next: () => `out-${++seq}` },
      { now: () => 2000, sleep: async () => {} },
    );

    const runBatch = new RunBatchPipelineUseCase(
      inputStore,
      new BoundedConcurrencyPool(),
      processSingle,
    );

    return { inputStore, outputStore, runBatch };
  }

  it('executes inputs in parallel up to configured concurrency and records outputs', async () => {
    let active = 0;
    let peak = 0;

    const { inputStore, outputStore, runBatch } = buildBatchHarness(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 15));
      active -= 1;
    });

    const queue = [
      makeInputRecord('i1', 1),
      makeInputRecord('i2', 2),
      makeInputRecord('i3', 3),
      makeInputRecord('i4', 4),
    ];
    for (const item of queue) await inputStore.save(item);

    const settings: GenerationSettings = {
      ...DEFAULT_SETTINGS,
      positivePrompt: 'make awesome',
      concurrency: 2,
    };

    const controller = new BatchRunController();
    const summary = await runBatch.execute(queue, settings, 'key', controller);

    expect(peak).toBe(2);
    expect(summary).toEqual({
      total: 4,
      completed: 4,
      succeeded: 4,
      failed: 0,
      cancelled: 0,
      stopped: false,
    });
    expect(await outputStore.list()).toHaveLength(4);
    expect((await inputStore.list()).every((i) => i.status === 'done')).toBe(true);
  });

  it('allows cancelling a single active item without interrupting sibling parallel items', async () => {
    const controller = new BatchRunController();
    const { inputStore, runBatch } = buildBatchHarness(async (id, signal) => {
      if (id === 'slow') {
        await new Promise<void>((_, reject) => {
          signal?.addEventListener('abort', () => reject(createAbortError()), { once: true });
          setTimeout(() => controller.cancelItem('slow'), 10);
        });
      } else {
        await new Promise((r) => setTimeout(r, 25));
      }
    });

    const queue = [makeInputRecord('slow', 1), makeInputRecord('fast', 2)];
    for (const item of queue) await inputStore.save(item);

    const summary = await runBatch.execute(
      queue,
      { ...DEFAULT_SETTINGS, positivePrompt: 'test', concurrency: 2 },
      'key',
      controller,
    );

    expect(summary.succeeded).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(summary.stopped).toBe(false);
    expect((await inputStore.getById('slow'))?.status).toBe('pending');
    expect((await inputStore.getById('fast'))?.status).toBe('done');
  });

  it('rolls aborted items back to pending on global stopAll and isolates item errors', async () => {
    const controller = new BatchRunController();
    const onProgress = vi.fn();

    const { inputStore, runBatch } = buildBatchHarness(async (id, signal) => {
      if (id === 'bad') {
        throw new Error('Model rejected image');
      }
      await new Promise<void>((_, reject) => {
        signal?.addEventListener('abort', () => reject(createAbortError()), { once: true });
        setTimeout(() => controller.stopAll(), 15);
      });
    });

    const queue = [
      makeInputRecord('bad', 1),
      makeInputRecord('aborted', 2),
      makeInputRecord('unstarted', 3),
    ];
    for (const item of queue) await inputStore.save(item);

    const summary = await runBatch.execute(
      queue,
      { ...DEFAULT_SETTINGS, positivePrompt: 'test', concurrency: 2 },
      'key',
      controller,
      { onProgress },
    );

    expect(summary.stopped).toBe(true);
    expect(summary.failed).toBe(1);
    expect(onProgress).toHaveBeenCalled();
    expect((await inputStore.getById('bad'))?.status).toBe('error');
    expect((await inputStore.getById('bad'))?.error).toBe('Model rejected image');
    expect((await inputStore.getById('aborted'))?.status).toBe('pending');
    expect((await inputStore.getById('unstarted'))?.status).toBe('pending');
  });
});
