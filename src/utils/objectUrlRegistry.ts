import type { IObjectUrlRegistry } from '../domain/ports/export';

export class ObjectUrlRegistry implements IObjectUrlRegistry {
  private readonly urls = new Map<string, string>();

  acquire(id: string, blob?: Blob | null, fallbackUrl?: string): string {
    if (!blob) return fallbackUrl || '';
    const existing = this.urls.get(id);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    this.urls.set(id, url);
    return url;
  }

  release(id: string): void {
    const existing = this.urls.get(id);
    if (existing) {
      URL.revokeObjectURL(existing);
      this.urls.delete(id);
    }
  }

  releaseAll(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }
}
