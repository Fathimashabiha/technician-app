import { apiRequest } from './api';
import { getTechnicianId } from './technicianSession';
import type { AttendanceLocation } from './attendanceLocation';

export type AttendanceDayState =
  | 'can_check_in'
  | 'on_shift'
  | 'checked_out'
  | 'absent';

export type AttendanceStatusDto = {
  technicianId: string;
  technicianName?: string;
  status: string;
  lastCheckIn?: string | null;
  lastCheckOut?: string | null;
  dayState: AttendanceDayState;
  priorShiftUnclosed?: boolean;
  shiftStartedAt?: string | null;
  shiftEndedAt?: string | null;
};

export async function checkIn(location: AttendanceLocation, technicianName?: string) {
  return apiRequest<{ message: string }>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({
      technicianId: getTechnicianId(),
      technicianName,
      location,
    }),
  });
}

export async function checkOut(location: AttendanceLocation) {
  return apiRequest<{ message: string }>('/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify({
      technicianId: getTechnicianId(),
      location,
    }),
  });
}

export async function getAttendanceStatus(technicianId: string = getTechnicianId()) {
  return apiRequest<AttendanceStatusDto | { message: string }>(
    `/attendance/status/${encodeURIComponent(technicianId)}`
  );
}

