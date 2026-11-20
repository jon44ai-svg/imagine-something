import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { InputRecord, OutputRecord } from '../../../domain/models';
import { IDB_NAME, IDB_VERSION } from '../../../domain/presets';
import { IndexedDbClient } from '../indexedDbClient';
import { IndexedDbInputStore } from '../indexedDbInputStore';
import { IndexedDbOutputStore } from '../indexedDbOutputStore';

function makeInput(id: string, order: number): InputRecord {
  return {
    id,
    name: `${id}.png`,
    type: 'image/png',
    width: 512,
    height: 512,
    blob: new Blob(['img'], { type: 'image/png' }),
    status: 'pending',
    error: '',
    order,
    createdAt: 1000 + order,
  };
}

function makeOutput(id: string, inputId: string, createdAt: number): OutputRecord {
  return {
    id,
    inputId,
    inputName: `${inputId}.png`,
    blob: new Blob(['out'], { type: 'image/jpeg' }),
    imageURL: '',
    format: 'JPG',
    width: 1024,
    height: 1024,
    prompt: 'test prompt',
    model: 'runware:400@6',
    seed: 42,
    cost: 0.0025,
    createdAt,
  };
}

describe('IndexedDB stores (RunwareI2IPipelineDB v1 schema)', () => {
  it('creates compatible object stores and by_inputId index', async () => {
    const client = new IndexedDbClient(IDB_NAME, IDB_VERSION, new IDBFactory());
    const db = await client.open();

    expect(db.name).toBe('RunwareI2IPipelineDB');
    expect(db.version).toBe(1);
    expect(db.objectStoreNames.contains('inputs')).toBe(true);
    expect(db.objectStoreNames.contains('outputs')).toBe(true);

    const tx = db.transaction('outputs', 'readonly');
    expect(tx.objectStore('outputs').indexNames.contains('by_inputId')).toBe(true);
    await client.close();
  });

  it('persists, sorts, queries by inputId, and deletes records accurately', async () => {
    const client = new IndexedDbClient(IDB_NAME, IDB_VERSION, new IDBFactory());
    const inputStore = new IndexedDbInputStore(client);
    const outputStore = new IndexedDbOutputStore(client);

    await inputStore.save(makeInput('in-2', 2));
    await inputStore.save(makeInput('in-1', 1));
    const listedInputs = await inputStore.list();
    expect(listedInputs.map((i) => i.id)).toEqual(['in-1', 'in-2']);

    await outputStore.save(makeOutput('out-b', 'in-1', 200));
    await outputStore.save(makeOutput('out-a', 'in-1', 100));
    await outputStore.save(makeOutput('out-c', 'in-2', 300));

    const forInput1 = await outputStore.listByInputId('in-1');
    expect(forInput1.map((o) => o.id)).toEqual(['out-a', 'out-b']);

    await outputStore.removeByInputId('in-1');
    const remaining = await outputStore.list();
    expect(remaining.map((o) => o.id)).toEqual(['out-c']);

    await inputStore.clear();
    await outputStore.clear();
    expect(await inputStore.list()).toHaveLength(0);
    expect(await outputStore.list()).toHaveLength(0);

    await client.close();
  });
});
