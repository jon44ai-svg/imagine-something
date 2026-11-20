import type { InferenceOutputPayload, PollOutcome } from '../../domain/models';

export interface RunwareErrorEntry {
  code?: string;
  message?: string;
  taskUUID?: string;
}

export interface RunwareDataEntry {
  taskType?: string;
  taskUUID?: string;
  status?: string;
  imageDataURI?: string;
  imageURL?: string;
  imageBase64Data?: string;
  seed?: number | string | null;
  cost?: number | null;
}

export interface RunwareApiPayload {
  data?: RunwareDataEntry[];
  errors?: RunwareErrorEntry[];
  message?: string;
  error?: string;
}

function hasImagePayload(entry: RunwareDataEntry): boolean {
  return Boolean(entry.imageDataURI || entry.imageURL || entry.imageBase64Data);
}

function toOutputPayload(entry: RunwareDataEntry): InferenceOutputPayload {
  return {
    imageDataURI: entry.imageDataURI,
    imageBase64Data: entry.imageBase64Data,
    imageURL: entry.imageURL,
    seed: entry.seed !== undefined ? entry.seed : null,
    cost: typeof entry.cost === 'number' ? entry.cost : null,
  };
}

export function extractRunwareError(
  payload: RunwareApiPayload | null | undefined,
  httpStatus: number,
  httpOk: boolean,
): string | null {
  if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors
      .map((entry) => entry.message || entry.code || JSON.stringify(entry))
      .join('; ');
  }

  if (!httpOk) {
    return payload?.message || payload?.error || `HTTP ${httpStatus} error`;
  }

  return null;
}

export function parseSyncInferenceResponse(
  payload: RunwareApiPayload | null | undefined,
): InferenceOutputPayload[] {
  const entries = Array.isArray(payload?.data)
    ? payload.data.filter(
        (entry) => entry.taskType === 'imageInference' || hasImagePayload(entry),
      )
    : [];

  if (entries.length === 0) {
    throw new Error('Runware returned no generated images.');
  }

  return entries.map(toOutputPayload);
}

export function parseAsyncSubmitResponse(
  payload: RunwareApiPayload | null | undefined,
  taskUUID: string,
): InferenceOutputPayload[] | undefined {
  if (!Array.isArray(payload?.data)) return undefined;
  const ready = payload.data.filter(
    (entry) => (!entry.taskUUID || entry.taskUUID === taskUUID) && hasImagePayload(entry),
  );
  return ready.length > 0 ? ready.map(toOutputPayload) : undefined;
}

export function parseAsyncPollResponse(
  payload: RunwareApiPayload | null | undefined,
  taskUUID: string,
): PollOutcome {
  if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
    const matchingErrors = payload.errors.filter(
      (entry) => !entry.taskUUID || entry.taskUUID === taskUUID,
    );
    const activeErrors = matchingErrors.length > 0 ? matchingErrors : payload.errors;
    const message = activeErrors
      .map((entry) => entry.message || entry.code || JSON.stringify(entry))
      .join('; ');
    return { status: 'failed', error: message };
  }

  const entries = Array.isArray(payload?.data)
    ? payload.data.filter((entry) => !entry.taskUUID || entry.taskUUID === taskUUID)
    : [];

  if (entries.length === 0) {
    return { status: 'pending' };
  }

  const stillProcessing = entries.some(
    (entry) => entry.status === 'processing' || entry.status === 'queued' || entry.status === 'pending',
  );
  if (stillProcessing) {
    return { status: 'pending' };
  }

  const withImages = entries.filter(hasImagePayload);
  if (withImages.length === 0) {
    return { status: 'pending' };
  }

  return {
    status: 'completed',
    outputs: withImages.map(toOutputPayload),
  };
}
