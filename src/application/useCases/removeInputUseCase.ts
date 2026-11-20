import type { IObjectUrlRegistry } from '../../domain/ports/export';
import type { IInputWriter, IOutputReader, IOutputWriter } from '../../domain/ports/storage';

export class RemoveInputUseCase {
  private readonly inputWriter: IInputWriter;
  private readonly outputReader: IOutputReader;
  private readonly outputWriter: IOutputWriter;
  private readonly urlRegistry: IObjectUrlRegistry;

  constructor(
    inputWriter: IInputWriter,
    outputReader: IOutputReader,
    outputWriter: IOutputWriter,
    urlRegistry: IObjectUrlRegistry,
  ) {
    this.inputWriter = inputWriter;
    this.outputReader = outputReader;
    this.outputWriter = outputWriter;
    this.urlRegistry = urlRegistry;
  }

  async execute(inputId: string): Promise<string[]> {
    const relatedOutputs = await this.outputReader.listByInputId(inputId);
    const removedOutputIds = relatedOutputs.map((output) => output.id);

    for (const outputId of removedOutputIds) {
      this.urlRegistry.release(outputId);
    }
    this.urlRegistry.release(inputId);

    await this.outputWriter.removeByInputId(inputId);
    await this.inputWriter.remove(inputId);

    return removedOutputIds;
  }
}
