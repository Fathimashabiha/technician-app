import { apiRequest } from './api';
import { getTechnicianId } from './technicianSession';

export type TimesheetTimelineEvent = {
  event: string;
  time: string;
  note?: string;
};

export function isTimesheetHoldEvent(event: string): boolean {
  return event.toLowerCase() === 'on hold';
}

export function isTimesheetResumeEvent(event: string): boolean {
  return event.toLowerCase() === 'resumed';
}
export type TimesheetJob = {
  woId: string;
  title: string;
  duration: string;
  slaStatus: string;
  targetSla: string;
  startTime: string;
  endTime: string;
  timeline: TimesheetTimelineEvent[];
};

export type TimesheetEntry = {
  id: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  totalHours: string;
  breakTime: string;
  jobs: TimesheetJob[];
  status: 'Draft' | 'Submitted' | 'Approved' | string;
  submittedAt?: string | null;
  approvedAt?: string | null;
};

export type TimesheetSummary = {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  totalHoursLabel: string;
  targetHours: number;
  targetHoursLabel: string;
  progressPercent: number;
  shiftCount: number;
  jobsCompleted: number;
  entries: TimesheetEntry[];
};

export async function listTimesheets(technicianId: string = getTechnicianId()) {
  return apiRequest<TimesheetEntry[]>(
    `/timesheet/technician/${encodeURIComponent(technicianId)}`
  );
}

export async function getTimesheetSummary(technicianId: string = getTechnicianId()) {
  return apiRequest<TimesheetSummary>(
    `/timesheet/technician/${encodeURIComponent(technicianId)}/summary`
  );
}

/** Rebuild draft timesheet jobs from completed work orders (fixes stale durations). */
export async function syncTimesheetsFromWorkOrders(technicianId: string = getTechnicianId()) {
  return apiRequest<{ synced: number; skipped: number; total: number }>(
    '/timesheet/sync-completed-work-orders',
    { method: 'POST', body: JSON.stringify({ technicianId }) }
  );
}

export async function submitTimesheet(entryId: string) {
  return apiRequest<TimesheetEntry>(`/timesheet/${encodeURIComponent(entryId)}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

