import type { InferenceOutputPayload, OutputFormat } from '../../domain/models';
import type { IOutputImageHydrator } from '../../domain/ports/media';
import { isAbortError } from '../../utils/clock';
import { base64ToBlob, dataURIToBlob } from '../../utils/imageCodec';

export class OutputBlobHydrator implements IOutputImageHydrator {
  private readonly fetchFn: typeof fetch;

  constructor(fetchFn: typeof fetch = globalThis.fetch.bind(globalThis)) {
    this.fetchFn = fetchFn;
  }

  async hydrateBlob(
    payload: InferenceOutputPayload,
    format: OutputFormat,
    signal?: AbortSignal,
  ): Promise<Blob | null> {
    if (payload.imageDataURI) {
      return dataURIToBlob(payload.imageDataURI);
    }
    if (payload.imageBase64Data) {
      return base64ToBlob(payload.imageBase64Data, format);
    }
    if (payload.imageURL) {
      try {
        const response = await this.fetchFn(payload.imageURL, { signal });
        if (response.ok) {
          return await response.blob();
        }
      } catch (err) {
        if (isAbortError(err)) throw err;
        console.warn('Could not fetch imageURL into Blob, keeping URL fallback:', err);
      }
    }
    return null;
  }
}
