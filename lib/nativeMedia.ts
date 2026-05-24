import { requireOptionalNativeModule } from "expo-modules-core";

let imagePickerModule: typeof import("expo-image-picker") | null = null;
let expoCameraChecked = false;
let expoCameraAvailable = false;

/** True when the native expo-camera module is linked in the current build. */
export function isExpoCameraAvailable(): boolean {
  if (!expoCameraChecked) {
    expoCameraChecked = true;
    try {
      expoCameraAvailable = requireOptionalNativeModule("ExpoCamera") != null;
    } catch {
      expoCameraAvailable = false;
    }
  }
  return expoCameraAvailable;
}

export {
  isExpoAudioAvailable,
  isExpoVideoAvailable,
  isExpoAudioAvailable as isNativeAudioAvailable,
} from "./maintenanceAudio";

export function getImagePicker(): typeof import("expo-image-picker") | null {
  if (!imagePickerModule) {
    try {
      imagePickerModule = require("expo-image-picker");
    } catch {
      imagePickerModule = null;
    }
  }
  return imagePickerModule;
}
