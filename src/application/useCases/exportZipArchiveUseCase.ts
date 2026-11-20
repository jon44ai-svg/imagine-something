import type { IFileDownloader, IZipArchiveBuilder, ZipEntry } from '../../domain/ports/export';
import type { IClock } from '../../domain/ports/runtime';
import type { IOutputReader } from '../../domain/ports/storage';
import {
  buildOutputFilename,
  buildZipArchiveFilename,
  deduplicateFilename,
} from '../../utils/filename';

export interface ZipExportResult {
  fileCount: number;
  archiveName: string;
}

export class ExportZipArchiveUseCase {
  private readonly outputReader: IOutputReader;
  private readonly zipBuilder: IZipArchiveBuilder;
  private readonly downloader: IFileDownloader;
  private readonly clock: IClock;
  private readonly fetchFn: typeof fetch;

  constructor(
    outputReader: IOutputReader,
    zipBuilder: IZipArchiveBuilder,
    downloader: IFileDownloader,
    clock: IClock,
    fetchFn: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    this.outputReader = outputReader;
    this.zipBuilder = zipBuilder;
    this.downloader = downloader;
    this.clock = clock;
    this.fetchFn = fetchFn;
  }

  async execute(): Promise<ZipExportResult> {
    const outputs = await this.outputReader.list();
    if (outputs.length === 0) {
      return { fileCount: 0, archiveName: '' };
    }

    const entries: ZipEntry[] = [];
    const usedNames = new Set<string>();
    const countsByInput = new Map<string, number>();

    for (const out of outputs) {
      let blob = out.blob;
      if (!blob && out.imageURL) {
        try {
          const response = await this.fetchFn(out.imageURL);
          if (response.ok) {
            blob = await response.blob();
          }
        } catch {
          continue;
        }
      }
      if (!blob) continue;

      const countForInput = (countsByInput.get(out.inputId) || 0) + 1;
      countsByInput.set(out.inputId, countForInput);

      const baseName = buildOutputFilename(out.inputName, countForInput, out.format, blob.type);
      const uniqueName = deduplicateFilename(baseName, usedNames);
      entries.push({ name: uniqueName, blob });
    }

    if (entries.length === 0) {
      return { fileCount: 0, archiveName: '' };
    }

    const zipBlob = await this.zipBuilder.buildZip(entries);
    const archiveName = buildZipArchiveFilename(this.clock.now());
    this.downloader.downloadBlob(zipBlob, archiveName);

    return {
      fileCount: entries.length,
      archiveName,
    };
  }
}
