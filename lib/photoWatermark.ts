import { Image } from 'react-native';
import ImageMarker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';
import { ensureUploadableFileUri, normalizeFileUri } from './mediaUpload';

export function formatCaptureDisplayTime(date: Date): string {
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export type StampPhotoOptions = {
  capturedAt: Date;
  jobLabel?: string;
};

async function readImageHeight(uri: string): Promise<number> {
  const normalized = normalizeFileUri(uri);
  return new Promise((resolve) => {
    Image.getSize(
      normalized,
      (_width, height) => resolve(height > 0 ? height : 1920),
      () => resolve(1920),
    );
  });
}

/** Scale stamp text to photo resolution (~6% of image height, readable without zoom). */
function watermarkMetrics(imageHeight: number) {
  const fontSize = Math.round(Math.min(200, Math.max(96, imageHeight * 0.06)));
  return {
    fontSize,
    paddingX: Math.round(fontSize * 0.5),
    paddingY: Math.round(fontSize * 0.32),
  };
}

/**
 * Burns date/time into the photo pixels (job id stays in DB metadata only).
 * Falls back to the original uri if stamping fails.
 */
export async function stampPhoto(uri: string, options: StampPhotoOptions): Promise<string> {
  const text = formatCaptureDisplayTime(options.capturedAt);
  const normalized = normalizeFileUri(uri);

  try {
    const imageHeight = await readImageHeight(normalized);
    const { fontSize, paddingX, paddingY } = watermarkMetrics(imageHeight);

    const stampedUri = await ImageMarker.markText({
      backgroundImage: {
        src: normalized,
        scale: 1,
      },
      watermarkTexts: [
        {
          text,
          position: {
            position: Position.bottomCenter,
          },
          style: {
            color: '#FFFFFF',
            fontSize,
            bold: true,
            textAlign: 'center',
            shadowStyle: {
              dx: 0,
              dy: 2,
              radius: 10,
              color: '#000000',
            },
            textBackgroundStyle: {
              paddingX,
              paddingY,
              type: TextBackgroundType.stretchX,
              color: '#000000',
            },
          },
        },
      ],
      quality: 92,
      saveFormat: ImageFormat.jpg,
    });

    const stamped = stampedUri || normalized;
    return ensureUploadableFileUri(normalizeFileUri(stamped), 'jpg');
  } catch (error) {
    console.warn('[photoWatermark] stamp failed, using original photo', error);
    try {
      return await ensureUploadableFileUri(normalized, 'jpg');
    } catch {
      return normalized;
    }
  }
}
