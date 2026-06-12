import ImageMarker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';

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

/**
 * Burns date/time (and optional job label) into the photo pixels.
 * Falls back to the original uri if stamping fails.
 */
export async function stampPhoto(uri: string, options: StampPhotoOptions): Promise<string> {
  const timeLine = formatCaptureDisplayTime(options.capturedAt);
  const labelLine = options.jobLabel?.trim();
  const text = labelLine ? `${timeLine}\n${labelLine}` : timeLine;

  try {
    const stampedUri = await ImageMarker.markText({
      backgroundImage: {
        src: uri,
        scale: 1,
      },
      watermarkTexts: [
        {
          text,
          position: {
            position: Position.bottomRight,
          },
          style: {
            color: '#FFFFFF',
            fontSize: 26,
            bold: true,
            shadowStyle: {
              dx: 2,
              dy: 2,
              radius: 4,
              color: '#000000',
            },
            textBackgroundStyle: {
              paddingX: 12,
              paddingY: 8,
              type: TextBackgroundType.stretchX,
              color: '#333333',
            },
          },
        },
      ],
      quality: 90,
      saveFormat: ImageFormat.jpg,
    });

    return stampedUri || uri;
  } catch (error) {
    console.warn('[photoWatermark] stamp failed, using original photo', error);
    return uri;
  }
}
