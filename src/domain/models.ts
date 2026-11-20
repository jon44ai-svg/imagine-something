export type PipelineStatus = 'pending' | 'processing' | 'done' | 'error';

export type PipelineFilter = 'all' | 'pending' | 'done' | 'error';

export type AspectRatio =
  | 'match'
  | '1:1'
  | '4:3'
  | '3:4'
  | '16:9'
  | '9:16'
  | '3:2'
  | '2:3'
  | 'custom';

export type OutputFormat = 'JPG' | 'PNG' | 'WEBP';

export type AccelerationMode = 'high' | 'medium' | 'low' | 'none' | 'omit';

export type InputMode = 'referenceImages' | 'seedImage';

export type OutputDeliveryType = 'dataURI' | 'URL';

export type DeliveryMethod = 'sync' | 'async';

export type ResolutionTier = '1K' | '2K' | '4K';

export interface GenerationSettings {
  model: string;
  positivePrompt: string;
  negativePrompt: string;
  aspectRatio: AspectRatio;
  baseSize: number;
  customWidth: number;
  customHeight: number;
  numberResults: number;
  outputFormat: OutputFormat;
  outputQuality: number;
  steps: string;
  CFGScale: string;
  acceleration: AccelerationMode;
  inputMode: InputMode;
  strength: string;
  outputType: OutputDeliveryType;
  settingsHidden: boolean;
  // Phase 1 additive fields (100% backwards-compatible with existing localStorage)
  concurrency: number;
  deliveryMethod: DeliveryMethod;
  asyncPollIntervalMs: number;
  asyncTimeoutMs: number;
}

export interface ModelPresetConfig {
  id: string;
  label: string;
  steps: string;
  CFGScale: string;
  acceleration: AccelerationMode;
  inputMode: InputMode;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface InputRecord {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  blob: Blob;
  status: PipelineStatus;
  error: string;
  order: number;
  createdAt: number;
}

export interface OutputRecord {
  id: string;
  inputId: string;
  inputName: string;
  blob: Blob | null;
  imageURL: string;
  format: OutputFormat;
  width: number;
  height: number;
  prompt: string;
  model: string;
  seed: number | string | null;
  cost: number | null;
  createdAt: number;
}

export interface InferenceRequest {
  apiKey: string;
  model: string;
  positivePrompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  resolution?: ResolutionTier;
  numberResults: number;
  outputType: OutputDeliveryType;
  outputFormat: OutputFormat;
  outputQuality: number;
  steps: string;
  CFGScale: string;
  acceleration: AccelerationMode;
  inputMode: InputMode;
  strength: string;
  inputDataUri: string;
  deliveryMethod: DeliveryMethod;
  asyncPollIntervalMs: number;
  asyncTimeoutMs: number;
}

export interface InferenceOutputPayload {
  imageDataURI?: string;
  imageBase64Data?: string;
  imageURL?: string;
  seed?: number | string | null;
  cost?: number | null;
}

export interface SubmittedJob {
  taskUUID: string;
  immediateOutputs?: InferenceOutputPayload[];
}

export type PollOutcome =
  | { status: 'pending' }
  | { status: 'completed'; outputs: InferenceOutputPayload[] }
  | { status: 'failed'; error: string };

export type PreflightField = 'apiKey' | 'model' | 'positivePrompt';

export type PreflightResult =
  | { ok: true }
  | { ok: false; field: PreflightField; message: string };

export interface BatchProgressSnapshot {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  activeIds: string[];
  activeNames: string[];
  percentage: number;
  stopping: boolean;
}

export interface BatchExecutionSummary {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  stopped: boolean;
}

export interface IngestResult {
  added: InputRecord[];
  skippedNonImage: number;
  skippedLimit: number;
  limitReached: boolean;
}
