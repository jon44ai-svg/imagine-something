import { resolveModelCapabilities } from '../../domain/modelCapabilities';
import type { DeliveryMethod, InferenceRequest, ResolutionTier } from '../../domain/models';
import { clampNumberResults } from '../../utils/dimensions';

export interface RunwareImageInferenceTask {
  taskType: 'imageInference';
  taskUUID: string;
  model: string;
  positivePrompt: string;
  width?: number;
  height?: number;
  resolution?: ResolutionTier;
  numberResults: number;
  outputType: string;
  outputFormat: string;
  outputQuality: number;
  deliveryMethod: DeliveryMethod;
  includeCost: true;
  negativePrompt?: string;
  steps?: number;
  CFGScale?: number;
  acceleration?: string;
  seedImage?: string;
  strength?: number;
  inputs?: {
    referenceImages: string[];
  };
}

export interface RunwareGetResponseTask {
  taskType: 'getResponse';
  taskUUID: string;
}

export function buildImageInferenceTask(
  request: InferenceRequest,
  taskUUID: string,
  deliveryMethod: DeliveryMethod,
  blockedParameters: readonly string[] = [],
): RunwareImageInferenceTask {
  const model = request.model.trim();
  const capabilities = resolveModelCapabilities(model, blockedParameters);
  const rawQuality = Number(request.outputQuality) || 95;
  const clampedQuality = Math.min(capabilities.maxOutputQuality, Math.max(20, rawQuality));

  const task: RunwareImageInferenceTask = {
    taskType: 'imageInference',
    taskUUID,
    model,
    positivePrompt: request.positivePrompt.trim(),
    numberResults: clampNumberResults(request.numberResults),
    outputType: request.outputType || 'dataURI',
    outputFormat: request.outputFormat || 'JPG',
    outputQuality: clampedQuality,
    deliveryMethod,
    includeCost: true,
  };

  if (request.resolution) {
    task.resolution = request.resolution;
  } else if (request.width && request.height) {
    task.width = request.width;
    task.height = request.height;
  }

  if (capabilities.supportsNegativePrompt && request.negativePrompt.trim()) {
    task.negativePrompt = request.negativePrompt.trim();
  }

  if (
    capabilities.supportsSteps &&
    request.steps !== '' &&
    !Number.isNaN(Number(request.steps))
  ) {
    task.steps = Number(request.steps);
  }

  if (
    capabilities.supportsCfgScale &&
    request.CFGScale !== '' &&
    !Number.isNaN(Number(request.CFGScale))
  ) {
    task.CFGScale = Number(request.CFGScale);
  }

  if (
    capabilities.supportsAcceleration &&
    request.acceleration &&
    request.acceleration !== 'omit'
  ) {
    task.acceleration = request.acceleration;
  }

  if (capabilities.supportsSeedImage && request.inputMode === 'seedImage') {
    task.seedImage = request.inputDataUri;
    if (request.strength !== '' && !Number.isNaN(Number(request.strength))) {
      task.strength = Number(request.strength);
    }
  } else {
    task.inputs = {
      referenceImages: [request.inputDataUri],
    };
  }

  return task;
}

export function buildGetResponseTask(taskUUID: string): RunwareGetResponseTask {
  return {
    taskType: 'getResponse',
    taskUUID,
  };
}
