import type { InputRecord } from '../../domain/models';
import type { IInputReader, IInputWriter } from '../../domain/ports/storage';

export class ResetQueueUseCase {
  private readonly inputReader: IInputReader;
  private readonly inputWriter: IInputWriter;

  constructor(inputReader: IInputReader, inputWriter: IInputWriter) {
    this.inputReader = inputReader;
    this.inputWriter = inputWriter;
  }

  async execute(): Promise<InputRecord[]> {
    const inputs = await this.inputReader.list();
    const updated: InputRecord[] = [];
    for (const item of inputs) {
      const next: InputRecord = { ...item, status: 'pending', error: '' };
      await this.inputWriter.save(next);
      updated.push(next);
    }
    return updated;
  }
}
