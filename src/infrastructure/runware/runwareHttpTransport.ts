import { RUNWARE_API_ENDPOINT } from '../../domain/presets';
import type { RunwareApiPayload } from './runwareResponseParser';

export interface RunwareHttpResult {
  ok: boolean;
  status: number;
  payload: RunwareApiPayload;
}

export class RunwareHttpTransport {
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;

  constructor(
    endpoint: string = RUNWARE_API_ENDPOINT,
    fetchFn: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    this.endpoint = endpoint;
    this.fetchFn = fetchFn;
  }

  async postTasks(
    tasks: readonly unknown[],
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<RunwareHttpResult> {
    const response = await this.fetchFn(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(tasks),
      signal,
    });

    let payload: RunwareApiPayload;
    try {
      payload = (await response.json()) as RunwareApiPayload;
    } catch {
      throw new Error(`HTTP ${response.status}: Invalid JSON response from Runware API`);
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  }
}
