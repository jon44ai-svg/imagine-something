import type { DeliveryMethod, InferenceRequest } from '../../domain/models';
import { parseUnsupportedParameter } from '../../domain/modelLibrary';
import type { IModelLibraryReader, IModelLibraryWriter } from '../../domain/ports/modelLibrary';
import type { IIdGenerator } from '../../domain/ports/runtime';
import type { RunwareApiPayload } from './runwareResponseParser';
import { extractRunwareError } from './runwareResponseParser';
import type { RunwareHttpTransport } from './runwareHttpTransport';
import { buildImageInferenceTask } from './runwareTaskBuilder';

const MAX_UNSUPPORTED_RETRIES = 6;

export interface AdaptiveSubmitResult {
  taskUUID: string;
  payload: RunwareApiPayload;
}

export async function submitImageInferenceAdaptively(
  transport: RunwareHttpTransport,
  idGenerator: IIdGenerator,
  request: InferenceRequest,
  deliveryMethod: DeliveryMethod,
  library: (IModelLibraryReader & IModelLibraryWriter) | undefined,
  signal?: AbortSignal,
): Promise<AdaptiveSubmitResult> {
  const blocked = new Set(library?.blockedFor(request.model) ?? []);

  for (let attempt = 0; attempt < MAX_UNSUPPORTED_RETRIES; attempt += 1) {
    const taskUUID = idGenerator.next();
    const task = buildImageInferenceTask(request, taskUUID, deliveryMethod, [...blocked]);
    const result = await transport.postTasks([task], request.apiKey, signal);
    const apiError = extractRunwareError(result.payload, result.status, result.ok);
    if (!apiError) {
      return { taskUUID, payload: result.payload };
    }

    const parameter = parseUnsupportedParameter(apiError);
    if (parameter && !blocked.has(parameter)) {
      blocked.add(parameter);
      library?.rememberBlocked(request.model, parameter);
      continue;
    }

    throw new Error(apiError);
  }

  throw new Error('Runware rejected unsupported parameters and retries were exhausted.');
}
