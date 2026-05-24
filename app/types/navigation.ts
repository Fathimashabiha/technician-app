export type RootStackParamList = {
  Login: undefined;
  Main: { screen?: keyof TabParamList } | undefined;
  Notifications: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Maintenance: { screen?: string; params?: any } | undefined;
  Inventory: undefined;
  Scan: undefined;
  History: { screen?: string; params?: { tab?: 'history' | 'timesheet' } } | undefined;
  More: { screen?: keyof MoreStackParamList } | undefined;
};

export type ScanStackParamList = {
  AssetScanHome: { id?: string; assetId?: string };
  AssetDetails: { assetId: string; isReviewMode?: boolean; workOrderId?: string };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Assets: undefined;
  HSE: undefined;
  Inspections: undefined;
  MeterReading: undefined;
  PPM: undefined;
  Snagging: undefined;
  Timesheet: undefined;
  Inventory: undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Assets: undefined;
  HSE: undefined;
  Inspections: undefined;
  MeterReading: undefined;
  PPM: undefined;
  Snagging: undefined;
  Timesheet: undefined;
};

export interface WorkOrder {
  id: string;
  title: string;
  type: 'PPM' | 'Breakdown' | 'Corrective' | 'Inspection' | 'Other';
  status: 'Assigned' | 'Accepted' | 'In Progress' | 'Completed' | 'Verified' | 'Closed' | 'Pending Rework';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assetId: string;
  assetName: string;
  location: string;
  assignedBy: string;
  estimatedTime: string;
  dueDate: string;
  description: string;
  startTime?: string;
  endTime?: string;
  slaDeadline?: string;
  slaStatus?: 'Met' | 'Breached' | 'Warning' | 'Healthy';
  completedBy?: string;
  completionDate?: string;
  scope?: 'asset' | 'location';
}

export type MaintenanceStackParamList = {
  MaintenanceHome: undefined;
  WorkOrderDetails: { id: string; stepCompleted?: string };
  NavigateSite: { id: string };
  PhotoCapture: { id: string; type: 'before' | 'after' };
  Checklist: { id: string; assetId?: string };
  Diagnosis: { id: string };
  Signature: { id: string };
  PartsUsage: { id: string };
  WorkOrderResult: { id: string; status: 'pass' | 'fail' };
  Procedure: { assetId: string };
  AssetDetails: { assetId: string; isReviewMode?: boolean; workOrderId?: string };
  WorkOrderQRScan: { id: string; assetId: string };
  CreateWorkOrder: undefined;
  RequestList: undefined;
};

export type InventoryStackParamList = {
  InventoryHome: undefined;
};
