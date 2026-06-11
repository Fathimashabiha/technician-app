import * as Location from 'expo-location';

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
};

export class AttendanceLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceLocationError';
  }
}

async function resolveAddress(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results[0];
    if (!place) return undefined;

    const parts = [
      place.name,
      place.street,
      place.city,
      place.region,
      place.country,
    ].filter((part): part is string => !!part?.trim());

    return parts.length > 0 ? parts.join(', ') : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchAttendanceLocation(): Promise<AttendanceLocation> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new AttendanceLocationError(
      'Location services are turned off. Enable GPS to check in or check out.',
    );
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new AttendanceLocationError(
      'Location permission is required to check in or check out.',
    );
  }

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    throw new AttendanceLocationError(
      'Could not get your current location. Move to an open area and try again.',
    );
  }

  const { latitude, longitude, accuracy } = position.coords;
  const address = await resolveAddress(latitude, longitude);

  return {
    latitude,
    longitude,
    accuracy: accuracy ?? undefined,
    address,
  };
}
