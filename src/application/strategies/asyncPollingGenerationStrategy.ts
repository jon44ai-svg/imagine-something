import type { InferenceOutputPayload, InferenceRequest } from '../../domain/models';
import type {
  IAsyncJobPoller,
  IAsyncJobSubmitter,
  IGenerationStrategy,
} from '../../domain/ports/inference';
import type { IClock } from '../../domain/ports/runtime';
import { createAbortError } from '../../utils/clock';

const MIN_POLL_INTERVAL_MS = 250;
const MIN_TIMEOUT_MS = 5000;

export class AsyncPollingGenerationStrategy implements IGenerationStrategy {
  private readonly submitter: IAsyncJobSubmitter;
  private readonly poller: IAsyncJobPoller;
  private readonly clock: IClock;

  constructor(submitter: IAsyncJobSubmitter, poller: IAsyncJobPoller, clock: IClock) {
    this.submitter = submitter;
    this.poller = poller;
    this.clock = clock;
  }

  async execute(
    request: InferenceRequest,
    signal?: AbortSignal,
  ): Promise<InferenceOutputPayload[]> {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const job = await this.submitter.submitAsync(request, signal);
    if (job.immediateOutputs && job.immediateOutputs.length > 0) {
      return job.immediateOutputs;
    }

    const pollInterval = Math.max(MIN_POLL_INTERVAL_MS, request.asyncPollIntervalMs || 1500);
    const timeoutMs = Math.max(MIN_TIMEOUT_MS, request.asyncTimeoutMs || 180000);
    const deadline = this.clock.now() + timeoutMs;

    while (true) {
      if (signal?.aborted) {
        throw createAbortError();
      }

      const remaining = deadline - this.clock.now();
      if (remaining <= 0) {
        throw new Error(`Async generation timed out after ${Math.round(timeoutMs / 1000)}s`);
      }

      await this.clock.sleep(Math.min(pollInterval, remaining), signal);

      const outcome = await this.poller.pollResult(job.taskUUID, request.apiKey, signal);
      if (outcome.status === 'completed') {
        return outcome.outputs;
      }
      if (outcome.status === 'failed') {
        throw new Error(outcome.error);
      }
    }
  }
}
