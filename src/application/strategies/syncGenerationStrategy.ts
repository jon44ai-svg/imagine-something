import type { InferenceOutputPayload, InferenceRequest } from '../../domain/models';
import type { IGenerationStrategy, ISyncInferenceClient } from '../../domain/ports/inference';

export class SyncGenerationStrategy implements IGenerationStrategy {
  private readonly syncClient: ISyncInferenceClient;

  constructor(syncClient: ISyncInferenceClient) {
    this.syncClient = syncClient;
  }

  execute(request: InferenceRequest, signal?: AbortSignal): Promise<InferenceOutputPayload[]> {
    return this.syncClient.generateSync(request, signal);
  }
}
