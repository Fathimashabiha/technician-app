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
  AssetDetails: {
    assetId: string;
    isReviewMode?: boolean;
    workOrderId?: string;
    scheduleId?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    initialView?: 'details' | 'manuals' | 'history';
  };
  LocationDetails: {
    locationId: string;
    isReviewMode?: boolean;
    workOrderId?: string;
    scheduleId?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
  };
};

export type PpmExecutionParams = {
  scheduleId: string;
  title?: string;
  assetId?: string;
  holdWork?: boolean;
  holdReason?: string;
  stepCompleted?: string;
  checklistResult?: 'pass' | 'fail';
  selectedParts?: Array<{ id: string; name: string; quantity: number }>;
  evidence?: Array<Record<string, unknown>>;
  signatureData?: Record<string, unknown>;
  checklistAnswers?: Array<{ itemId: string; status: string | null }>;
};

export type ExecutionStepRouteParams = {
  returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
  scheduleId?: string;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Assets: undefined;
  HSE: undefined;
  Inspections: undefined;
  MeterReading: undefined;
  PPM: undefined;
  /** @deprecated Use PpmExecutionDetails — kept for deep links */
  PPMExecution: { scheduleId: string; title?: string; assetId?: string };
  PpmExecutionDetails: PpmExecutionParams;
  WorkOrderQRScan: {
    id: string;
    assetId: string;
    scope?: 'asset' | 'location';
    location?: string;
    locationRef?: string | null;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  PhotoCapture: {
    id: string;
    type: 'before' | 'after' | 'intake';
    initialMode?: 'photo' | 'video' | 'audio';
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  Checklist: {
    id: string;
    assetId?: string;
    woType?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
    ppmChecklistItems?: Array<{
      id: string;
      description: string;
      frequency?: string;
      isMandatory: boolean;
      status: string;
    }>;
  };
  Signature: {
    id: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  PartsUsage: {
    id: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  AssetDetails: {
    assetId: string;
    isReviewMode?: boolean;
    workOrderId?: string;
    scheduleId?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    initialView?: 'details' | 'manuals' | 'history';
  };
  LocationDetails: {
    locationId: string;
    isReviewMode?: boolean;
    workOrderId?: string;
    scheduleId?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
  };
  Procedure: { assetId: string };
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
  PpmExecutionDetails: PpmExecutionParams;
  PPMExecution: { scheduleId: string; title?: string; assetId?: string };
  Snagging: undefined;
  Timesheet: undefined;
  WorkOrderQRScan: MoreStackParamList['WorkOrderQRScan'];
  PhotoCapture: MoreStackParamList['PhotoCapture'];
  Checklist: MoreStackParamList['Checklist'];
  Signature: MoreStackParamList['Signature'];
  PartsUsage: MoreStackParamList['PartsUsage'];
  AssetDetails: MoreStackParamList['AssetDetails'];
  LocationDetails: MoreStackParamList['LocationDetails'];
  Procedure: MoreStackParamList['Procedure'];
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
  WorkOrderDetails: { id: string; stepCompleted?: string; pendingApproval?: boolean };
  NavigateSite: { id: string };
  PhotoCapture: {
    id: string;
    type: 'before' | 'after' | 'intake';
    initialMode?: 'photo' | 'video' | 'audio';
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  Checklist: {
    id: string;
    assetId?: string;
    woType?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
    ppmChecklistItems?: Array<{
      id: string;
      description: string;
      frequency?: string;
      isMandatory: boolean;
      status: string;
    }>;
  };
  Diagnosis: { id: string };
  Signature: {
    id: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  PartsUsage: {
    id: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  WorkOrderResult: { id: string; status: 'pass' | 'fail' };
  Procedure: { assetId: string };
  AssetDetails: {
    assetId: string;
    isReviewMode?: boolean;
    workOrderId?: string;
    scheduleId?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    initialView?: 'details' | 'manuals' | 'history';
  };
  LocationDetails: {
    locationId: string;
    isReviewMode?: boolean;
    workOrderId?: string;
    scheduleId?: string;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
  };
  WorkOrderQRScan: {
    id: string;
    assetId: string;
    scope?: 'asset' | 'location';
    location?: string;
    locationRef?: string | null;
    returnTo?: 'WorkOrderDetails' | 'PpmExecutionDetails';
    scheduleId?: string;
  };
  CreateWorkOrder: undefined;
  RequestList: undefined;
};

export type InventoryStackParamList = {
  InventoryHome: undefined;
};
