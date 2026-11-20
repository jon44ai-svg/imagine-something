import type { OutputRecord } from '../../domain/models';
import type { IOutputReader, IOutputWriter } from '../../domain/ports/storage';
import type { IndexedDbClient } from './indexedDbClient';

export class IndexedDbOutputStore implements IOutputReader, IOutputWriter {
  private readonly db: IndexedDbClient;

  constructor(db: IndexedDbClient) {
    this.db = db;
  }

  async list(): Promise<OutputRecord[]> {
    const items = await this.db.getAll<OutputRecord>('outputs');
    return items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  async listByInputId(inputId: string): Promise<OutputRecord[]> {
    const items = await this.db.getAllByIndex<OutputRecord>('outputs', 'by_inputId', inputId);
    return items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  async save(record: OutputRecord): Promise<void> {
    await this.db.put('outputs', record);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete('outputs', id);
  }

  async removeByInputId(inputId: string): Promise<void> {
    await this.db.deleteByIndex('outputs', 'by_inputId', inputId);
  }

  async clear(): Promise<void> {
    await this.db.clear('outputs');
  }
}
