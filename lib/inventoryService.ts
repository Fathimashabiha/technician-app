import { apiRequest } from './api';
import { getTechnicianId } from './technicianSession';

/** Matches backend van-stock row (also compatible with UI InventoryItem). */
import type { InventoryItem } from './types/inventory';

export type VanStockItem = InventoryItem;
export type { InventoryItem };

/** Catalog row for request/return part pickers. */
export type InventoryCatalogItem = {
  id: string;
  name: string;
  partNumber: string;
  unit: string;
  availableStock: number;
  source: 'catalog' | 'van';
};

export type PartReturnReason =
  | 'Unused'
  | 'Defective'
  | 'Wrong Part'
  | 'Job Cancelled'
  | 'Other';

export type PartReturnRecord = {
  id: string;
  lines: Array<{
    itemId: string;
    name: string;
    partNumber: string;
    quantity: number;
    unit: string;
  }>;
  reason: PartReturnReason;
  destination: string;
  workOrderId?: string;
  notes?: string;
  status: 'Pending' | 'Received' | 'Rejected';
  createdAt: string;
};

export type PartRequestLine = {
  partRef?: string;
  name: string;
  partNumber?: string;
  quantity: number;
  requestedQuantity?: number;
  issuedQuantity?: number;
};

export type PartRequestRecord = {
  id: string;
  status: string;
  statusLabel?: string;
  urgency: 'Low' | 'Medium' | 'High';
  notes?: string;
  workOrderRef?: string;
  lines: PartRequestLine[];
  requestedTotal?: number;
  issuedTotal?: number;
  rejectionReason?: string;
  createdAt: string;
};

export async function fetchInventoryCatalog(
  options?: { purpose?: 'request' | 'return'; search?: string },
  technicianId: string = getTechnicianId()
): Promise<InventoryCatalogItem[]> {
  const params = new URLSearchParams({ technicianId });
  if (options?.purpose) params.set('purpose', options.purpose);
  if (options?.search?.trim()) params.set('search', options.search.trim());
  return apiRequest(`/external/inventory/catalog?${params.toString()}`);
}

export async function fetchVanStock(
  technicianId: string = getTechnicianId(),
  options?: { search?: string; stockHealth?: string }
): Promise<VanStockItem[]> {
  const params = new URLSearchParams({ technicianId });
  if (options?.search) params.set('search', options.search);
  if (options?.stockHealth && options.stockHealth !== 'All') {
    params.set('stockHealth', options.stockHealth);
  }
  return apiRequest(`/external/inventory/van-stock?${params.toString()}`);
}

export async function submitPartRequest(body: {
  urgency: 'Low' | 'Medium' | 'High';
  notes?: string;
  workOrderRef?: string;
  lines: Array<{
    partRef?: string;
    name: string;
    partNumber?: string;
    quantity: number;
  }>;
}): Promise<unknown> {
  return apiRequest('/external/inventory/requests', {
    method: 'POST',
    body: JSON.stringify({
      technicianId: getTechnicianId(),
      ...body,
    }),
  });
}

export async function submitPartReturn(body: {
  reason: PartReturnReason;
  destination: string;
  workOrderRef?: string;
  notes?: string;
  lines: Array<{ itemId: string; quantity: number }>;
}): Promise<PartReturnRecord> {
  return apiRequest('/external/inventory/returns', {
    method: 'POST',
    body: JSON.stringify({
      technicianId: getTechnicianId(),
      ...body,
    }),
  });
}

export async function fetchPartReturns(
  technicianId: string = getTechnicianId(),
  status?: string
): Promise<PartReturnRecord[]> {
  const params = new URLSearchParams({ technicianId });
  if (status) params.set('status', status);
  return apiRequest(`/external/inventory/returns?${params.toString()}`);
}

export async function fetchPartRequests(
  technicianId: string = getTechnicianId()
): Promise<PartRequestRecord[]> {
  const params = new URLSearchParams({ technicianId });
  return apiRequest(`/external/inventory/requests?${params.toString()}`);
}
