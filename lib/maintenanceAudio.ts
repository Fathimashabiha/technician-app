import { requireOptionalNativeModule } from "expo-modules-core";
import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";

const PLAYBACK_STATUS_UPDATE = "playbackStatusUpdate";

export type MaintenanceAudioRecorder = InstanceType<typeof AudioModule.AudioRecorder>;
export type MaintenanceAudioPlayer = AudioPlayer;

let audioChecked = false;
let audioAvailable = false;
let videoChecked = false;
let videoAvailable = false;

export function isExpoAudioAvailable(): boolean {
  if (!audioChecked) {
    audioChecked = true;
    try {
      audioAvailable =
        requireOptionalNativeModule("ExpoAudio") != null &&
        AudioModule?.AudioRecorder != null;
    } catch {
      audioAvailable = false;
    }
  }
  return audioAvailable;
}

export function isExpoVideoAvailable(): boolean {
  if (!videoChecked) {
    videoChecked = true;
    try {
      videoAvailable = requireOptionalNativeModule("ExpoVideo") != null;
    } catch {
      videoAvailable = false;
    }
  }
  return videoAvailable;
}

export async function requestMaintenanceMicPermission(): Promise<boolean> {
  if (!isExpoAudioAvailable()) return false;
  const status = await requestRecordingPermissionsAsync();
  return status.granted;
}

export async function configureMaintenanceAudioForRecording(): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
}

export async function configureMaintenanceAudioForPlayback(): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
}

export async function createMaintenanceRecorder(): Promise<MaintenanceAudioRecorder> {
  if (!isExpoAudioAvailable()) {
    throw new Error("expo-audio native module is not available");
  }
  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await recorder.prepareToRecordAsync();
  return recorder;
}

export function createMaintenancePlayer(source: string): MaintenanceAudioPlayer {
  return createAudioPlayer(source);
}

export function releaseMaintenancePlayer(player: MaintenanceAudioPlayer | null | undefined): void {
  try {
    player?.remove();
  } catch {
    // Player may already be released.
  }
}

export function subscribeToPlayerFinished(
  player: MaintenanceAudioPlayer,
  onFinished: () => void,
): { remove: () => void } {
  return player.addListener(PLAYBACK_STATUS_UPDATE, (status: AudioStatus) => {
    if (status.didJustFinish) onFinished();
  });
}
