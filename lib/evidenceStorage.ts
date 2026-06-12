import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCaptureDisplayTime } from "./photoWatermark";

export type EvidenceItem = {
  id: string;
  type: "photo" | "video" | "audio";
  uri: string;
  capturedAt: string;
  displayTime?: string;
  durationSec?: number;
  fileName?: string;
};

type StoredEvidenceItem = EvidenceItem & { timestamp?: string };

function normalizeEvidenceItem(raw: StoredEvidenceItem): EvidenceItem {
  if (raw.capturedAt) {
    return {
      id: raw.id,
      type: raw.type,
      uri: raw.uri,
      capturedAt: raw.capturedAt,
      displayTime: raw.displayTime ?? formatCaptureDisplayTime(new Date(raw.capturedAt)),
      durationSec: raw.durationSec,
      fileName: raw.fileName,
    };
  }

  const capturedAt = new Date().toISOString();
  return {
    id: raw.id,
    type: raw.type,
    uri: raw.uri,
    capturedAt,
    displayTime: raw.timestamp ?? raw.displayTime ?? formatCaptureDisplayTime(new Date()),
    durationSec: raw.durationSec,
    fileName: raw.fileName,
  };
}

function normalizeEvidenceList(items: StoredEvidenceItem[]): EvidenceItem[] {
  return items.map(normalizeEvidenceItem);
}

const evidenceKey = (workOrderId: string, phase: "before" | "after") =>
  `@zenfix_evidence_${workOrderId}_${phase}`;

export async function loadEvidence(
  workOrderId: string,
  phase: "before" | "after",
): Promise<EvidenceItem[]> {
  try {
    const raw = await AsyncStorage.getItem(evidenceKey(workOrderId, phase));
    if (!raw) return [];
    return normalizeEvidenceList(JSON.parse(raw) as StoredEvidenceItem[]);
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
    return normalizeEvidenceList(JSON.parse(raw) as StoredEvidenceItem[]);
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
