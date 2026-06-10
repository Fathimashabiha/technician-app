import AsyncStorage from '@react-native-async-storage/async-storage';

export type PartReturnReason =
  | 'Unused'
  | 'Defective'
  | 'Wrong Part'
  | 'Job Cancelled'
  | 'Other';

export type PartReturnStatus = 'Pending' | 'Received' | 'Rejected';

export interface PartReturnLine {
  itemId: string;
  name: string;
  partNumber: string;
  quantity: number;
  unit: string;
}

export interface PartReturn {
  id: string;
  lines: PartReturnLine[];
  reason: PartReturnReason;
  destination: string;
  workOrderId?: string;
  notes?: string;
  status: PartReturnStatus;
  createdAt: string;
}

const RETURNS_KEY = '@zenfix_part_returns';

export async function loadPartReturns(): Promise<PartReturn[]> {
  try {
    const raw = await AsyncStorage.getItem(RETURNS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PartReturn[];
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

export async function savePartReturn(record: PartReturn): Promise<void> {
  const existing = await loadPartReturns();
  await AsyncStorage.setItem(RETURNS_KEY, JSON.stringify([record, ...existing]));
}
