import type {
  DeliveryMethod,
  InferenceOutputPayload,
  InferenceRequest,
  PollOutcome,
  SubmittedJob,
} from '../models';

export interface ISyncInferenceClient {
  generateSync(request: InferenceRequest, signal?: AbortSignal): Promise<InferenceOutputPayload[]>;
}

export interface IAsyncJobSubmitter {
  submitAsync(request: InferenceRequest, signal?: AbortSignal): Promise<SubmittedJob>;
}

export interface IAsyncJobPoller {
  pollResult(taskUUID: string, apiKey: string, signal?: AbortSignal): Promise<PollOutcome>;
}

export interface IGenerationStrategy {
  execute(request: InferenceRequest, signal?: AbortSignal): Promise<InferenceOutputPayload[]>;
}

export interface IGenerationStrategyResolver {
  resolve(method: DeliveryMethod): IGenerationStrategy;
}
