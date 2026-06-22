import {
  cacheDirectory,
  copyAsync,
  documentDirectory,
  getInfoAsync,
} from 'expo-file-system/legacy';

/** React Native FormData requires a readable file:// or content:// URI on device. */
export function normalizeFileUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

/**
 * Copy media into app cache with a stable file:// URI for multipart upload.
 * image-marker and some camera paths return bare paths that fail with "Network request failed".
 */
export async function ensureUploadableFileUri(
  uri: string,
  ext: 'jpg' | 'mp4' | 'm4a' = 'jpg',
): Promise<string> {
  const normalized = normalizeFileUri(uri);
  const info = await getInfoAsync(normalized);
  if (!info.exists) {
    throw new Error('Media file is missing on device. Please capture again.');
  }

  const base = cacheDirectory ?? documentDirectory;
  if (!base) {
    return normalized;
  }

  const dest = `${base}evidence-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await copyAsync({ from: normalized, to: dest });
  return dest;
}

export function evidenceUploadName(item: {
  id: string;
  type: string;
  fileName?: string;
}): string {
  const name = item.fileName?.trim();
  if (name && name.includes('.')) return name;
  if (item.type === 'video') return `video-${item.id}.mp4`;
  if (item.type === 'audio') return `audio-${item.id}.m4a`;
  return `photo-${item.id}.jpg`;
}

export function evidenceUploadMime(type: string): string {
  if (type === 'video') return 'video/mp4';
  if (type === 'audio') return 'audio/m4a';
  return 'image/jpeg';
}

export type EvidenceUploadFile = { uri: string; name: string; type: string };

export async function prepareEvidenceUploadFiles(
  evidence: Array<Record<string, unknown>> | undefined,
): Promise<EvidenceUploadFile[]> {
  if (!evidence?.length) return [];

  const prepared: EvidenceUploadFile[] = [];
  for (const item of evidence) {
    if (typeof item?.uri !== 'string' || !item.uri.trim()) continue;

    const mediaType =
      item.type === 'video' ? 'video' : item.type === 'audio' ? 'audio' : 'photo';
    const ext = mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'm4a' : 'jpg';
    const uri = await ensureUploadableFileUri(String(item.uri), ext);

    prepared.push({
      uri: normalizeFileUri(uri),
      name: evidenceUploadName({
        id: String(item.id ?? Date.now()),
        type: mediaType,
        fileName: typeof item.fileName === 'string' ? item.fileName : undefined,
      }),
      type: evidenceUploadMime(mediaType),
    });
  }
  return prepared;
}
