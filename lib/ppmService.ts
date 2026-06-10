import { apiRequest, API_URL } from './api';
import { getTechnicianId, getTechnicianSession, getAuthToken } from './technicianSession';

export type PpmSchedule = {
  id: string;
  title: string;
  ppmCode?: string;
  status: string;
  scheduledDate?: string;
  dueDate: string;
  completedAt?: string;
  assetId?: string;
};

type PpmScheduleRow = {
  id?: string;
  title?: string;
  ppmCode?: string;
  ppm_code?: string;
  status?: string;
  scheduled_date?: string;
  scheduledDate?: string;
  due_date?: string;
  dueDate?: string;
  completed_at?: string;
  completedAt?: string;
  asset_id?: string;
  assetId?: string;
};

function mapPpmScheduleRow(row: PpmScheduleRow): PpmSchedule {
  const completedRaw = row.completed_at ?? row.completedAt;
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? 'PPM Task'),
    ppmCode: row.ppmCode ?? row.ppm_code ?? undefined,
    status: String(row.status ?? 'Scheduled'),
    scheduledDate: row.scheduled_date ?? row.scheduledDate ?? undefined,
    dueDate: scheduleDueDate(row),
    completedAt: typeof completedRaw === 'string' ? completedRaw : undefined,
    assetId: row.assetId ?? row.asset_id ?? undefined,
  };
}

async function fetchPpmSchedulesForTechnician(pathSuffix: string): Promise<PpmScheduleRow[]> {
  const technicianId = getTechnicianId();
  const rowsById = await apiRequest<PpmScheduleRow[]>(
    `/external/ppm/schedule/technician/${encodeURIComponent(technicianId)}${pathSuffix}`
  );

  let rows = Array.isArray(rowsById) ? rowsById : [];
  if (rows.length === 0) {
    const technicianName = getTechnicianSession()?.name?.trim();
    if (technicianName && technicianName !== technicianId) {
      const rowsByName = await apiRequest<PpmScheduleRow[]>(
        `/external/ppm/schedule/technician/${encodeURIComponent(technicianName)}${pathSuffix}`
      );
      rows = Array.isArray(rowsByName) ? rowsByName : [];

      if (rows.length === 0) {
        const rowsByNameDot = await apiRequest<PpmScheduleRow[]>(
          `/external/ppm/schedule/technician/${encodeURIComponent(technicianName + '.')}${pathSuffix}`
        );
        rows = Array.isArray(rowsByNameDot) ? rowsByNameDot : [];
      }
    }
  }

  return rows;
}

function scheduleDueDate(row: PpmScheduleRow): string {
  const raw =
    row.due_date ??
    row.dueDate ??
    row.scheduled_date ??
    row.scheduledDate ??
    '';
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'toISOString' in raw) {
    return (raw as Date).toISOString();
  }
  return String(raw ?? '');
}

/** Normalize any API date string to YYYY-MM-DD for comparisons. */
export function toDateKey(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/** Calendar date (YYYY-MM-DD) from API due/scheduled string. */
export function dueDateKey(iso: string): string {
  return toDateKey(iso) ?? iso.slice(0, 10);
}

/** True when due date is missing (show in today) or matches the given day key. */
export function isDueOnDate(dueDate: string | undefined | null, dayKey: string): boolean {
  if (!dueDate?.trim()) return true;
  const key = toDateKey(dueDate);
  return key === dayKey;
}

const TERMINAL_PPM_STATUSES = new Set(['COMPLETED', 'PENDING_REVIEW', 'CANCELLED']);

export function isOpenPpmSchedule(status: string): boolean {
  return !TERMINAL_PPM_STATUSES.has(String(status ?? '').toUpperCase());
}

export type PpmStatusTab = 'all' | 'assigned' | 'in_progress';

export function normalizePpmStatus(status: string): string {
  return String(status ?? '').toUpperCase();
}

export function matchesPpmStatusTab(schedule: PpmSchedule, tab: PpmStatusTab): boolean {
  const status = normalizePpmStatus(schedule.status);
  if (tab === 'assigned') return status === 'SCHEDULED';
  if (tab === 'in_progress') return status === 'IN_PROGRESS';
  return true;
}

export function ppmStatusForBadge(status: string): string {
  const u = normalizePpmStatus(status);
  if (u === 'IN_PROGRESS') return 'In Progress';
  if (u === 'SCHEDULED') return 'Assigned';
  return status;
}

/** PPM schedule history for one asset (all statuses). */
export async function listAssetPpmSchedules(assetId: string): Promise<PpmSchedule[]> {
  const rows = await apiRequest<PpmScheduleRow[]>(
    `/external/ppm/schedule/asset/${encodeURIComponent(assetId)}`
  );
  const list = Array.isArray(rows) ? rows : [];
  return list.map(mapPpmScheduleRow);
}

/** Completed / pending-review PPM schedules for the signed-in technician. */
export async function listCompletedPpmSchedules(): Promise<PpmSchedule[]> {
  const rows = await fetchPpmSchedulesForTechnician('/completed');
  return rows.map(mapPpmScheduleRow);
}

export async function listMyPpmSchedules(): Promise<PpmSchedule[]> {
  const rows = await fetchPpmSchedulesForTechnician('');
  return rows.map(mapPpmScheduleRow);
}

// ─── Execution types ────────────────────────────────────────────────────────

export type ChecklistItem = {
  id: string;
  description: string;
  frequency?: string;
  isMandatory: boolean;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  remarks?: string;
  completedAt?: string;
};

export type PpmScheduleDetail = {
  id: string;
  title: string;
  status: string;
  scheduledDate?: string;
  dueDate: string;
  scope?: 'asset' | 'location';
  assetId?: string;
  assetName?: string;
  locationId?: string;
  locationName?: string;
  locationRef?: string;
  checklistItems?: ChecklistItem[];
  beforePhotos?: { url: string; note?: string }[];
  afterPhotos?: { url: string; note?: string }[];
  partsUsed?: { partId: string; quantity: number; name?: string }[];
  signature?: { signatureUrl: string; signedBy: string; signedAt: string };
  executionState?: {
    workflowSteps: string[];
    currentStepIndex: number;
    currentStepId: string | null;
    assetVerified: boolean;
    onHold?: boolean;
    onHoldReason?: string | null;
    onHoldAt?: string | null;
  };
};

function normalizePpmScheduleDetail(raw: Record<string, unknown>): PpmScheduleDetail {
  const master = raw.ppmMaster as Record<string, unknown> | undefined;
  const assetId =
    (raw.assetId as string | undefined) ??
    (raw.asset_id as string | undefined) ??
    (master?.assetId as string | undefined) ??
    (master?.asset_id as string | undefined);
  const assetName =
    (raw.assetName as string | undefined) ??
    (raw.asset_name as string | undefined) ??
    (master?.title as string | undefined);
  const locationName =
    (raw.locationName as string | undefined) ??
    (master?.assetCategory as string | undefined) ??
    (master?.asset_category as string | undefined);
  const scope = assetId?.trim()
    ? 'asset'
    : ((raw.scope as 'asset' | 'location' | undefined) ?? 'location');

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? master?.title ?? 'PPM Task'),
    status: String(raw.status ?? 'SCHEDULED'),
    scheduledDate: (raw.scheduledDate ?? raw.scheduled_date) as string | undefined,
    dueDate: String(raw.dueDate ?? raw.due_date ?? ''),
    scope,
    assetId,
    assetName,
    locationId: (raw.locationId as string | undefined) ?? undefined,
    locationName: scope === 'location' ? locationName : undefined,
    locationRef:
      scope === 'location'
        ? String(raw.locationRef ?? raw.locationId ?? locationName ?? '').trim() || undefined
        : undefined,
    checklistItems: raw.checklistItems as PpmScheduleDetail['checklistItems'],
    beforePhotos: raw.beforePhotos as PpmScheduleDetail['beforePhotos'],
    afterPhotos: raw.afterPhotos as PpmScheduleDetail['afterPhotos'],
    partsUsed: raw.partsUsed as PpmScheduleDetail['partsUsed'],
    signature: raw.signature as PpmScheduleDetail['signature'],
    executionState: raw.executionState as PpmScheduleDetail['executionState'],
  };
}

// ─── Execution API ───────────────────────────────────────────────────────────

export async function getPpmScheduleDetail(scheduleId: string): Promise<PpmScheduleDetail | null> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/external/ppm/schedule/item/${encodeURIComponent(scheduleId)}`
  );
  if (!raw) return null;
  return normalizePpmScheduleDetail(raw);
}

export async function holdPpmExecution(scheduleId: string, reason: string): Promise<void> {
  await apiRequest<unknown>(
    `/external/ppm/execution/${encodeURIComponent(scheduleId)}/hold`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

export async function resumePpmExecution(scheduleId: string): Promise<void> {
  await apiRequest<unknown>(
    `/external/ppm/execution/${encodeURIComponent(scheduleId)}/resume`,
    { method: 'POST' }
  );
}

export async function startPpmExecution(scheduleId: string): Promise<void> {
  await apiRequest<unknown>(
    `/external/ppm/execution/${encodeURIComponent(scheduleId)}/start`,
    { method: 'POST' }
  );
}

export async function completePpmStep(
  scheduleId: string,
  stepId: string,
  payload: Record<string, unknown>,
  files?: Array<{ uri: string; name: string; type: string }>
): Promise<PpmScheduleDetail> {
  const isMedia = stepId === 'before_photos' || stepId === 'after_photos';
  const url = `${API_URL}/external/ppm/execution/${encodeURIComponent(scheduleId)}/cycle/steps/${encodeURIComponent(stepId)}`;
  const token = getAuthToken();

  if (isMedia && files && files.length > 0) {
    const form = new FormData();
    form.append('technicianId', getTechnicianId());
    form.append('payload', JSON.stringify(payload));
    for (const f of files) {
      form.append('files', { uri: f.uri, name: f.name, type: f.type } as any);
    }
    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json() as { ok: boolean; data?: PpmScheduleDetail; error?: string };
    if (!json.ok) throw new Error(json.error ?? 'Upload failed');
    return json.data as PpmScheduleDetail;
  }

  const result = await apiRequest<PpmScheduleDetail>(
    `/external/ppm/execution/${encodeURIComponent(scheduleId)}/cycle/steps/${encodeURIComponent(stepId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ technicianId: getTechnicianId(), payload }),
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return result as PpmScheduleDetail;
}

export async function updatePpmChecklistItem(
  scheduleId: string,
  itemId: string,
  status: 'PASSED' | 'FAILED',
  remarks?: string
): Promise<void> {
  await apiRequest<unknown>(
    `/external/ppm/execution/${encodeURIComponent(scheduleId)}/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: JSON.stringify({ status, remarks }) }
  );
}

export async function submitPpmExecution(
  scheduleId: string,
  technicianNotes?: string
): Promise<void> {
  await apiRequest<unknown>(
    `/external/ppm/execution/${encodeURIComponent(scheduleId)}/submit`,
    { method: 'POST', body: JSON.stringify({ technicianNotes }) }
  );
}

export function buildPpmStepPayloadFromUi(
  params: Record<string, unknown>,
  stepId: string
): Record<string, unknown> {
  switch (stepId) {
    case 'qr_scan':
      return { verified: true, matched: true };
    case 'checklist':
      return {};
    case 'parts': {
      const lines = ((params?.selectedParts as Array<Record<string, unknown>>) ?? []).map(
        (p) => ({
          partId: p?.id ?? p?.partId ?? '',
          name: p?.name ?? '',
          quantity: Number(p?.quantity ?? 0),
        })
      );
      return { lines };
    }
    case 'before_photos':
    case 'after_photos':
      return { items: params?.evidence ?? [] };
    case 'signature':
      return (params?.signatureData as Record<string, unknown>) ?? {};
    default:
      return {};
  }
}
