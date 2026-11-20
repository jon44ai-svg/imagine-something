import {
  parseSupportedDimensions,
  parseUnsupportedParameter,
  pickClosestSupportedDimension,
} from '../../domain/modelLibrary';
import type { DeliveryMethod, InferenceRequest } from '../../domain/models';
import type { IModelLibraryReader, IModelLibraryWriter } from '../../domain/ports/modelLibrary';
import type { IIdGenerator } from '../../domain/ports/runtime';
import type { RunwareHttpTransport } from './runwareHttpTransport';
import type { RunwareApiPayload } from './runwareResponseParser';
import { extractRunwareError } from './runwareResponseParser';
import { buildImageInferenceTask } from './runwareTaskBuilder';

const MAX_UNSUPPORTED_RETRIES = 7;

export interface AdaptiveSubmitResult {
  taskUUID: string;
  payload: RunwareApiPayload;
  resolvedWidth?: number;
  resolvedHeight?: number;
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
  let effectiveRequest: InferenceRequest = { ...request };
  let retriedDimensions = false;

  // Proactively snap to a known supported dimension if the model has a persisted allowlist
  const knownAllowed = library?.supportedDimensionsFor(request.model) ?? [];
  if (knownAllowed.length > 0 && effectiveRequest.width && effectiveRequest.height) {
    const isAlreadyAllowed = knownAllowed.some(
      (d) => d.width === effectiveRequest.width && d.height === effectiveRequest.height,
    );
    if (!isAlreadyAllowed) {
      const chosen = pickClosestSupportedDimension(
        knownAllowed,
        effectiveRequest.inputWidth ?? effectiveRequest.width,
        effectiveRequest.inputHeight ?? effectiveRequest.height,
        Math.max(effectiveRequest.width, effectiveRequest.height),
      );
      effectiveRequest = {
        ...effectiveRequest,
        width: chosen.width,
        height: chosen.height,
        resolution: undefined,
      };
    }
  }

  for (let attempt = 0; attempt < MAX_UNSUPPORTED_RETRIES; attempt += 1) {
    const taskUUID = idGenerator.next();
    const task = buildImageInferenceTask(effectiveRequest, taskUUID, deliveryMethod, [...blocked]);
    const result = await transport.postTasks([task], effectiveRequest.apiKey, signal);
    const apiError = extractRunwareError(result.payload, result.status, result.ok);
    if (!apiError) {
      return {
        taskUUID,
        payload: result.payload,
        resolvedWidth: task.width,
        resolvedHeight: task.height,
      };
    }

    const parameter = parseUnsupportedParameter(apiError);
    if (parameter && !blocked.has(parameter)) {
      blocked.add(parameter);
      library?.rememberBlocked(effectiveRequest.model, parameter);
      continue;
    }

    const parsedDimensions = parseSupportedDimensions(apiError);
    if (parsedDimensions && !retriedDimensions) {
      retriedDimensions = true;
      library?.rememberSupportedDimensions(effectiveRequest.model, parsedDimensions);
      const chosen = pickClosestSupportedDimension(
        parsedDimensions,
        effectiveRequest.inputWidth ?? effectiveRequest.width,
        effectiveRequest.inputHeight ?? effectiveRequest.height,
        effectiveRequest.width && effectiveRequest.height
          ? Math.max(effectiveRequest.width, effectiveRequest.height)
          : undefined,
      );
      effectiveRequest = {
        ...effectiveRequest,
        width: chosen.width,
        height: chosen.height,
        resolution: undefined,
      };
      continue;
    }

    throw new Error(apiError);
  }

  throw new Error('Runware rejected unsupported parameters and retries were exhausted.');
}
