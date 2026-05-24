import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraView as CameraViewType,
} from "expo-camera";
import { X, SwitchCamera, Circle, Square } from "lucide-react-native";
import { COLORS } from "@/app/constants/theme";

const MAX_VIDEO_SECONDS = 60;

type Props = {
  visible: boolean;
  mode: "photo" | "video";
  onClose: () => void;
  onPhotoCaptured: (uri: string) => void;
  onVideoCaptured: (uri: string, fileName?: string) => void;
};

export default function CaptureCameraNative({
  visible,
  mode,
  onClose,
  onPhotoCaptured,
  onVideoCaptured,
}: Props) {
  const cameraRef = useRef<CameraViewType>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setIsCapturing(false);
      setIsRecording(false);
      setRecordSeconds(0);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      recordPromiseRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const ensurePermissions = async (): Promise<boolean> => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Please allow camera access to capture media.");
        return false;
      }
    }
    if (mode === "video" && !micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Please allow microphone access to record video.");
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    const allowed = await ensurePermissions();
    if (!allowed) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        onPhotoCaptured(photo.uri);
        onClose();
      }
    } catch (err) {
      console.error("Photo capture error:", err);
      Alert.alert("Error", "Could not capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current || !cameraReady || isRecording) return;
    const allowed = await ensurePermissions();
    if (!allowed) return;

    try {
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev + 1 >= MAX_VIDEO_SECONDS) {
            handleStopRecording();
            return MAX_VIDEO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);

      recordPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: MAX_VIDEO_SECONDS,
      });
    } catch (err) {
      console.error("Video record start error:", err);
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      Alert.alert("Error", "Could not start video recording. Please try again.");
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    try {
      cameraRef.current.stopRecording();
      const result = await recordPromiseRef.current;
      recordPromiseRef.current = null;
      setIsRecording(false);
      setRecordSeconds(0);

      if (result?.uri) {
        const fileName = result.uri.split("/").pop() || "video_note.mp4";
        onVideoCaptured(result.uri, fileName);
        onClose();
      }
    } catch (err) {
      console.error("Video record stop error:", err);
      setIsRecording(false);
      Alert.alert("Error", "Could not save video. Please try again.");
    }
  };

  const renderPermissionState = () => (
    <View style={styles.permissionBox}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.permissionTitle}>Setting up camera...</Text>
      <TouchableOpacity
        style={styles.permissionBtn}
        onPress={async () => {
          await requestCameraPermission();
          if (mode === "video") await requestMicPermission();
        }}
      >
        <Text style={styles.permissionBtnText}>Allow Access</Text>
      </TouchableOpacity>
    </View>
  );

  const needsCameraPermission = !cameraPermission?.granted;
  const needsMicPermission = mode === "video" && !micPermission?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {needsCameraPermission || needsMicPermission ? (
          renderPermissionState()
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              mode={mode === "video" ? "video" : "picture"}
              onCameraReady={() => setCameraReady(true)}
            />

            <View style={styles.topBar}>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose} disabled={isRecording}>
                <X size={22} color="white" />
              </TouchableOpacity>
              <Text style={styles.titleText}>
                {mode === "photo" ? "Take Photo" : "Record Video"}
              </Text>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}
                disabled={isRecording || isCapturing}
              >
                <SwitchCamera size={22} color="white" />
              </TouchableOpacity>
            </View>

            {!cameraReady && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="white" size="large" />
              </View>
            )}

            <View style={styles.bottomBar}>
              {mode === "photo" ? (
                <TouchableOpacity
                  style={[styles.captureOuter, isCapturing && styles.captureDisabled]}
                  onPress={handleTakePhoto}
                  disabled={!cameraReady || isCapturing}
                >
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              ) : (
                <View style={styles.videoControls}>
                  <Text style={styles.timerText}>
                    {Math.floor(recordSeconds / 60)}:
                    {(recordSeconds % 60).toString().padStart(2, "0")} / 1:00
                  </Text>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={styles.recordStartBtn}
                      onPress={handleStartRecording}
                      disabled={!cameraReady}
                    >
                      <Circle size={28} color="#ef4444" fill="#ef4444" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.recordStopBtn} onPress={handleStopRecording}>
                      <Square size={22} color="white" fill="white" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  titleText: { color: "white", fontSize: 16, fontWeight: "700" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "white" },
  captureDisabled: { opacity: 0.6 },
  videoControls: { alignItems: "center", gap: 14 },
  timerText: { color: "white", fontSize: 14, fontWeight: "700" },
  recordStartBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  recordStopBtn: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0f172a",
  },
  permissionTitle: { color: "white", fontSize: 16, fontWeight: "700", marginTop: 16 },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: { color: "white", fontWeight: "700" },
});
