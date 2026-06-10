import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraView as CameraViewType,
} from 'expo-camera';
import { Camera, Video, Mic } from 'lucide-react-native';
import { isExpoCameraAvailable } from '@/lib/nativeMedia';
import { COLORS } from '@/app/constants/theme';

const MAX_VIDEO_SECONDS = 60;

type Props = {
  mode: 'photo' | 'video' | 'audio';
  isRecordingAudio: boolean;
  audioSeconds: number;
  onPhotoCaptured: (uri: string) => void;
  onVideoCaptured: (uri: string, fileName?: string) => void;
};

export default function EvidenceViewfinder({
  mode,
  isRecordingAudio,
  audioSeconds,
  onPhotoCaptured,
  onVideoCaptured,
}: Props) {
  const cameraRef = useRef<CameraViewType>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'video' && isRecordingVideo) {
      handleStopVideo();
    }
  }, [mode]);

  const ensurePermissions = async (): Promise<boolean> => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return false;
      }
    }
    if (mode === 'video' && !micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Please allow microphone access for video.');
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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) onPhotoCaptured(photo.uri);
    } catch (err) {
      console.error('Photo capture error:', err);
      Alert.alert('Error', 'Could not capture photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleStartVideo = async () => {
    if (!cameraRef.current || !cameraReady || isRecordingVideo) return;
    const allowed = await ensurePermissions();
    if (!allowed) return;

    try {
      setIsRecordingVideo(true);
      setVideoSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setVideoSeconds((prev) => {
          if (prev + 1 >= MAX_VIDEO_SECONDS) {
            handleStopVideo();
            return MAX_VIDEO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
      recordPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: MAX_VIDEO_SECONDS });
    } catch (err) {
      console.error('Video start error:', err);
      setIsRecordingVideo(false);
      Alert.alert('Error', 'Could not start video recording.');
    }
  };

  const handleStopVideo = async () => {
    if (!cameraRef.current || !isRecordingVideo) return;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      cameraRef.current.stopRecording();
      const result = await recordPromiseRef.current;
      recordPromiseRef.current = null;
      setIsRecordingVideo(false);
      setVideoSeconds(0);
      if (result?.uri) {
        const fileName = result.uri.split('/').pop() || 'video_note.mp4';
        onVideoCaptured(result.uri, fileName);
      }
    } catch (err) {
      console.error('Video stop error:', err);
      setIsRecordingVideo(false);
    }
  };

  if (mode === 'audio') {
    return (
      <View style={styles.placeholder}>
        <Mic size={64} color={isRecordingAudio ? COLORS.primary : 'rgba(255,255,255,0.25)'} />
        {isRecordingAudio && (
          <Text style={styles.recordingLabel}>
            Recording {Math.floor(audioSeconds / 60)}:
            {(audioSeconds % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>
    );
  }

  if (!isExpoCameraAvailable()) {
    return (
      <View style={styles.placeholder}>
        <Camera size={64} color="rgba(255,255,255,0.25)" />
        <Text style={styles.hint}>Camera needs a dev build with expo-camera</Text>
      </View>
    );
  }

  if (!cameraPermission?.granted) {
    return (
      <View style={styles.permissionBox}>
        <Camera size={40} color={COLORS.primary} />
        <Text style={styles.permissionText}>Camera access needed</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode={mode === 'video' ? 'video' : 'picture'}
        onCameraReady={() => setCameraReady(true)}
      />
      {!cameraReady && (
        <View style={styles.loading}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}
      {mode === 'video' && isRecordingVideo && (
        <View style={styles.recBadge}>
          <View style={styles.recDot} />
          <Text style={styles.recText}>
            REC {Math.floor(videoSeconds / 60)}:{(videoSeconds % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}
      <View style={styles.captureRow}>
        {mode === 'photo' ? (
          <TouchableOpacity
            style={[styles.shutter, isCapturing && styles.shutterDisabled]}
            onPress={handleTakePhoto}
            disabled={!cameraReady || isCapturing}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        ) : !isRecordingVideo ? (
          <TouchableOpacity
            style={styles.recordStart}
            onPress={handleStartVideo}
            disabled={!cameraReady}
          >
            <Video size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.recordStop} onPress={handleStopVideo}>
            <View style={styles.recordStopInner} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, width: '100%', borderRadius: 28, overflow: 'hidden' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  permissionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionBtnText: { color: '#fff', fontWeight: '700' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  recText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  recordingLabel: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  captureRow: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  shutterDisabled: { opacity: 0.5 },
  recordStart: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.35)',
  },
  recordStop: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordStopInner: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#ef4444' },
});
