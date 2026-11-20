export function sanitizeBaseName(filename: string | undefined): string {
  const clean = (filename || 'image')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 60);
  return clean || 'image';
}

export function formatExtension(format?: string, mime?: string): string {
  if (format) {
    const normalized = String(format).toLowerCase();
    return normalized === 'jpeg' ? 'jpg' : normalized;
  }
  if (mime && mime.includes('png')) return 'png';
  if (mime && mime.includes('webp')) return 'webp';
  return 'jpg';
}

export function buildOutputFilename(
  inputName: string,
  indexWithinInput: number,
  format?: string,
  mime?: string,
): string {
  const stem = sanitizeBaseName(inputName);
  const ext = formatExtension(format, mime);
  return `${stem}_edit_${indexWithinInput || 1}.${ext}`;
}

export function deduplicateFilename(name: string, usedNames: Set<string>): string {
  let candidate = name;
  let dup = 2;
  while (usedNames.has(candidate)) {
    const dot = name.lastIndexOf('.');
    if (dot > 0) {
      candidate = `${name.slice(0, dot)}_${dup}${name.slice(dot)}`;
    } else {
      candidate = `${name}_${dup}`;
    }
    dup++;
  }
  usedNames.add(candidate);
  return candidate;
}

export function buildZipArchiveFilename(timestampMs: number): string {
  const stamp = new Date(timestampMs).toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `runware-outputs-${stamp}.zip`;
}
