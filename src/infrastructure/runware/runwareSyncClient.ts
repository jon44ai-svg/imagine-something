import type { InferenceOutputPayload, InferenceRequest } from '../../domain/models';
import type { ISyncInferenceClient } from '../../domain/ports/inference';
import type { IIdGenerator } from '../../domain/ports/runtime';
import type { RunwareHttpTransport } from './runwareHttpTransport';
import { extractRunwareError, parseSyncInferenceResponse } from './runwareResponseParser';
import { buildImageInferenceTask } from './runwareTaskBuilder';

export class RunwareSyncClient implements ISyncInferenceClient {
  private readonly transport: RunwareHttpTransport;
  private readonly idGenerator: IIdGenerator;

  constructor(transport: RunwareHttpTransport, idGenerator: IIdGenerator) {
    this.transport = transport;
    this.idGenerator = idGenerator;
  }

  async generateSync(
    request: InferenceRequest,
    signal?: AbortSignal,
  ): Promise<InferenceOutputPayload[]> {
    const taskUUID = this.idGenerator.next();
    const task = buildImageInferenceTask(request, taskUUID, 'sync');
    const result = await this.transport.postTasks([task], request.apiKey, signal);

    const apiError = extractRunwareError(result.payload, result.status, result.ok);
    if (apiError) {
      throw new Error(apiError);
    }

    return parseSyncInferenceResponse(result.payload);
  }
}
