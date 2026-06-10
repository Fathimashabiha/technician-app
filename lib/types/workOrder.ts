export type WorkOrderType = 'PPM' | 'Breakdown' | 'Reactive' | 'Corrective' | 'Inspection' | 'Other';

export type WorkOrderStatus =
  | 'Pending Approval'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Verified'
  | 'Closed'
  | 'Cancelled';

export type WorkOrder = {
  id: string;
  title: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
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
  locationRef?: string | null;
  ppmScheduleId?: string;
};

export type WorkOrderExecutionState = {
  status: string;
  workflowSteps: string[];
  currentStepIndex: number;
  currentStepId: string | null;
  onHoldReason: string | null;
  assetVerified: boolean;
};

export type WorkOrderDetail = WorkOrder & {
  execution: WorkOrderExecutionState | null;
};
