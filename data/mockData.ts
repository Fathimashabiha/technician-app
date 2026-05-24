export interface WorkOrder {
  id: string;
  title: string;
  type: 'PPM' | 'Breakdown' | 'Corrective' | 'Inspection' | 'Other';
  status: 'Assigned' | 'Accepted' | 'In Progress' | 'Completed' | 'Verified' | 'Closed';
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

export interface Asset {
  id: string;
  name: string;
  location: string;
  type: string;
  lastService: string;
  nextService: string;
  status: 'Active' | 'Inactive' | 'Under Repair';
  openWOs: number;
  serialNumber: string;
  manufacturer: string;
  installationDate: string;
  warrantyExpiry: string;
  criticality: 'Critical' | 'Major' | 'Minor';
  slaTier: string;
  slaPolicy: { response: string; resolution: string };
}

export interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  type: 'yesno' | 'input' | 'passfail';
  value?: string;
  status?: 'pass' | 'flag' | 'fail' | null;
  note?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unit: string;
  location: string;
  minStock: number;
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

export const workOrders: WorkOrder[] = [
  { id: 'WO-2024-001', title: 'AHU-03 Filter Replacement', type: 'PPM', status: 'Assigned', priority: 'Medium', assetId: 'AST-001', assetName: 'AHU-03', location: 'Building A - Floor 3', assignedBy: 'John Manager', estimatedTime: '2h', dueDate: '2024-03-15', description: 'Replace air filters and clean coils on AHU-03 unit.', slaDeadline: '2024-04-02T16:00:00', slaStatus: 'Healthy', scope: 'asset' },
  { id: 'WO-2024-002', title: 'Emergency Pump Repair', type: 'Breakdown', status: 'In Progress', priority: 'Critical', assetId: 'AST-005', assetName: 'Pump P-12', location: 'Basement - Pump Room', assignedBy: 'Sarah Lead', estimatedTime: '4h', dueDate: '2024-03-12', description: 'Pump P-12 showing abnormal vibration and leaking from mechanical seal.', startTime: '09:30 AM', slaDeadline: '2024-04-02T12:30:00', slaStatus: 'Warning', scope: 'asset' },
  { id: 'WO-2024-003', title: 'Elevator Annual Inspection', type: 'Inspection', status: 'Assigned', priority: 'High', assetId: 'AST-008', assetName: 'Elevator E-02', location: 'Building B - Lobby', assignedBy: 'John Manager', estimatedTime: '3h', dueDate: '2024-03-14', description: 'Annual safety inspection for passenger elevator E-02.', slaDeadline: '2024-04-02T10:00:00', slaStatus: 'Breached', scope: 'asset' },
  { id: 'WO-2024-004', title: 'Chiller Preventive Maintenance', type: 'PPM', status: 'Completed', priority: 'Medium', assetId: 'AST-003', assetName: 'Chiller CH-01', location: 'Rooftop - Plant Room', assignedBy: 'Sarah Lead', estimatedTime: '5h', dueDate: '2024-03-10', description: 'Quarterly maintenance on Chiller CH-01.', startTime: '08:00 AM', endTime: '01:15 PM', slaStatus: 'Met', scope: 'asset' },
  { id: 'WO-2024-005', title: 'Fire Alarm Panel Check', type: 'PPM', status: 'Assigned', priority: 'High', assetId: 'AST-012', assetName: 'FA Panel Zone-4', location: 'Building A - Ground Floor', assignedBy: 'John Manager', estimatedTime: '1.5h', dueDate: '2024-03-16', description: 'Monthly fire alarm system test and battery check.', slaDeadline: '2024-04-03T09:00:00', slaStatus: 'Healthy', scope: 'asset' },
  { id: 'WO-2024-006', title: 'Lighting Circuit Repair', type: 'Breakdown', status: 'Assigned', priority: 'Low', assetId: 'N/A', assetName: 'General Area', location: 'Building C - Floor 2', assignedBy: 'Sarah Lead', estimatedTime: '1h', dueDate: '2024-03-17', description: 'Flickering lights on Floor 2 east wing.', slaStatus: 'Healthy', scope: 'location' },
  { id: 'WO-2024-007', title: 'Corrective: P-12 Seal Replacement', type: 'Corrective', status: 'Assigned', priority: 'High', assetId: 'AST-005', assetName: 'Pump P-12', location: 'Basement - Pump Room', assignedBy: 'John Manager', estimatedTime: '2.5h', dueDate: '2024-03-18', description: 'Mechanical seal replacement identified during inspection (WO-2024-002). Replace with kit INV-002.', slaDeadline: '2024-04-02T15:30:00', slaStatus: 'Healthy', scope: 'asset' },
  // Current PPM tasks for Real-time view (April 2026)
  { id: 'WO-2026-001', title: 'Monthly Generator Load Test', type: 'PPM', status: 'Assigned', priority: 'High', assetId: 'AST-001', assetName: 'GenSet-01', location: 'External - Energy Center', assignedBy: 'John Manager', estimatedTime: '1h', dueDate: '2026-04-22', description: 'Monthly routine load bank test for standby generator.', slaDeadline: '2026-04-22T17:00:00', slaStatus: 'Healthy', scope: 'asset' },
  { id: 'WO-2026-002', title: 'Quarterly AC Filter Wash', type: 'PPM', status: 'In Progress', priority: 'Medium', assetId: 'AST-003', assetName: 'ACU-12', location: 'Building A - Office 101', assignedBy: 'Sarah Lead', estimatedTime: '1.5h', dueDate: '2026-04-22', description: 'Routine filter cleaning and coil check for Office AC unit.', slaDeadline: '2026-04-22T16:00:00', slaStatus: 'Healthy', scope: 'asset' },
  { id: 'WO-2026-005', title: 'Broken Water Pipe in Pantry', type: 'Breakdown', status: 'Assigned', priority: 'Critical', assetId: 'N/A', assetName: 'General Area', location: 'Building B - Pantry', assignedBy: 'Sarah Lead', estimatedTime: '2h', dueDate: '2026-04-22', description: 'Pipe leak reported in pantry area. Urgent repair required.', slaDeadline: '2026-04-22T14:00:00', slaStatus: 'Warning', scope: 'location' },
  { id: 'WO-2026-006', title: 'Lift Safety Inspection', type: 'Inspection', status: 'Assigned', priority: 'High', assetId: 'AST-008', assetName: 'Elevator E-01', location: 'Building C - Lobby', assignedBy: 'John Manager', estimatedTime: '2.5h', dueDate: '2026-04-22', description: 'Periodic safety and weight sensor inspection.', slaDeadline: '2026-04-22T17:30:00', slaStatus: 'Healthy', scope: 'asset' },
  { id: 'WO-2026-003', title: 'Weekly Fire Pump Run', type: 'PPM', status: 'Assigned', priority: 'High', assetId: 'AST-005', assetName: 'Fire Pump P-1', location: 'Basement - Pump Room', assignedBy: 'Sarah Lead', estimatedTime: '0.5h', dueDate: '2026-04-20', description: 'Weekly churn test for fire suppression system.', slaDeadline: '2026-04-20T10:00:00', slaStatus: 'Healthy', scope: 'asset' },
  { id: 'WO-2026-004', title: 'Emergency Light Inspection', type: 'PPM', status: 'Assigned', priority: 'Low', assetId: 'N/A', assetName: 'Core Areas', location: 'Building B - All Floors', assignedBy: 'John Manager', estimatedTime: '3h', dueDate: '2026-04-24', description: 'Monthly inspection of emergency exit lighting.', slaDeadline: '2026-04-24T18:00:00', slaStatus: 'Healthy', scope: 'location' },
];

export const assets: Asset[] = [
  { 
    id: 'AST-001', name: 'AHU-03', location: 'Building A - Floor 3', type: 'HVAC', lastService: '2024-01-15', nextService: '2024-04-15', status: 'Active', openWOs: 1,
    serialNumber: 'SN-449-33290', manufacturer: 'Daikin Industries', installationDate: '2020-05-12', warrantyExpiry: '2025-05-12', criticality: 'Critical',
    slaTier: 'Gold - Priority 24/7',
    slaPolicy: { response: '2 Hours', resolution: '8 Hours' }
  },
  { 
    id: 'AST-003', name: 'Chiller CH-01', location: 'Rooftop - Plant Room', type: 'HVAC', lastService: '2024-03-10', nextService: '2024-06-10', status: 'Active', openWOs: 0,
    serialNumber: 'CH-991-88', manufacturer: 'Carrier Corp', installationDate: '2019-11-20', warrantyExpiry: '2024-11-20', criticality: 'Major',
    slaTier: 'Silver - Standard Support',
    slaPolicy: { response: '4 Hours', resolution: '12 Hours' }
  },
  { 
    id: 'AST-005', name: 'Pump P-12', location: 'Basement - Pump Room', type: 'Plumbing', lastService: '2024-02-20', nextService: '2024-05-20', status: 'Under Repair', openWOs: 1,
    serialNumber: 'PMP-X200-Z', manufacturer: 'Grundfos', installationDate: '2021-08-15', warrantyExpiry: '2026-08-15', criticality: 'Major',
    slaTier: 'Platinum - Critical Response',
    slaPolicy: { response: '1 Hour', resolution: '4 Hours' }
  },
  { 
    id: 'AST-008', name: 'Elevator E-02', location: 'Building B - Lobby', type: 'Vertical Transport', lastService: '2023-03-14', nextService: '2024-03-14', status: 'Active', openWOs: 1,
    serialNumber: 'ELV-552-GT', manufacturer: 'Otis Worldwide', installationDate: '2018-02-14', warrantyExpiry: '2023-02-14', criticality: 'Critical',
    slaTier: 'Gold - Priority 24/7',
    slaPolicy: { response: '2 Hours', resolution: '8 Hours' }
  },
  { 
    id: 'AST-012', name: 'FA Panel Zone-4', location: 'Building A - Ground Floor', type: 'Fire Safety', lastService: '2024-02-16', nextService: '2024-03-16', status: 'Active', openWOs: 1,
    serialNumber: 'FAP-Z4-990', manufacturer: 'Honeywell', installationDate: '2022-01-25', warrantyExpiry: '2027-01-25', criticality: 'Critical',
    slaTier: 'Platinum - Critical Response',
    slaPolicy: { response: '30 Mins', resolution: '2 Hours' }
  },
];

export const checklistItems: ChecklistItem[] = [
  { id: 'CL-1', section: 'Pre-Inspection', item: 'Verify power isolation', type: 'yesno', status: null },
  { id: 'CL-2', section: 'Pre-Inspection', item: 'Check PPE equipment', type: 'yesno', status: null },
  { id: 'CL-3', section: 'Pre-Inspection', item: 'Confirm LOTO procedure', type: 'yesno', status: null },
  { id: 'CL-4', section: 'Filter Check', item: 'Filter condition rating', type: 'passfail', status: null },
  { id: 'CL-5', section: 'Filter Check', item: 'Differential pressure reading (Pa)', type: 'input', value: '', status: null },
  { id: 'CL-6', section: 'Filter Check', item: 'Filter seal integrity', type: 'passfail', status: null },
  { id: 'CL-7', section: 'Coil Inspection', item: 'Coil fin condition', type: 'passfail', status: null },
  { id: 'CL-8', section: 'Coil Inspection', item: 'Drain pan clean and clear', type: 'yesno', status: null },
  { id: 'CL-9', section: 'Final Check', item: 'System restored to operation', type: 'yesno', status: null },
  { id: 'CL-10', section: 'Final Check', item: 'Area cleaned and tools secured', type: 'yesno', status: null },
];

export interface ManualDoc {
  id: string;
  title: string;
  type: 'PDF' | 'Video' | 'Guide';
  assetId: string;
  size: string;
  lastUpdated: string;
}

export const inventoryItems: InventoryItem[] = [
  { id: 'INV-001', name: 'Air Filter 20x20x2', partNumber: 'AF-2020-2', quantity: 12, unit: 'pcs', location: 'Van Stock', minStock: 5 },
  { id: 'INV-002', name: 'Mechanical Seal Kit', partNumber: 'MS-P12-KIT', quantity: 1, unit: 'kit', location: 'Van Stock', minStock: 2 },
  { id: 'INV-003', name: 'Refrigerant R-410A', partNumber: 'REF-410A-25', quantity: 3, unit: 'kg', location: 'Main Store', minStock: 5 },
  { id: 'INV-004', name: 'Bearing 6205-2RS', partNumber: 'BRG-6205', quantity: 8, unit: 'pcs', location: 'Van Stock', minStock: 4 },
  { id: 'INV-005', name: 'Contactors 3P 40A', partNumber: 'CT-3P40A', quantity: 1, unit: 'pcs', location: 'Main Store', minStock: 2 },
  { id: 'INV-006', name: 'V-Belt A68', partNumber: 'VB-A68', quantity: 6, unit: 'pcs', location: 'Van Stock', minStock: 3 },
  { id: 'INV-007', name: 'Copper Pipe 3/8"', partNumber: 'CP-375-10', quantity: 15, unit: 'meters', location: 'Main Store', minStock: 10 },
  { id: 'INV-008', name: 'Thermal Paste TG-7', partNumber: 'TP-TG7-50', quantity: 2, unit: 'tubes', location: 'Van Stock', minStock: 5 },
  { id: 'INV-009', name: 'Circuit Breaker 32A', partNumber: 'CB-32A-3P', quantity: 0, unit: 'pcs', location: 'Main Store', minStock: 3 },
  { id: 'INV-010', name: 'Lubricant Oil SAE 30', partNumber: 'LO-SAE30-5L', quantity: 7, unit: 'liters', location: 'Van Stock', minStock: 5 },
  { id: 'INV-011', name: 'Capacitor 40µF', partNumber: 'CAP-40UF', quantity: 0, unit: 'pcs', location: 'Van Stock', minStock: 4 },
  { id: 'INV-012', name: 'Fuse 16A Cartridge', partNumber: 'FS-16A-CT', quantity: 20, unit: 'pcs', location: 'Van Stock', minStock: 10 },
  { id: 'INV-013', name: 'Pressure Gauge 0-10bar', partNumber: 'PG-010B', quantity: 0, unit: 'pcs', location: 'Van Stock', minStock: 2 },
  { id: 'INV-014', name: 'Teflon Tape Roll', partNumber: 'TT-12MM-30', quantity: 25, unit: 'rolls', location: 'Van Stock', minStock: 8 },
  { id: 'INV-015', name: 'Solenoid Valve 1/2"', partNumber: 'SV-12-24V', quantity: 1, unit: 'pcs', location: 'Main Store', minStock: 2 },
];

export const manuals: ManualDoc[] = [
  { id: 'MAN-001', title: 'AHU-03 Service Manual', type: 'PDF', assetId: 'AST-001', size: '4.2 MB', lastUpdated: '2024-01-10' },
  { id: 'MAN-002', title: 'AHU Filter Replacement Guide', type: 'Guide', assetId: 'AST-001', size: '1.1 MB', lastUpdated: '2023-11-05' },
  { id: 'MAN-003', title: 'Chiller CH-01 Operations Manual', type: 'PDF', assetId: 'AST-003', size: '8.7 MB', lastUpdated: '2023-09-20' },
  { id: 'MAN-004', title: 'Pump P-12 Maintenance Video', type: 'Video', assetId: 'AST-005', size: '120 MB', lastUpdated: '2024-02-15' },
  { id: 'MAN-005', title: 'Elevator E-02 Safety Procedures', type: 'PDF', assetId: 'AST-008', size: '2.3 MB', lastUpdated: '2023-12-01' },
  { id: 'MAN-006', title: 'Fire Alarm Panel Wiring Diagram', type: 'Guide', assetId: 'AST-012', size: '3.5 MB', lastUpdated: '2024-01-25' },
];

export const notifications: Notification[] = [
  { id: 'N-1', title: 'New Work Order Assigned', message: 'WO-2024-005: Fire Alarm Panel Check has been assigned to you', time: '5 min ago', type: 'assignment', read: false },
  { id: 'N-2', title: 'Priority Changed', message: 'WO-2024-002 priority escalated to Critical', time: '15 min ago', type: 'priority', read: false },
  { id: 'N-3', title: 'Corrective Task Assigned', message: 'WO-2024-007: P-12 Seal Replacement has been assigned for corrective action', time: '1h ago', type: 'assignment', read: true },
  { id: 'N-4', title: 'PPM Reminder', message: 'Chiller CH-01 quarterly maintenance due in 3 days', time: '2h ago', type: 'reminder', read: true },
  { id: 'N-5', title: 'System Update', message: 'App updated to version 2.4.1 with new features', time: '1d ago', type: 'system', read: true },
];

export const timesheetEntries: TimesheetEntry[] = [
  { id: 'TS-001', date: '2024-03-12', shiftStart: '08:00 AM', shiftEnd: '05:30 PM', totalHours: '8.5h', breakTime: '1h', jobs: [
    { 
      woId: 'WO-2024-002', title: 'Emergency Pump Repair', duration: '4h 30m', slaStatus: 'Met', targetSla: '6h', startTime: '09:30 AM', endTime: '02:00 PM',
      timeline: [
        { event: 'Started', time: '09:30 AM' },
        { event: 'On Hold', time: '11:15 AM', note: 'Waiting for Parts' },
        { event: 'Resumed', time: '11:45 AM' },
        { event: 'Completed', time: '02:00 PM' }
      ]
    }, 
    { 
      woId: 'WO-2024-005', title: 'Fire Alarm Panel Check', duration: '1h 45m', slaStatus: 'Met', targetSla: '2h', startTime: '03:00 PM', endTime: '04:45 PM',
      timeline: [
        { event: 'Started', time: '03:00 PM' },
        { event: 'Completed', time: '04:45 PM' }
      ]
    }
  ], status: 'Draft' },
  { id: 'TS-002', date: '2024-03-11', shiftStart: '07:30 AM', shiftEnd: '04:00 PM', totalHours: '7.5h', breakTime: '1h', jobs: [
    { 
      woId: 'WO-2024-001', title: 'AHU-03 Filter Replacement', duration: '2h 15m', slaStatus: 'Met', targetSla: '3h', startTime: '08:00 AM', endTime: '10:15 AM',
      timeline: [
        { event: 'Started', time: '08:00 AM' },
        { event: 'Completed', time: '10:15 AM' }
      ]
    }, 
    { 
      woId: 'WO-2024-003', title: 'Elevator Annual Inspection', duration: '5h', slaStatus: 'Breached', targetSla: '4h', startTime: '11:00 AM', endTime: '04:00 PM',
      timeline: [
        { event: 'Started', time: '11:00 AM' },
        { event: 'On Hold', time: '01:00 PM', note: 'Lobby Access Restricted' },
        { event: 'Resumed', time: '02:30 PM' },
        { event: 'Completed', time: '04:00 PM' }
      ]
    }
  ], status: 'Submitted' },
  { id: 'TS-003', date: '2024-03-10', shiftStart: '08:00 AM', shiftEnd: '05:00 PM', totalHours: '8h', breakTime: '1h', jobs: [
    { 
      woId: 'WO-2024-004', title: 'Chiller Preventive Maintenance', duration: '5h 15m', slaStatus: 'Met', targetSla: '6h', startTime: '09:00 AM', endTime: '02:15 PM',
      timeline: [
        { event: 'Started', time: '09:00 AM' },
        { event: 'Completed', time: '02:15 PM' }
      ]
    }
  ], status: 'Approved' },
];
