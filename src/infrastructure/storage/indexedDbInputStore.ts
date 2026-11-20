import type { InputRecord } from '../../domain/models';
import type { IInputReader, IInputWriter } from '../../domain/ports/storage';
import type { IndexedDbClient } from './indexedDbClient';

export class IndexedDbInputStore implements IInputReader, IInputWriter {
  private readonly db: IndexedDbClient;

  constructor(db: IndexedDbClient) {
    this.db = db;
  }

  async list(): Promise<InputRecord[]> {
    const items = await this.db.getAll<InputRecord>('inputs');
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async getById(id: string): Promise<InputRecord | undefined> {
    return this.db.getByKey<InputRecord>('inputs', id);
  }

  async save(record: InputRecord): Promise<void> {
    await this.db.put('inputs', record);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete('inputs', id);
  }

  async clear(): Promise<void> {
    await this.db.clear('inputs');
  }
}
