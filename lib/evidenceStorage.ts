import AsyncStorage from "@react-native-async-storage/async-storage";

export type EvidenceItem = {
  id: string;
  type: "photo" | "video" | "audio";
  uri: string;
  timestamp: string;
  durationSec?: number;
  fileName?: string;
};

const evidenceKey = (workOrderId: string, phase: "before" | "after") =>
  `@zenfix_evidence_${workOrderId}_${phase}`;

export async function loadEvidence(
  workOrderId: string,
  phase: "before" | "after",
): Promise<EvidenceItem[]> {
  try {
    const raw = await AsyncStorage.getItem(evidenceKey(workOrderId, phase));
    if (!raw) return [];
    return JSON.parse(raw) as EvidenceItem[];
  } catch {
    return [];
  }
}

export async function saveEvidence(
  workOrderId: string,
  phase: "before" | "after",
  items: EvidenceItem[],
): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(evidenceKey(workOrderId, phase));
    return;
  }
  await AsyncStorage.setItem(evidenceKey(workOrderId, phase), JSON.stringify(items));
}

const INTAKE_EVIDENCE_KEY = "@zenfix_intake_evidence";

export async function loadIntakeEvidence(): Promise<EvidenceItem[]> {
  try {
    const raw = await AsyncStorage.getItem(INTAKE_EVIDENCE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EvidenceItem[];
  } catch {
    return [];
  }
}

export async function saveIntakeEvidence(items: EvidenceItem[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(INTAKE_EVIDENCE_KEY);
    return;
  }
  await AsyncStorage.setItem(INTAKE_EVIDENCE_KEY, JSON.stringify(items));
}

export async function clearIntakeEvidence(): Promise<void> {
  await AsyncStorage.removeItem(INTAKE_EVIDENCE_KEY);
}
