import { AsyncPollingGenerationStrategy } from '../application/strategies/asyncPollingGenerationStrategy';
import { GenerationStrategyResolver } from '../application/strategies/generationStrategyResolver';
import { SyncGenerationStrategy } from '../application/strategies/syncGenerationStrategy';
import { ClearStorageUseCase } from '../application/useCases/clearStorageUseCase';
import { ExportSingleOutputUseCase } from '../application/useCases/exportSingleOutputUseCase';
import { ExportZipArchiveUseCase } from '../application/useCases/exportZipArchiveUseCase';
import { IngestFilesUseCase } from '../application/useCases/ingestFilesUseCase';
import { ProcessSingleInputUseCase } from '../application/useCases/processSingleInputUseCase';
import { RecoverStuckItemsUseCase } from '../application/useCases/recoverStuckItemsUseCase';
import { RemoveInputUseCase } from '../application/useCases/removeInputUseCase';
import { RemoveOutputUseCase } from '../application/useCases/removeOutputUseCase';
import { ResetQueueUseCase } from '../application/useCases/resetQueueUseCase';
import { RunBatchPipelineUseCase } from '../application/useCases/runBatchPipelineUseCase';
import { ValidateRunPreflightUseCase } from '../application/useCases/validateRunPreflightUseCase';
import type { IObjectUrlRegistry } from '../domain/ports/export';
import type { IModelLibraryReader, IModelLibraryWriter } from '../domain/ports/modelLibrary';
import type {
  ICredentialReader,
  ICredentialWriter,
  IInputReader,
  IOutputReader,
  ISettingsReader,
  ISettingsWriter,
} from '../domain/ports/storage';
import type { IFaceDetector } from '../domain/ports/vision';
import { CanvasInputImageEncoder } from '../infrastructure/media/canvasInputImageEncoder';
import { BrowserImageDimensionReader } from '../infrastructure/media/imageDimensionReader';
import { OutputBlobHydrator } from '../infrastructure/media/outputBlobHydrator';
import { RunwareAsyncClient } from '../infrastructure/runware/runwareAsyncClient';
import { RunwareHttpTransport } from '../infrastructure/runware/runwareHttpTransport';
import { RunwareSyncClient } from '../infrastructure/runware/runwareSyncClient';
import { IndexedDbClient } from '../infrastructure/storage/indexedDbClient';
import { IndexedDbInputStore } from '../infrastructure/storage/indexedDbInputStore';
import { IndexedDbOutputStore } from '../infrastructure/storage/indexedDbOutputStore';
import { LocalStorageCredentialStore } from '../infrastructure/storage/localStorageCredentialStore';
import { LocalStorageModelLibraryStore } from '../infrastructure/storage/localStorageModelLibraryStore';
import { LocalStorageSettingsStore } from '../infrastructure/storage/localStorageSettingsStore';
import { CompositeFaceDetector } from '../infrastructure/vision/compositeFaceDetector';
import { BoundedConcurrencyPool } from '../utils/boundedConcurrencyPool';
import { BrowserFileDownloader } from '../utils/browserDownload';
import { SystemClock } from '../utils/clock';
import { ObjectUrlRegistry } from '../utils/objectUrlRegistry';
import { CryptoIdGenerator } from '../utils/uuid';
import { StoreZipBuilder } from '../utils/zipBuilder';

export interface AppContainer {
  settingsReader: ISettingsReader;
  settingsWriter: ISettingsWriter;
  modelLibrary: IModelLibraryReader & IModelLibraryWriter;
  credentialReader: ICredentialReader;
  credentialWriter: ICredentialWriter;
  inputReader: IInputReader;
  outputReader: IOutputReader;
  objectUrlRegistry: IObjectUrlRegistry;
  faceDetector: IFaceDetector;
  ingestFiles: IngestFilesUseCase;
  removeInput: RemoveInputUseCase;
  removeOutput: RemoveOutputUseCase;
  resetQueue: ResetQueueUseCase;
  clearStorage: ClearStorageUseCase;
  recoverStuckItems: RecoverStuckItemsUseCase;
  validatePreflight: ValidateRunPreflightUseCase;
  runBatchPipeline: RunBatchPipelineUseCase;
  exportSingleOutput: ExportSingleOutputUseCase;
  exportZipArchive: ExportZipArchiveUseCase;
}

/**
 * Composition Root (DIP):
 * To migrate to a future remote backend, replace the local storage / IndexedDB
 * stores and Runware HTTP clients below with HTTP/API adapters implementing the
 * exact same narrow ports — zero changes required in use-cases or React UI.
 */
export function createAppContainer(): AppContainer {
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();
  const scheduler = new BoundedConcurrencyPool();
  const objectUrlRegistry = new ObjectUrlRegistry();

  // Storage adapters (LocalStorage + IndexedDB — future backend swap point)
  const settingsStore = new LocalStorageSettingsStore();
  const modelLibrary = new LocalStorageModelLibraryStore();
  const credentialStore = new LocalStorageCredentialStore();
  const dbClient = new IndexedDbClient();
  const inputStore = new IndexedDbInputStore(dbClient);
  const outputStore = new IndexedDbOutputStore(dbClient);

  // Media & export adapters
  const dimensionReader = new BrowserImageDimensionReader();
  const inputEncoder = new CanvasInputImageEncoder();
  const outputHydrator = new OutputBlobHydrator();
  const zipBuilder = new StoreZipBuilder();
  const fileDownloader = new BrowserFileDownloader();
  const faceDetector = new CompositeFaceDetector();

  // Runware inference adapters (sync + async submit/poll — future backend proxy swap point)
  const runwareTransport = new RunwareHttpTransport();
  const syncClient = new RunwareSyncClient(runwareTransport, idGenerator, modelLibrary);
  const asyncClient = new RunwareAsyncClient(runwareTransport, idGenerator, modelLibrary);

  const strategyResolver = new GenerationStrategyResolver({
    sync: new SyncGenerationStrategy(syncClient),
    async: new AsyncPollingGenerationStrategy(asyncClient, asyncClient, clock),
  });

  // Single-responsibility use-cases
  const processSingleInput = new ProcessSingleInputUseCase(
    inputEncoder,
    strategyResolver,
    outputHydrator,
    outputStore,
    idGenerator,
    clock,
  );

  return {
    settingsReader: settingsStore,
    settingsWriter: settingsStore,
    modelLibrary,
    credentialReader: credentialStore,
    credentialWriter: credentialStore,
    inputReader: inputStore,
    outputReader: outputStore,
    objectUrlRegistry,
    faceDetector,
    ingestFiles: new IngestFilesUseCase(
      inputStore,
      inputStore,
      dimensionReader,
      idGenerator,
      clock,
    ),
    removeInput: new RemoveInputUseCase(inputStore, outputStore, outputStore, objectUrlRegistry),
    removeOutput: new RemoveOutputUseCase(outputStore, objectUrlRegistry),
    resetQueue: new ResetQueueUseCase(inputStore, inputStore),
    clearStorage: new ClearStorageUseCase(inputStore, outputStore, outputStore, objectUrlRegistry),
    recoverStuckItems: new RecoverStuckItemsUseCase(inputStore, inputStore),
    validatePreflight: new ValidateRunPreflightUseCase(),
    runBatchPipeline: new RunBatchPipelineUseCase(inputStore, scheduler, processSingleInput),
    exportSingleOutput: new ExportSingleOutputUseCase(outputStore, fileDownloader),
    exportZipArchive: new ExportZipArchiveUseCase(outputStore, zipBuilder, fileDownloader, clock),
  };
}
