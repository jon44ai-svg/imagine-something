import type { IObjectUrlRegistry } from '../../domain/ports/export';
import type { IInputWriter, IOutputReader, IOutputWriter } from '../../domain/ports/storage';

export class ClearStorageUseCase {
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

  async clearOutputs(): Promise<void> {
    const outputs = await this.outputReader.list();
    for (const output of outputs) {
      this.urlRegistry.release(output.id);
    }
    await this.outputWriter.clear();
  }

  async clearAll(): Promise<void> {
    this.urlRegistry.releaseAll();
    await this.inputWriter.clear();
    await this.outputWriter.clear();
  }
}
