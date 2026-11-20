import type {
  ImageDimensions,
  InferenceOutputPayload,
  InputRecord,
  OutputFormat,
} from '../models';

export interface IImageDimensionReader {
  readDimensions(blob: Blob): Promise<ImageDimensions>;
}

export interface IInputImageEncoder {
  toInferenceDataUri(input: InputRecord): Promise<string>;
}

export interface IOutputImageHydrator {
  hydrateBlob(
    payload: InferenceOutputPayload,
    format: OutputFormat,
    signal?: AbortSignal,
  ): Promise<Blob | null>;
}
