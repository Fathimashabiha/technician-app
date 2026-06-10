/** @deprecated Use lib/types/workOrder and workOrderService — mock work order list removed. */
export type { WorkOrder, WorkOrderType, WorkOrderStatus } from '@/lib/types/workOrder';

/** @deprecated Use lib/types/asset and assetService — mock asset list removed. */
export type { Asset } from '@/lib/types/asset';

/** @deprecated Use lib/types/inventory and inventoryService — mock inventory list removed. */
export type { InventoryItem } from '@/lib/types/inventory';

export interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  type: 'yesno' | 'input' | 'passfail';
  value?: string;
  status?: 'pass' | 'flag' | 'fail' | null;
  note?: string;
}

export interface ManualDoc {
  id: string;
  title: string;
  type: 'PDF' | 'Video' | 'Guide';
  assetId: string;
  size: string;
  lastUpdated: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'assignment' | 'priority' | 'reminder' | 'system';
  read: boolean;
}

export interface TimesheetEntry {
  id: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  totalHours: string;
  breakTime: string;
  jobs: {
    woId: string;
    title: string;
    duration: string;
    slaStatus: 'Met' | 'Breached';
    targetSla: string;
    startTime: string;
    endTime: string;
    timeline: { event: string; time: string; note?: string }[];
  }[];
  status: 'Draft' | 'Submitted' | 'Approved';
}

/** @deprecated Load from asset service via lib/assetDocumentsService */
export const checklistItems: ChecklistItem[] = [];

/** @deprecated Load from asset service via lib/assetDocumentsService */
export const manuals: ManualDoc[] = [];

/** @deprecated Wire to notifications API when available */
export const notifications: Notification[] = [];

export const timesheetEntries: TimesheetEntry[] = [];
