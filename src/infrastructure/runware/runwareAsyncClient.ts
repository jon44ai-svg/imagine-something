import type { InferenceRequest, PollOutcome, SubmittedJob } from '../../domain/models';
import type { IAsyncJobPoller, IAsyncJobSubmitter } from '../../domain/ports/inference';
import type { IIdGenerator } from '../../domain/ports/runtime';
import type { RunwareHttpTransport } from './runwareHttpTransport';
import {
  extractRunwareError,
  parseAsyncPollResponse,
  parseAsyncSubmitResponse,
} from './runwareResponseParser';
import { buildGetResponseTask, buildImageInferenceTask } from './runwareTaskBuilder';

export class RunwareAsyncClient implements IAsyncJobSubmitter, IAsyncJobPoller {
  private readonly transport: RunwareHttpTransport;
  private readonly idGenerator: IIdGenerator;

  constructor(transport: RunwareHttpTransport, idGenerator: IIdGenerator) {
    this.transport = transport;
    this.idGenerator = idGenerator;
  }

  async submitAsync(request: InferenceRequest, signal?: AbortSignal): Promise<SubmittedJob> {
    const taskUUID = this.idGenerator.next();
    const task = buildImageInferenceTask(request, taskUUID, 'async');
    const result = await this.transport.postTasks([task], request.apiKey, signal);

    const apiError = extractRunwareError(result.payload, result.status, result.ok);
    if (apiError) {
      throw new Error(apiError);
    }

    const immediateOutputs = parseAsyncSubmitResponse(result.payload, taskUUID);
    return {
      taskUUID,
      immediateOutputs,
    };
  }

  async pollResult(
    taskUUID: string,
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<PollOutcome> {
    const task = buildGetResponseTask(taskUUID);
    const result = await this.transport.postTasks([task], apiKey, signal);

    if (!result.ok) {
      const apiError = extractRunwareError(result.payload, result.status, result.ok);
      return { status: 'failed', error: apiError || `HTTP ${result.status} error` };
    }

    return parseAsyncPollResponse(result.payload, taskUUID);
  }
}
