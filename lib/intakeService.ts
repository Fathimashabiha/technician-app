import { apiRequest } from './api';
import { lookupAssetByScan } from './assetService';
import { lookupLocationByScan } from './locationService';
import {
  getLocalPendingIntakeRequests,
  pruneLocalPendingIntakeRequests,
  saveLocalPendingIntakeRequest,
} from './pendingRequestsStorage';
import { getTechnicianId } from './technicianSession';
import { fetchWorkOrders } from './workOrderService';
import type { IntakeRequestItem } from './types/intakeRequest';
import type { WorkOrder } from './types/workOrder';

export type { IntakeRequestItem };

export type IntakeResolveResult = {
  token: string;
  tokenType: 'location' | 'asset';
  label?: string | null;
  context: Record<string, unknown>;
};

export type ScanPreview = {
  scanToken: string;
  tokenType: 'location' | 'asset';
  label: string;
  property: string;
  location: string;
};

function formatContextLocation(ctx: Record<string, unknown>): string {
  const hierarchy = String(ctx.locationHierarchy ?? '').trim();
  if (hierarchy) return hierarchy;
  const parts = [ctx.building, ctx.floor, ctx.zone, ctx.locationDescription]
    .map((p) => (p ? String(p).trim() : ''))
    .filter(Boolean);
  return parts.join(', ') || String(ctx.property ?? '—');
}

export async function resolveIntakeScan(token: string): Promise<IntakeResolveResult | null> {
  const needle = token.trim();
  if (!needle) return null;

  try {
    return await apiRequest<IntakeResolveResult>(
      `/work-orders/intake/resolve?token=${encodeURIComponent(needle)}`
    );
  } catch {
    return null;
  }
}

/** Resolve scan for create-WO preview (intake QR first, then asset barcode for asset scope). */
export async function previewScanForWorkOrder(
  scannedValue: string,
  scope: 'asset' | 'location'
): Promise<ScanPreview> {
  const scanToken = scannedValue.trim();
  if (!scanToken) {
    throw new Error('Enter or scan a QR code');
  }

  const intake = await resolveIntakeScan(scanToken);
  if (intake) {
    if (scope === 'location' && intake.tokenType !== 'location') {
      throw new Error('This code is for an asset. Switch to Asset or scan a location QR.');
    }
    if (scope === 'asset' && intake.tokenType !== 'asset') {
      throw new Error('This code is for a location. Switch to Location or scan an asset QR.');
    }

    const ctx = intake.context;
    const label =
      String(intake.label ?? '').trim() ||
      (intake.tokenType === 'asset'
        ? String(ctx.asset ?? 'Asset')
        : formatContextLocation(ctx));

    return {
      scanToken: intake.token,
      tokenType: intake.tokenType,
      label,
      property: String(ctx.property ?? '—'),
      location: formatContextLocation(ctx),
    };
  }

  if (scope === 'location') {
    const location = await lookupLocationByScan(scanToken);
    if (!location) {
      throw new Error(
        'Location QR not recognized. Scan a contract-service location QR (LQR-…) from the FM webapp.'
      );
    }

    return {
      scanToken: location.qrCode || scanToken,
      tokenType: 'location',
      label: location.name,
      property: location.portfolio || location.name,
      location: [location.portfolio, location.address, location.city].filter(Boolean).join(' → '),
    };
  }

  const asset = await lookupAssetByScan(scanToken);
  if (!asset) {
    throw new Error('Asset not found. Scan an intake QR or a registered asset barcode.');
  }

  return {
    scanToken,
    tokenType: 'asset',
    label: asset.name,
    property: asset.location.split(' → ')[0] ?? asset.location,
    location: asset.location,
  };
}

export type CreateWorkOrderFromScanInput = {
  scope: 'asset' | 'location';
  scanToken: string;
  title: string;
  description: string;
  woType: string;
  category: string;
};

export type CreateWorkOrderFromScanResult = {
  workOrderId: string;
  id: string;
  title: string;
  status: string;
};

function formatSubmittedAt(value: unknown): string {
  if (!value) return new Date().toLocaleDateString();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeIntakeRequestRow(row: unknown): IntakeRequestItem | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = String(r.id ?? r.workOrderId ?? r.workOrderRef ?? '').trim();
  if (!id) return null;

  return {
    id,
    title: String(r.title ?? 'Work order request'),
    type: String(r.type ?? r.woType ?? 'Reactive'),
    category: String(r.category ?? r.issueCategory ?? 'General'),
    status: String(r.status ?? 'Pending Approval'),
    submittedAt: formatSubmittedAt(r.submittedAt ?? r.createdAt ?? r.dueDate),
    location: r.location ? String(r.location) : undefined,
    description: r.description ? String(r.description) : undefined,
  };
}

function workOrderToIntakeItem(wo: WorkOrder): IntakeRequestItem {
  return {
    id: wo.id,
    title: wo.title,
    type: wo.type,
    category: wo.type,
    status: wo.status,
    submittedAt: wo.dueDate || new Date().toLocaleDateString(),
    location: wo.location,
    description: wo.description,
  };
}

function isPendingApprovalStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'pending approval' ||
    normalized === 'pending_approval' ||
    normalized === 'awaiting approval' ||
    normalized === 'submitted'
  );
}

export async function createWorkOrderFromScan(
  input: CreateWorkOrderFromScanInput
): Promise<CreateWorkOrderFromScanResult> {
  const result = await apiRequest<CreateWorkOrderFromScanResult>('/work-orders/intake-request', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      technicianId: getTechnicianId(),
    }),
  });

  const workOrderId = result.workOrderId || result.id;
  await saveLocalPendingIntakeRequest({
    id: workOrderId,
    title: result.title || input.title,
    type: input.woType,
    category: input.category,
    status: result.status || 'Pending Approval',
    submittedAt: formatSubmittedAt(new Date().toISOString()),
    description: input.description,
  });

  return result;
}

export async function fetchMyIntakeRequests(): Promise<IntakeRequestItem[]> {
  const byId = new Map<string, IntakeRequestItem>();

  const merge = (items: IntakeRequestItem[]) => {
    for (const item of items) {
      if (item.id) byId.set(item.id, item);
    }
  };

  merge(await getLocalPendingIntakeRequests());

  try {
    const workOrders = await fetchWorkOrders();
    const pending = workOrders.filter((wo) => isPendingApprovalStatus(wo.status));
    const noLongerPending = workOrders
      .filter((wo) => !isPendingApprovalStatus(wo.status))
      .map((wo) => wo.id);
    await pruneLocalPendingIntakeRequests(noLongerPending);
    merge(pending.map(workOrderToIntakeItem));
  } catch {
    // Tasks API unavailable — keep local cache
  }

  try {
    const technicianId = getTechnicianId();
    const params = new URLSearchParams({ technicianId });
    const raw = await apiRequest<unknown>(`/work-orders/my-requests?${params.toString()}`);
    const rows = Array.isArray(raw) ? raw : [];
    const normalized = rows
      .map(normalizeIntakeRequestRow)
      .filter((row): row is IntakeRequestItem => row !== null);
    merge(normalized);
  } catch {
    // Optional endpoint — local + work-order list still populate the screen
  }

  return Array.from(byId.values()).sort((a, b) =>
    (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')
  );
}
