import { describe, expect, it, vi } from 'vitest';
import type { InferenceRequest } from '../../../domain/models';
import { RunwareAsyncClient } from '../runwareAsyncClient';
import { RunwareHttpTransport } from '../runwareHttpTransport';
import {
  extractRunwareError,
  parseAsyncPollResponse,
  parseSyncInferenceResponse,
} from '../runwareResponseParser';
import { RunwareSyncClient } from '../runwareSyncClient';
import { buildGetResponseTask, buildImageInferenceTask } from '../runwareTaskBuilder';

function makeRequest(overrides: Partial<InferenceRequest> = {}): InferenceRequest {
  return {
    apiKey: 'rw_test_key',
    model: 'runware:400@6',
    positivePrompt: 'convert to retro pixel art',
    negativePrompt: '',
    width: 1024,
    height: 1024,
    numberResults: 2,
    outputType: 'dataURI',
    outputFormat: 'JPG',
    outputQuality: 95,
    steps: '4',
    CFGScale: '3.5',
    acceleration: 'high',
    inputMode: 'referenceImages',
    strength: '0.75',
    inputDataUri: 'data:image/png;base64,AAAA',
    deliveryMethod: 'sync',
    asyncPollIntervalMs: 1500,
    asyncTimeoutMs: 180000,
    ...overrides,
  };
}

describe('Runware task builder & response parser', () => {
  it('builds referenceImages payload and omits blank optional parameters', () => {
    const task = buildImageInferenceTask(
      makeRequest({
        negativePrompt: '   ',
        steps: '',
        CFGScale: '',
        acceleration: 'omit',
      }),
      'uuid-1',
      'sync',
    );

    expect(task.taskType).toBe('imageInference');
    expect(task.taskUUID).toBe('uuid-1');
    expect(task.deliveryMethod).toBe('sync');
    expect(task.inputs).toEqual({ referenceImages: ['data:image/png;base64,AAAA'] });
    expect(task.seedImage).toBeUndefined();
    expect(task.negativePrompt).toBeUndefined();
    expect(task.steps).toBeUndefined();
    expect(task.CFGScale).toBeUndefined();
    expect(task.acceleration).toBeUndefined();
  });

  it('builds seedImage + strength payload when inputMode is seedImage', () => {
    const task = buildImageInferenceTask(
      makeRequest({
        inputMode: 'seedImage',
        strength: '0.65',
        negativePrompt: 'blurry',
      }),
      'uuid-2',
      'async',
    );

    expect(task.deliveryMethod).toBe('async');
    expect(task.seedImage).toBe('data:image/png;base64,AAAA');
    expect(task.strength).toBe(0.65);
    expect(task.negativePrompt).toBe('blurry');
    expect(task.inputs).toBeUndefined();
  });

  it('builds getResponse polling task', () => {
    expect(buildGetResponseTask('uuid-99')).toEqual({
      taskType: 'getResponse',
      taskUUID: 'uuid-99',
    });
  });

  it('extracts API errors and parses sync + async poll outcomes', () => {
    expect(
      extractRunwareError({ errors: [{ message: 'Invalid API key' }] }, 401, false),
    ).toBe('Invalid API key');

    const syncOutputs = parseSyncInferenceResponse({
      data: [
        {
          taskType: 'imageInference',
          imageDataURI: 'data:image/jpeg;base64,BBB',
          seed: 777,
          cost: 0.003,
        },
      ],
    });
    expect(syncOutputs).toHaveLength(1);
    expect(syncOutputs[0].seed).toBe(777);
    expect(syncOutputs[0].cost).toBe(0.003);

    expect(parseAsyncPollResponse({ data: [] }, 'uuid-a')).toEqual({ status: 'pending' });
    expect(
      parseAsyncPollResponse({ data: [{ taskUUID: 'uuid-a', status: 'processing' }] }, 'uuid-a'),
    ).toEqual({ status: 'pending' });
    expect(
      parseAsyncPollResponse(
        {
          data: [
            {
              taskUUID: 'uuid-a',
              status: 'success',
              imageDataURI: 'data:image/png;base64,CCC',
              cost: 0.01,
            },
          ],
        },
        'uuid-a',
      ),
    ).toEqual({
      status: 'completed',
      outputs: [
        {
          imageDataURI: 'data:image/png;base64,CCC',
          imageBase64Data: undefined,
          imageURL: undefined,
          seed: null,
          cost: 0.01,
        },
      ],
    });
    expect(
      parseAsyncPollResponse(
        { errors: [{ taskUUID: 'uuid-a', message: 'Task failed on GPU' }] },
        'uuid-a',
      ),
    ).toEqual({ status: 'failed', error: 'Task failed on GPU' });
  });
});

describe('RunwareSyncClient & RunwareAsyncClient', () => {
  it('sends sync request with Bearer auth and parses response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              taskType: 'imageInference',
              imageDataURI: 'data:image/jpeg;base64,QQ==',
              cost: 0.002,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const transport = new RunwareHttpTransport('https://api.runware.ai/v1', fetchMock);
    const client = new RunwareSyncClient(transport, { next: () => 'sync-uuid-1' });
    const result = await client.generateSync(makeRequest());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer rw_test_key');
    expect(result).toHaveLength(1);
    expect(result[0].imageDataURI).toBe('data:image/jpeg;base64,QQ==');
  });

  it('submits async job and polls getResponse', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ taskUUID: 'async-uuid-1' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                taskUUID: 'async-uuid-1',
                status: 'success',
                imageURL: 'https://cdn.runware.ai/out.jpg',
                cost: 0.004,
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const transport = new RunwareHttpTransport('https://api.runware.ai/v1', fetchMock);
    const client = new RunwareAsyncClient(transport, { next: () => 'async-uuid-1' });

    const job = await client.submitAsync(makeRequest({ deliveryMethod: 'async' }));
    expect(job.taskUUID).toBe('async-uuid-1');
    expect(job.immediateOutputs).toBeUndefined();

    const poll = await client.pollResult(job.taskUUID, 'rw_test_key');
    expect(poll.status).toBe('completed');
    if (poll.status === 'completed') {
      expect(poll.outputs[0].imageURL).toBe('https://cdn.runware.ai/out.jpg');
    }
  });
});
