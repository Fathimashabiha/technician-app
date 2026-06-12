import * as Location from 'expo-location';

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  /** Human-readable place name, e.g. "Business Bay, Dubai, UAE". */
  address: string;
};

export class AttendanceLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceLocationError';
  }
}

function uniqueParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function buildPlaceName(place: Location.LocationGeocodedAddress): string {
  const street = [place.streetNumber, place.street].filter(Boolean).join(' ').trim();
  const locality = place.city || place.subregion || place.district;
  const region = place.region;
  const country = place.country;
  const area = place.district || place.name;

  const detailed = uniqueParts([
    place.name && place.name !== street && place.name !== locality ? place.name : undefined,
    street || undefined,
    area && area !== locality ? area : undefined,
    locality || undefined,
    region && region !== locality ? region : undefined,
    country && country !== locality && country !== region ? country : undefined,
  ]);

  if (detailed.length > 0) {
    return detailed.join(', ');
  }

  const minimal = uniqueParts([locality, region, country]);
  return minimal.join(', ');
}

async function resolvePlaceName(
  latitude: number,
  longitude: number,
): Promise<string> {
  let results: Location.LocationGeocodedAddress[];
  try {
    results = await Location.reverseGeocodeAsync({ latitude, longitude });
  } catch {
    throw new AttendanceLocationError(
      'Could not determine your area name. Check your internet connection and try again.',
    );
  }

  if (!results.length) {
    throw new AttendanceLocationError(
      'Could not determine your area name. Move to an open area and try again.',
    );
  }

  let bestName = '';
  for (const place of results) {
    const name = buildPlaceName(place);
    if (name.length > bestName.length) {
      bestName = name;
    }
  }

  if (!bestName) {
    throw new AttendanceLocationError(
      'Could not determine your area name. Move to an open area and try again.',
    );
  }

  return bestName;
}

export function formatAttendanceLocationName(
  location: Pick<AttendanceLocation, 'address'>,
): string {
  return location.address.trim();
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
  const address = await resolvePlaceName(latitude, longitude);

  return {
    latitude,
    longitude,
    accuracy: accuracy ?? undefined,
    address,
  };
}
