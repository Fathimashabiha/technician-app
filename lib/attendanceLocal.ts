import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTechnicianId } from './technicianSession';
import type { AttendanceDayState } from './attendanceService';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayStateKey(technicianId: string): string {
  return `@zenfix_attendance_day_${technicianId}_${todayKey()}`;
}

export type ShiftSession = {
  active: boolean;
  startedAt: number;
  technicianId: string;
  technicianName?: string;
};

function storageKey(technicianId?: string): string {
  return `@zenfix_shift_session_${technicianId ?? getTechnicianId()}`;
}

export function isSameLocalDay(a: number, b: number = Date.now()): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Last millisecond of the local calendar day containing `ts`. */
export function endOfLocalDayMs(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** True when still "on shift" but check-in was on a prior calendar day (missed check-out). */
export function shouldMarkAbsentAfterMidnight(
  phase: AttendanceDayState,
  startedAt: number | null,
): boolean {
  return phase === 'on_shift' && startedAt != null && !isSameLocalDay(startedAt);
}

/** Earliest valid check-in moment for today (local device calendar day). */
export function resolveTodayShiftStart(
  localStartedAt?: number,
  lastCheckIn?: string | null,
): number | null {
  const now = Date.now();
  const candidates: number[] = [];

  if (localStartedAt && isSameLocalDay(localStartedAt, now)) {
    candidates.push(localStartedAt);
  }
  if (lastCheckIn) {
    const fromServer = new Date(lastCheckIn).getTime();
    if (!Number.isNaN(fromServer) && isSameLocalDay(fromServer, now)) {
      candidates.push(fromServer);
    }
  }

  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export async function getLocalShiftSession(
  technicianId: string = getTechnicianId(),
): Promise<ShiftSession | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(technicianId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShiftSession;
    if (parsed.technicianId && parsed.technicianId !== technicianId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLocalShiftSession(
  active: boolean,
  technicianName?: string,
  startedAt?: number,
  technicianId: string = getTechnicianId(),
): Promise<void> {
  const key = storageKey(technicianId);

  if (!active) {
    await AsyncStorage.removeItem(key);
    return;
  }

  const existing = await getLocalShiftSession(technicianId);
  const session: ShiftSession = {
    active: true,
    startedAt: startedAt ?? existing?.startedAt ?? Date.now(),
    technicianId,
    technicianName: technicianName ?? existing?.technicianName,
  };
  await AsyncStorage.setItem(key, JSON.stringify(session));
}

/** Elapsed seconds since check-in — always derived from wall clock, not app uptime. */
export function elapsedSecondsFromSession(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

/** Shift timer display — stops at midnight when check-out was missed. */
export function shiftElapsedSeconds(
  startedAt: number,
  phase: AttendanceDayState,
  endedAt?: number | null,
): number {
  if (phase === 'can_check_in') return 0;

  if (phase === 'checked_out' && endedAt != null) {
    return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  }

  if (phase === 'absent' || (phase === 'on_shift' && !isSameLocalDay(startedAt))) {
    const end =
      endedAt ??
      (isSameLocalDay(startedAt) ? Date.now() : endOfLocalDayMs(startedAt));
    return Math.max(0, Math.floor((end - startedAt) / 1000));
  }

  return elapsedSecondsFromSession(startedAt);
}

export type LocalDayAttendance = {
  dateKey: string;
  dayState: AttendanceDayState;
  startedAt?: number;
  endedAt?: number;
  checkInLocationName?: string;
  checkOutLocationName?: string;
};

export async function getLocalDayAttendance(
  technicianId: string = getTechnicianId(),
): Promise<LocalDayAttendance | null> {
  try {
    const raw = await AsyncStorage.getItem(dayStateKey(technicianId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDayAttendance;
    if (parsed.dateKey !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLocalDayAttendance(
  record: LocalDayAttendance,
  technicianId: string = getTechnicianId(),
): Promise<void> {
  await AsyncStorage.setItem(
    dayStateKey(technicianId),
    JSON.stringify({ ...record, dateKey: todayKey() }),
  );
}
