import type { InputRecord } from '../../domain/models';
import type { IInputReader, IInputWriter } from '../../domain/ports/storage';

export class RecoverStuckItemsUseCase {
  private readonly inputReader: IInputReader;
  private readonly inputWriter: IInputWriter;

  constructor(inputReader: IInputReader, inputWriter: IInputWriter) {
    this.inputReader = inputReader;
    this.inputWriter = inputWriter;
  }

  async execute(): Promise<InputRecord[]> {
    const inputs = await this.inputReader.list();
    const recovered: InputRecord[] = [];

    for (const item of inputs) {
      if (item.status === 'processing') {
        const next: InputRecord = { ...item, status: 'pending' };
        await this.inputWriter.save(next);
        recovered.push(next);
      } else {
        recovered.push(item);
      }
    }

    return recovered;
  }
}
