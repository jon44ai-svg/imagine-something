import type {
  AccelerationMode,
  AspectRatio,
  DeliveryMethod,
  GenerationSettings,
  InputMode,
  ModelPresetConfig,
  OutputDeliveryType,
  OutputFormat,
} from './models';

export const MAX_IMAGES = 100;
export const MAX_CONCURRENCY = 10;
export const MIN_CONCURRENCY = 1;
export const RUNWARE_API_ENDPOINT = 'https://api.runware.ai/v1';

// Exact legacy keys preserved for 100% backwards compatibility
export const LS_API_KEY = 'runware_i2i_api_key';
export const LS_SETTINGS_KEY = 'runware_i2i_settings_v1';
export const IDB_NAME = 'RunwareI2IPipelineDB';
export const IDB_VERSION = 1;

export const DEFAULT_SETTINGS: GenerationSettings = {
  model: 'runware:400@6',
  positivePrompt: '',
  negativePrompt: '',
  aspectRatio: '1:1',
  baseSize: 2048,
  customWidth: 1024,
  customHeight: 1024,
  numberResults: 1,
  outputFormat: 'JPG',
  outputQuality: 95,
  steps: '4',
  CFGScale: '3.5',
  acceleration: 'high',
  inputMode: 'referenceImages',
  strength: '0.75',
  outputType: 'dataURI',
  settingsHidden: false,
  concurrency: 3,
  deliveryMethod: 'sync',
  asyncPollIntervalMs: 1500,
  asyncTimeoutMs: 180000,
};

export const MODEL_PRESETS: Record<string, ModelPresetConfig> = {
  'runware:400@6': {
    id: 'runware:400@6',
    label: 'runware:400@6 (Default)',
    steps: '4',
    CFGScale: '3.5',
    acceleration: 'high',
    inputMode: 'referenceImages',
  },
  'runware:400@3': {
    id: 'runware:400@3',
    label: 'runware:400@3 (Flux.2 Klein)',
    steps: '',
    CFGScale: '',
    acceleration: 'omit',
    inputMode: 'referenceImages',
  },
  'runware:108@22': {
    id: 'runware:108@22',
    label: 'runware:108@22 (Qwen Edit+)',
    steps: '',
    CFGScale: '',
    acceleration: 'omit',
    inputMode: 'referenceImages',
  },
  'alibaba:qwen-image@3.0': {
    id: 'alibaba:qwen-image@3.0',
    label: 'alibaba:qwen-image@3.0',
    steps: '',
    CFGScale: '',
    acceleration: 'omit',
    inputMode: 'referenceImages',
  },
  'google:nano-banana@2.1': {
    id: 'google:nano-banana@2.1',
    label: 'google:nano-banana@2.1 (Nano Banana 2.1)',
    steps: '',
    CFGScale: '',
    acceleration: 'omit',
    inputMode: 'referenceImages',
  },
};

export const CUSTOM_MODEL_VALUE = '__custom';

export const ASPECT_RATIO_OPTIONS: ReadonlyArray<{ value: AspectRatio; label: string }> = [
  { value: 'match', label: 'Match Input Image' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Landscape)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '9:16', label: '9:16 (Vertical)' },
  { value: '3:2', label: '3:2 (Photo Landscape)' },
  { value: '2:3', label: '2:3 (Photo Portrait)' },
  { value: 'custom', label: 'Custom W x H' },
];

export const BASE_SIZE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '768', label: '768 px (Fast)' },
  { value: '1024', label: '1024 px (Standard)' },
  { value: '1536', label: '1536 px (High)' },
  { value: '2048', label: '2048 px (Ultra)' },
];

export const OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{ value: OutputFormat; label: string }> = [
  { value: 'JPG', label: 'JPG' },
  { value: 'PNG', label: 'PNG' },
  { value: 'WEBP', label: 'WEBP' },
];

export const ACCELERATION_OPTIONS: ReadonlyArray<{ value: AccelerationMode; label: string }> = [
  { value: 'high', label: 'high' },
  { value: 'medium', label: 'medium' },
  { value: 'low', label: 'low' },
  { value: 'none', label: 'none' },
  { value: 'omit', label: 'Omit parameter' },
];

export const INPUT_MODE_OPTIONS: ReadonlyArray<{ value: InputMode; label: string }> = [
  { value: 'referenceImages', label: 'inputs.referenceImages (Flux.2 / 400@6 / Qwen)' },
  { value: 'seedImage', label: 'seedImage + strength (Classic I2I)' },
];

export const OUTPUT_TYPE_OPTIONS: ReadonlyArray<{ value: OutputDeliveryType; label: string }> = [
  { value: 'dataURI', label: 'dataURI (Recommended for IndexedDB)' },
  { value: 'URL', label: 'URL (Fetch & cache to IndexedDB)' },
];

export const DELIVERY_METHOD_OPTIONS: ReadonlyArray<{ value: DeliveryMethod; label: string }> = [
  { value: 'sync', label: 'Sync (Single request — fast jobs)' },
  { value: 'async', label: 'Async (Submit + Poll — heavy/parallel jobs)' },
];
