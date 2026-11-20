import type { InferenceRequest, PollOutcome, SubmittedJob } from '../../domain/models';
import type { IAsyncJobPoller, IAsyncJobSubmitter } from '../../domain/ports/inference';
import type { IModelLibraryReader, IModelLibraryWriter } from '../../domain/ports/modelLibrary';
import type { IIdGenerator } from '../../domain/ports/runtime';
import { submitImageInferenceAdaptively } from './runwareAdaptiveSubmit';
import type { RunwareHttpTransport } from './runwareHttpTransport';
import { extractRunwareError, parseAsyncPollResponse, parseAsyncSubmitResponse } from './runwareResponseParser';
import { buildGetResponseTask } from './runwareTaskBuilder';

export class RunwareAsyncClient implements IAsyncJobSubmitter, IAsyncJobPoller {
  private readonly transport: RunwareHttpTransport;
  private readonly idGenerator: IIdGenerator;
  private readonly modelLibrary: (IModelLibraryReader & IModelLibraryWriter) | undefined;

  constructor(
    transport: RunwareHttpTransport,
    idGenerator: IIdGenerator,
    modelLibrary?: IModelLibraryReader & IModelLibraryWriter,
  ) {
    this.transport = transport;
    this.idGenerator = idGenerator;
    this.modelLibrary = modelLibrary;
  }

  async submitAsync(request: InferenceRequest, signal?: AbortSignal): Promise<SubmittedJob> {
    const result = await submitImageInferenceAdaptively(
      this.transport,
      this.idGenerator,
      request,
      'async',
      this.modelLibrary,
      signal,
    );
    const immediateOutputs = parseAsyncSubmitResponse(result.payload, result.taskUUID);
    const hydratedImmediate =
      immediateOutputs && result.resolvedWidth && result.resolvedHeight
        ? immediateOutputs.map((o) => ({
            ...o,
            width: o.width ?? result.resolvedWidth,
            height: o.height ?? result.resolvedHeight,
          }))
        : immediateOutputs;
    return {
      taskUUID: result.taskUUID,
      immediateOutputs: hydratedImmediate,
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
