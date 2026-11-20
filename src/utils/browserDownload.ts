import type { IFileDownloader } from '../domain/ports/export';

export class BrowserFileDownloader implements IFileDownloader {
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
