import type { IObjectUrlRegistry } from '../../domain/ports/export';
import type { IOutputWriter } from '../../domain/ports/storage';

export class RemoveOutputUseCase {
  private readonly outputWriter: IOutputWriter;
  private readonly urlRegistry: IObjectUrlRegistry;

  constructor(outputWriter: IOutputWriter, urlRegistry: IObjectUrlRegistry) {
    this.outputWriter = outputWriter;
    this.urlRegistry = urlRegistry;
  }

  async execute(outputId: string): Promise<void> {
    this.urlRegistry.release(outputId);
    await this.outputWriter.remove(outputId);
  }
}
