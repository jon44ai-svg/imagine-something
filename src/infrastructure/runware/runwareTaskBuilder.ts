import type { DeliveryMethod, InferenceRequest } from '../../domain/models';
import { clampNumberResults } from '../../utils/dimensions';

export interface RunwareImageInferenceTask {
  taskType: 'imageInference';
  taskUUID: string;
  model: string;
  positivePrompt: string;
  width: number;
  height: number;
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
): RunwareImageInferenceTask {
  const task: RunwareImageInferenceTask = {
    taskType: 'imageInference',
    taskUUID,
    model: request.model.trim(),
    positivePrompt: request.positivePrompt.trim(),
    width: request.width,
    height: request.height,
    numberResults: clampNumberResults(request.numberResults),
    outputType: request.outputType || 'dataURI',
    outputFormat: request.outputFormat || 'JPG',
    outputQuality: Number(request.outputQuality) || 95,
    deliveryMethod,
    includeCost: true,
  };

  if (request.negativePrompt.trim()) {
    task.negativePrompt = request.negativePrompt.trim();
  }

  if (request.steps !== '' && !Number.isNaN(Number(request.steps))) {
    task.steps = Number(request.steps);
  }

  if (request.CFGScale !== '' && !Number.isNaN(Number(request.CFGScale))) {
    task.CFGScale = Number(request.CFGScale);
  }

  if (request.acceleration && request.acceleration !== 'omit') {
    task.acceleration = request.acceleration;
  }

  if (request.inputMode === 'seedImage') {
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
