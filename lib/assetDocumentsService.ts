import { apiRequest } from './api';
import type { AssetChecklistItem, AssetManual } from './types/assetDocuments';

export async function fetchAssetManuals(assetRef: string): Promise<AssetManual[]> {
  return apiRequest(`/external/asset/${encodeURIComponent(assetRef)}/manuals`);
}

export async function fetchAssetChecklist(assetRef: string): Promise<AssetChecklistItem[]> {
  return apiRequest(`/external/asset/${encodeURIComponent(assetRef)}/checklist`);
}

export type { AssetManual, AssetChecklistItem };
