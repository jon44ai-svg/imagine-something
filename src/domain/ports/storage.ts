import type { GenerationSettings, InputRecord, OutputRecord } from '../models';

export interface ISettingsReader {
  load(): Promise<GenerationSettings>;
}

export interface ISettingsWriter {
  save(settings: GenerationSettings): Promise<void>;
}

export interface ICredentialReader {
  getApiKey(): Promise<string>;
}

export interface ICredentialWriter {
  setApiKey(apiKey: string): Promise<void>;
}

export interface IInputReader {
  list(): Promise<InputRecord[]>;
  getById(id: string): Promise<InputRecord | undefined>;
}

export interface IInputWriter {
  save(record: InputRecord): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IOutputReader {
  list(): Promise<OutputRecord[]>;
  listByInputId(inputId: string): Promise<OutputRecord[]>;
}

export interface IOutputWriter {
  save(record: OutputRecord): Promise<void>;
  remove(id: string): Promise<void>;
  removeByInputId(inputId: string): Promise<void>;
  clear(): Promise<void>;
}
