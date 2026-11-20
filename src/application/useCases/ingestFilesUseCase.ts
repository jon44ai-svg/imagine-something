import type { IngestResult, InputRecord } from '../../domain/models';
import type { IImageDimensionReader } from '../../domain/ports/media';
import type { IClock, IIdGenerator } from '../../domain/ports/runtime';
import type { IInputReader, IInputWriter } from '../../domain/ports/storage';
import { MAX_IMAGES } from '../../domain/presets';

export class IngestFilesUseCase {
  private readonly inputReader: IInputReader;
  private readonly inputWriter: IInputWriter;
  private readonly dimensionReader: IImageDimensionReader;
  private readonly idGenerator: IIdGenerator;
  private readonly clock: IClock;
  private readonly maxImages: number;

  constructor(
    inputReader: IInputReader,
    inputWriter: IInputWriter,
    dimensionReader: IImageDimensionReader,
    idGenerator: IIdGenerator,
    clock: IClock,
    maxImages: number = MAX_IMAGES,
  ) {
    this.inputReader = inputReader;
    this.inputWriter = inputWriter;
    this.dimensionReader = dimensionReader;
    this.idGenerator = idGenerator;
    this.clock = clock;
    this.maxImages = maxImages;
  }

  async execute(files: readonly File[]): Promise<IngestResult> {
    if (files.length === 0) {
      return { added: [], skippedNonImage: 0, skippedLimit: 0, limitReached: false };
    }

    const imageFiles = files.filter((file) => Boolean(file.type && file.type.startsWith('image/')));
    const skippedNonImage = files.length - imageFiles.length;

    const existing = await this.inputReader.list();
    const remainingSlots = this.maxImages - existing.length;

    if (remainingSlots <= 0) {
      return {
        added: [],
        skippedNonImage,
        skippedLimit: imageFiles.length,
        limitReached: true,
      };
    }

    const toAdd = imageFiles.slice(0, remainingSlots);
    const skippedLimit = imageFiles.length - toAdd.length;
    let maxOrder = existing.reduce((max, item) => Math.max(max, item.order || 0), 0);

    const added: InputRecord[] = [];
    for (const file of toAdd) {
      const dims = await this.dimensionReader.readDimensions(file);
      const record: InputRecord = {
        id: this.idGenerator.next(),
        name: file.name,
        type: file.type || 'image/jpeg',
        width: dims.width,
        height: dims.height,
        blob: file,
        status: 'pending',
        error: '',
        order: ++maxOrder,
        createdAt: this.clock.now(),
      };
      await this.inputWriter.save(record);
      added.push(record);
    }

    return {
      added,
      skippedNonImage,
      skippedLimit,
      limitReached: false,
    };
  }
}
