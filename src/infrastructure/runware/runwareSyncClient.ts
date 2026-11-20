import type { InferenceOutputPayload, InferenceRequest } from '../../domain/models';
import type { ISyncInferenceClient } from '../../domain/ports/inference';
import type { IModelLibraryReader, IModelLibraryWriter } from '../../domain/ports/modelLibrary';
import type { IIdGenerator } from '../../domain/ports/runtime';
import { submitImageInferenceAdaptively } from './runwareAdaptiveSubmit';
import type { RunwareHttpTransport } from './runwareHttpTransport';
import { parseSyncInferenceResponse } from './runwareResponseParser';

export class RunwareSyncClient implements ISyncInferenceClient {
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

  async generateSync(
    request: InferenceRequest,
    signal?: AbortSignal,
  ): Promise<InferenceOutputPayload[]> {
    const result = await submitImageInferenceAdaptively(
      this.transport,
      this.idGenerator,
      request,
      'sync',
      this.modelLibrary,
      signal,
    );
    return parseSyncInferenceResponse(result.payload);
  }
}
