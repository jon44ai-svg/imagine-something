import type {
  GenerationSettings,
  InferenceRequest,
  InputRecord,
  OutputRecord,
} from '../../domain/models';
import type { IGenerationStrategyResolver } from '../../domain/ports/inference';
import type { IInputImageEncoder, IOutputImageHydrator } from '../../domain/ports/media';
import type { IClock, IIdGenerator } from '../../domain/ports/runtime';
import type { IOutputWriter } from '../../domain/ports/storage';
import { clampNumberResults, computeDimensions } from '../../utils/dimensions';

export class ProcessSingleInputUseCase {
  private readonly inputEncoder: IInputImageEncoder;
  private readonly strategyResolver: IGenerationStrategyResolver;
  private readonly outputHydrator: IOutputImageHydrator;
  private readonly outputWriter: IOutputWriter;
  private readonly idGenerator: IIdGenerator;
  private readonly clock: IClock;

  constructor(
    inputEncoder: IInputImageEncoder,
    strategyResolver: IGenerationStrategyResolver,
    outputHydrator: IOutputImageHydrator,
    outputWriter: IOutputWriter,
    idGenerator: IIdGenerator,
    clock: IClock,
  ) {
    this.inputEncoder = inputEncoder;
    this.strategyResolver = strategyResolver;
    this.outputHydrator = outputHydrator;
    this.outputWriter = outputWriter;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  async execute(
    input: InputRecord,
    settings: GenerationSettings,
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<OutputRecord[]> {
    const inputDataUri = await this.inputEncoder.toInferenceDataUri(input);
    const dims = computeDimensions(
      settings.aspectRatio,
      settings.baseSize,
      input.width,
      input.height,
      settings.customWidth,
      settings.customHeight,
    );

    const request: InferenceRequest = {
      apiKey: apiKey.trim(),
      model: settings.model.trim(),
      positivePrompt: settings.positivePrompt.trim(),
      negativePrompt: settings.negativePrompt,
      width: dims.width,
      height: dims.height,
      numberResults: clampNumberResults(settings.numberResults),
      outputType: settings.outputType,
      outputFormat: settings.outputFormat,
      outputQuality: settings.outputQuality,
      steps: settings.steps,
      CFGScale: settings.CFGScale,
      acceleration: settings.acceleration,
      inputMode: settings.inputMode,
      strength: settings.strength,
      inputDataUri,
      deliveryMethod: settings.deliveryMethod,
      asyncPollIntervalMs: settings.asyncPollIntervalMs,
      asyncTimeoutMs: settings.asyncTimeoutMs,
    };

    const strategy = this.strategyResolver.resolve(settings.deliveryMethod);
    const payloads = await strategy.execute(request, signal);

    const savedOutputs: OutputRecord[] = [];
    for (const payload of payloads) {
      const blob = await this.outputHydrator.hydrateBlob(payload, settings.outputFormat, signal);
      const record: OutputRecord = {
        id: this.idGenerator.next(),
        inputId: input.id,
        inputName: input.name,
        blob,
        imageURL: payload.imageURL || '',
        format: settings.outputFormat,
        width: dims.width,
        height: dims.height,
        prompt: request.positivePrompt,
        model: request.model,
        seed: payload.seed !== undefined ? payload.seed : null,
        cost: typeof payload.cost === 'number' ? payload.cost : null,
        createdAt: this.clock.now(),
      };
      await this.outputWriter.save(record);
      savedOutputs.push(record);
    }

    return savedOutputs;
  }
}
