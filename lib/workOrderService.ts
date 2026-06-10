import { API_URL, ApiError, apiRequest } from './api';
import { getAuthToken, getTechnicianId } from './technicianSession';
import type {
  WorkOrder,
  WorkOrderDetail,
  WorkOrderExecutionState,
  WorkOrderStatus,
  WorkOrderType,
} from './types/workOrder';

type WorkOrderListRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  assetId: string;
  assetName: string;
  location: string;
  assignedBy: string;
  estimatedTime: string;
  dueDate: string;
  description: string;
  slaDeadline?: string;
  slaStatus?: string;
  scope?: 'asset' | 'location';
  locationRef?: string | null;
  ppmScheduleId?: string;
};

type WorkOrderDetailRow = WorkOrderListRow & {
  workOrderRef?: string;
  woType?: string;
  execution: {
    status: string;
    workflowSteps: string[];
    currentStepIndex: number;
    currentStepId: string | null;
    onHoldReason: string | null;
    assetVerified: boolean;
  } | null;
};

const WO_TYPES: WorkOrderType[] = ['PPM', 'Breakdown', 'Reactive', 'Corrective', 'Inspection', 'Other'];

function normalizeType(value: string): WorkOrderType {
  const raw = value.trim().toLowerCase();
  if (raw === 'preventive' || raw === 'ppm') return 'PPM';
  if (raw === 'corrective') return 'Reactive';
  if (raw === 'reactive') return 'Reactive';
  if (raw === 'service request') return 'Reactive';
  if (raw === 'hse') return 'Inspection';
  const match = WO_TYPES.find((t) => t.toLowerCase() === raw);
  return match ?? 'Other';
}

/** Label shown on task cards — legacy Corrective reads as Reactive. */
export function workOrderTypeLabel(type: WorkOrderType): string {
  if (type === 'Corrective') return 'Reactive';
  return type;
}

function normalizePriority(value: string): WorkOrder['priority'] {
  const allowed: WorkOrder['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
  return allowed.find((p) => p.toLowerCase() === value.toLowerCase()) ?? 'Medium';
}

function normalizeStatus(assignmentStatus: string, executionStatus?: string | null): WorkOrderStatus {
  if (assignmentStatus === 'Pending Approval') return 'Pending Approval';
  if (executionStatus === 'OnHold') return 'On Hold';
  if (executionStatus === 'InProgress') return 'In Progress';
  if (executionStatus === 'Completed' || assignmentStatus === 'Completed') return 'Completed';

  const allowed: WorkOrderStatus[] = [
    'Pending Approval',
    'Assigned',
    'Accepted',
    'In Progress',
    'On Hold',
    'Completed',
    'Verified',
    'Closed',
    'Cancelled',
  ];
  return allowed.find((s) => s.toLowerCase() === assignmentStatus.toLowerCase()) ?? 'Assigned';
}

export function mapListRowToWorkOrder(row: WorkOrderListRow): WorkOrder {
  return {
    id: row.id,
    title: row.title,
    type: normalizeType(row.type),
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    assetId: row.assetId,
    assetName: row.assetName,
    location: row.location,
    assignedBy: row.assignedBy,
    estimatedTime: row.estimatedTime,
    dueDate: row.dueDate,
    description: row.description,
    slaDeadline: row.slaDeadline,
    slaStatus: row.slaStatus as WorkOrder['slaStatus'],
    scope: row.scope,
    locationRef: row.locationRef ?? null,
    ppmScheduleId: row.ppmScheduleId,
  };
}

export async function fetchWorkOrderByPpmSchedule(scheduleId: string): Promise<WorkOrder | null> {
  try {
    const row = await apiRequest<WorkOrderListRow>(
      `/external/work-order/by-ppm-schedule/${encodeURIComponent(scheduleId)}`
    );
    return mapListRowToWorkOrder(row);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function mapDetailRowToWorkOrder(row: WorkOrderDetailRow): WorkOrderDetail {
  const base = mapListRowToWorkOrder({
    id: row.workOrderRef ?? row.id,
    title: row.title,
    type: row.woType ?? row.type,
    status: row.status,
    priority: row.priority,
    assetId: row.assetId ?? 'N/A',
    assetName: row.assetName ?? 'General Area',
    location: row.location,
    assignedBy: row.assignedBy,
    estimatedTime: row.estimatedTime,
    dueDate: row.dueDate,
    description: row.description,
    slaDeadline: row.slaDeadline,
    slaStatus: row.slaStatus,
    scope: row.scope,
    locationRef: row.locationRef ?? null,
  });

  const execution: WorkOrderExecutionState | null = row.execution
    ? {
        status: row.execution.status,
        workflowSteps: row.execution.workflowSteps ?? [],
        currentStepIndex: row.execution.currentStepIndex ?? 0,
        currentStepId: row.execution.currentStepId,
        onHoldReason: row.execution.onHoldReason,
        assetVerified: row.execution.assetVerified,
      }
    : null;

  return {
    ...base,
    id: row.workOrderRef ?? row.id,
    type: normalizeType(row.woType ?? row.type),
    status: normalizeStatus(row.status, execution?.status),
    execution,
  };
}

export async function fetchWorkOrders(options?: {
  status?: string;
}): Promise<WorkOrder[]> {
  const params = new URLSearchParams({ format: 'app' });
  if (options?.status) params.set('status', options.status);
  const rows = await apiRequest<WorkOrderListRow[]>(`/work-orders?${params.toString()}`);
  return rows.map(mapListRowToWorkOrder);
}

export async function fetchWorkOrderDetail(workOrderRef: string): Promise<WorkOrderDetail> {
  const row = await apiRequest<WorkOrderDetailRow>(
    `/work-orders/${encodeURIComponent(workOrderRef)}`
  );
  return mapDetailRowToWorkOrder(row);
}

export async function startWorkOrder(workOrderRef: string): Promise<unknown> {
  return apiRequest(`/work-orders/${encodeURIComponent(workOrderRef)}/start`, {
    method: 'POST',
    body: JSON.stringify({ technicianId: getTechnicianId() }),
  });
}

export async function holdWorkOrder(
  workOrderRef: string,
  reason: string
): Promise<unknown> {
  return apiRequest(`/work-orders/${encodeURIComponent(workOrderRef)}/hold`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function resumeWorkOrder(workOrderRef: string): Promise<unknown> {
  return apiRequest(`/work-orders/${encodeURIComponent(workOrderRef)}/resume`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function verifyWorkOrderAsset(
  workOrderRef: string,
  scannedValue: string
): Promise<unknown> {
  return apiRequest(`/work-orders/${encodeURIComponent(workOrderRef)}/verify-asset`, {
    method: 'POST',
    body: JSON.stringify({
      technicianId: getTechnicianId(),
      scannedValue,
    }),
  });
}

export async function completeWorkOrderStep(
  workOrderRef: string,
  stepId: string,
  payload?: Record<string, unknown>,
  files?: Array<{ uri: string; name: string; type: string }>
): Promise<unknown> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('technicianId', getTechnicianId());
    form.append('payload', JSON.stringify(payload ?? {}));
    for (const file of files) {
      form.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob);
    }

    const url = `${API_URL}/work-orders/${encodeURIComponent(workOrderRef)}/cycle/steps/${encodeURIComponent(
      stepId
    )}`;
    const token = getAuthToken();
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });
    } catch {
      throw new ApiError(
        `Cannot reach server at ${API_URL}. Check backend is running and EXPO_PUBLIC_API_HOST if on a device.`
      );
    }

    let body: { ok?: boolean; data?: unknown; error?: string };
    try {
      body = (await response.json()) as { ok?: boolean; data?: unknown; error?: string };
    } catch {
      throw new ApiError(`Request failed (${response.status})`, response.status);
    }

    if (!response.ok || body.ok === false) {
      throw new ApiError(body.error || `Request failed (${response.status})`, response.status);
    }

    return body.data;
  }

  return apiRequest(
    `/work-orders/${encodeURIComponent(workOrderRef)}/cycle/steps/${encodeURIComponent(
      stepId
    )}`,
    {
      method: 'POST',
      body: JSON.stringify({
        technicianId: getTechnicianId(),
        payload: payload ?? {},
      }),
    }
  );
}

export async function completeWorkOrder(workOrderRef: string): Promise<unknown> {
  return apiRequest(`/work-orders/${encodeURIComponent(workOrderRef)}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function buildStepPayloadFromUi(
  params: Record<string, unknown>,
  stepId: string,
  workOrderAssetId?: string | null
): Record<string, unknown> {
  switch (stepId) {
    case 'qr_scan':
      return {
        matched: true,
        expectedAssetRef: workOrderAssetId ?? null,
      };
    case 'checklist':
      return {
        result: params?.checklistResult ?? null,
        failedItems: params?.failedItems ?? [],
        answers: params?.checklistAnswers ?? [],
      };
    case 'diagnostics':
      return {
        rectified: params?.rectified ?? undefined,
        diagnosisData: params?.diagnosisData ?? null,
        faultDesc: (params?.diagnosisData as { faultDesc?: string })?.faultDesc ?? undefined,
        rootCause: (params?.diagnosisData as { rootCause?: string })?.rootCause ?? undefined,
      };
    case 'parts': {
      const lines = ((params?.selectedParts as Array<Record<string, unknown>>) ?? []).map(
        (p) => ({
          partRef: p?.id ?? '',
          name: p?.name ?? '',
          quantity: Number(p?.quantity ?? 0),
        })
      );
      return { lines };
    }
    case 'before_photos':
    case 'after_photos':
      return {
        items: params?.evidence ?? [],
      };
    case 'signature':
      return (params?.signatureData as Record<string, unknown>) ?? {};
    case 'start':
    case 'submit':
    default:
      return {};
  }
}

export type { WorkOrder, WorkOrderDetail, WorkOrderType, WorkOrderStatus };
