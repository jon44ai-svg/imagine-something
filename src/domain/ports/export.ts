export interface ZipEntry {
  name: string;
  blob: Blob;
}

export interface IZipArchiveBuilder {
  buildZip(entries: readonly ZipEntry[]): Promise<Blob>;
}

export interface IFileDownloader {
  downloadBlob(blob: Blob, filename: string): void;
  openExternal(url: string): void;
}

export interface IObjectUrlRegistry {
  acquire(id: string, blob?: Blob | null, fallbackUrl?: string): string;
  release(id: string): void;
  releaseAll(): void;
}
