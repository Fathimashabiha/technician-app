import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IntakeRequestItem } from './types/intakeRequest';
import { getTechnicianId } from './technicianSession';

const STORAGE_KEY = '@zenfix_pending_intake_requests';

type StoredPendingRequest = IntakeRequestItem & {
  technicianId: string;
  savedAt: number;
};

export async function getLocalPendingIntakeRequests(): Promise<IntakeRequestItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as StoredPendingRequest[];
    const technicianId = getTechnicianId();
    return rows
      .filter((row) => row.technicianId === technicianId)
      .map(({ technicianId: _tid, savedAt: _savedAt, ...item }) => item);
  } catch {
    return [];
  }
}

export async function saveLocalPendingIntakeRequest(item: IntakeRequestItem): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const existing = raw ? (JSON.parse(raw) as StoredPendingRequest[]) : [];
  const technicianId = getTechnicianId();
  const next: StoredPendingRequest = {
    ...item,
    technicianId,
    savedAt: Date.now(),
  };
  const filtered = existing.filter(
    (row) => !(row.id === item.id && row.technicianId === technicianId)
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...filtered, next]));
}

export async function removeLocalPendingIntakeRequest(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const existing = JSON.parse(raw) as StoredPendingRequest[];
  const technicianId = getTechnicianId();
  const filtered = existing.filter(
    (row) => !(row.id === id && row.technicianId === technicianId)
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/** Drop local cache entries once the work order is no longer awaiting approval. */
export async function pruneLocalPendingIntakeRequests(approvedIds: string[]): Promise<void> {
  if (approvedIds.length === 0) return;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const existing = JSON.parse(raw) as StoredPendingRequest[];
  const approved = new Set(approvedIds.map((id) => id.toLowerCase()));
  const filtered = existing.filter((row) => !approved.has(row.id.toLowerCase()));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
