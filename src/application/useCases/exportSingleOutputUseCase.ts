import type { OutputRecord } from '../../domain/models';
import type { IFileDownloader } from '../../domain/ports/export';
import type { IOutputReader } from '../../domain/ports/storage';
import { buildOutputFilename } from '../../utils/filename';

export class ExportSingleOutputUseCase {
  private readonly outputReader: IOutputReader;
  private readonly downloader: IFileDownloader;

  constructor(outputReader: IOutputReader, downloader: IFileDownloader) {
    this.outputReader = outputReader;
    this.downloader = downloader;
  }

  async execute(output: OutputRecord): Promise<void> {
    const siblings = await this.outputReader.listByInputId(output.inputId);
    const idx = Math.max(1, siblings.findIndex((item) => item.id === output.id) + 1);
    const filename = buildOutputFilename(
      output.inputName,
      idx,
      output.format,
      output.blob?.type,
    );

    if (output.blob) {
      this.downloader.downloadBlob(output.blob, filename);
    } else if (output.imageURL) {
      this.downloader.openExternal(output.imageURL);
    }
  }
}
