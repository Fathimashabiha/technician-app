import { apiRequest } from './api';
import type { Asset } from './types/asset';

export type ExternalAsset = Record<string, unknown>;

function formatLocation(record: ExternalAsset): string {
  const loc = record.location;
  if (typeof loc === 'string' && loc.trim()) return loc;
  if (loc && typeof loc === 'object') {
    const parts = [
      (loc as Record<string, string>).building,
      (loc as Record<string, string>).floor,
      (loc as Record<string, string>).zone,
      (loc as Record<string, string>).room,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' → ');
  }
  const portfolio = record.portfolio ?? record.property;
  if (portfolio) return String(portfolio);
  return '—';
}

function mapAssetStatus(value: unknown): Asset['status'] {
  const raw = String(value ?? 'Active');
  if (raw === 'Under Maintenance') return 'Under Repair';
  if (raw === 'Inactive' || raw === 'Disposed' || raw === 'Retired') return 'Inactive';
  return 'Active';
}

export function mapExternalAssetToApp(record: ExternalAsset): Asset {
  const id = String(record.assetId ?? record.id ?? '');
  return {
    id,
    name: String(record.name ?? 'Asset'),
    location: formatLocation(record),
    type: String(record.assetType ?? record.category ?? 'Equipment'),
    lastService: String(record.lastServiceDate ?? record.lastService ?? '—'),
    nextService: String(record.nextServiceDate ?? record.nextService ?? '—'),
    status: mapAssetStatus(record.status),
    openWOs: Number(record.openWorkOrders ?? record.openWOs ?? 0),
    serialNumber: String(record.serialNumber ?? record.qrCode ?? id),
    manufacturer: String(record.manufacturer ?? '—'),
    installationDate: String(record.installationDate ?? '—'),
    warrantyExpiry: String(record.warrantyExpiry ?? '—'),
    criticality: (['Critical', 'Major', 'Minor'].includes(String(record.criticality))
      ? record.criticality
      : 'Major') as Asset['criticality'],
    slaTier: String(record.slaTier ?? 'Standard'),
    slaPolicy: {
      response: String(
        (record.slaPolicy as { response?: string })?.response ?? record.responseTime ?? '—'
      ),
      resolution: String(
        (record.slaPolicy as { resolution?: string })?.resolution ??
          record.resolutionTime ??
          '—'
      ),
    },
  };
}

export async function fetchExternalAsset(assetRef: string): Promise<Asset> {
  const record = await apiRequest<Asset | ExternalAsset>(
    `/external/asset/${encodeURIComponent(assetRef)}?format=app`
  );
  if (record && typeof record === 'object' && 'name' in record && 'location' in record) {
    return record as Asset;
  }
  return mapExternalAssetToApp(record as ExternalAsset);
}

/** List assets from sz-asset-service via technician-service (app-shaped). */
export async function fetchAssets(): Promise<Asset[]> {
  return apiRequest<Asset[]>('/external/assets?format=app');
}

/** @deprecated use fetchAssets */
export async function fetchExternalAssets(): Promise<Asset[]> {
  return fetchAssets();
}

export async function lookupAssetByScan(scannedValue: string): Promise<Asset | null> {
  const needle = scannedValue.trim();
  if (!needle) return null;

  try {
    return await apiRequest<Asset>(
      `/external/asset/lookup/${encodeURIComponent(needle)}?format=app`
    );
  } catch {
    return null;
  }
}

export { fetchAssetManuals, fetchAssetChecklist } from './assetDocumentsService';
export type { AssetManual, AssetChecklistItem } from './types/assetDocuments';

/** Resolve scanned QR/barcode to an asset id via sz-asset-service. */
export async function resolveAssetFromScan(scannedValue: string): Promise<string | null> {
  const needle = scannedValue.trim();
  if (!needle) return null;

  const fromLookup = await lookupAssetByScan(needle);
  if (fromLookup?.id) return fromLookup.id;

  try {
    const asset = await fetchExternalAsset(needle);
    return asset.id || null;
  } catch {
    return null;
  }
}

export type { Asset };
