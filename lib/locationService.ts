import { apiRequest } from './api';
import { normalizeLocationScanCode } from './normalizeLocationScanCode';
import type { Location } from './types/location';

export type ExternalLocation = Record<string, unknown>;

export function mapExternalLocationToApp(record: ExternalLocation): Location {
  const locationId = String(record.locationId ?? record.id ?? '');
  const id = locationId || String(record.id ?? '');

  return {
    id,
    locationId,
    qrCode: String(record.qrCode ?? ''),
    name: String(record.name ?? 'Location'),
    address: String(record.address ?? '—'),
    city: String(record.city ?? '—'),
    portfolio: String(record.portfolio ?? '—'),
    propertyType: String(record.propertyType ?? '—'),
    totalFloors: String(record.totalFloors ?? '—'),
    areaSqft: String(record.areaSqft ?? '—'),
    accessMode: String(record.accessMode ?? '—'),
    logisticsNotes: String(record.logisticsNotes ?? ''),
    responsibleName: String(record.responsibleName ?? '—'),
    responsibleContact: String(record.responsibleContact ?? '—'),
    status: (['Active', 'Under Review', 'Inactive'].includes(String(record.status))
      ? record.status
      : 'Active') as Location['status'],
    workOrders: Number(record.workOrders ?? 0),
    contracts: Number(record.contracts ?? 0),
  };
}

export async function fetchExternalLocation(locationRef: string): Promise<Location> {
  const record = await apiRequest<Location | ExternalLocation>(
    `/external/location/${encodeURIComponent(locationRef)}?format=app`
  );
  if (record && typeof record === 'object' && 'name' in record && 'address' in record) {
    return record as Location;
  }
  return mapExternalLocationToApp(record as ExternalLocation);
}

export async function lookupLocationByScan(scannedValue: string): Promise<Location | null> {
  const needle = normalizeLocationScanCode(scannedValue);
  if (!needle) return null;

  try {
    return await apiRequest<Location>(
      `/external/location/lookup/${encodeURIComponent(needle)}?format=app`
    );
  } catch {
    return null;
  }
}

export async function resolveLocationFromScan(scannedValue: string): Promise<string | null> {
  const needle = scannedValue.trim();
  if (!needle) return null;

  const fromLookup = await lookupLocationByScan(needle);
  if (fromLookup?.id) return fromLookup.id;

  try {
    const location = await fetchExternalLocation(needle);
    return location.id || null;
  } catch {
    return null;
  }
}

export type { Location };
