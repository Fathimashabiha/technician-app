import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraView as CameraViewType,
} from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import {
  ArrowLeft,
  Camera,
  Check,
  Pause,
  Video,
  Mic,
  Play,
  Square,
  Image as ImageIcon,
  Music,
  X,
} from 'lucide-react-native';
import { SHADOWS, useTheme } from '@/app/constants/theme';
import Animated, { FadeInRight, Layout } from 'react-native-reanimated';
import VideoPlayer from '@/components/media/VideoPlayer';
import { isExpoCameraAvailable, getImagePicker } from '@/lib/nativeMedia';
import {
  isExpoAudioAvailable,
  createMaintenanceRecorder,
  createMaintenancePlayer,
  releaseMaintenancePlayer,
  requestMaintenanceMicPermission,
  configureMaintenanceAudioForRecording,
  configureMaintenanceAudioForPlayback,
  subscribeToPlayerFinished,
  type MaintenanceAudioRecorder,
  type MaintenanceAudioPlayer,
} from '@/lib/maintenanceAudio';
import {
  loadEvidence,
  loadIntakeEvidence,
  saveEvidence,
  saveIntakeEvidence,
  type EvidenceItem,
} from '@/lib/evidenceStorage';
import { navigateAfterStep } from '@/lib/executionNavigation';
import { formatCaptureDisplayTime, stampPhoto } from '@/lib/photoWatermark';

type MediaType = 'photo' | 'video' | 'audio';
const MAX_VIDEO_SECONDS = 60;

export default function PhotoCaptureScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const route = useRoute<RouteProp<MaintenanceStackParamList, 'PhotoCapture'>>();
  const { id, type, initialMode, scheduleId, returnTo } = route.params;
  const isIntake = type === 'intake';
  const isPpm = returnTo === 'PpmExecutionDetails' || Boolean(scheduleId);

  const cameraRef = useRef<CameraViewType>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [mode, setMode] = useState<MediaType>(initialMode ?? 'photo');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isStampingPhoto, setIsStampingPhoto] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<MaintenanceAudioRecorder | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<MaintenanceAudioPlayer | null>(null);
  const soundFinishSubRef = useRef<{ remove: () => void } | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const title = isIntake
    ? 'Issue Evidence'
    : type === 'before'
      ? 'Before Evidence'
      : 'After Evidence';
  const subtitle = isIntake ? 'New work order' : isPpm ? `PPM: ${id}` : `WO: ${id}`;
  const isProcessingPhoto = isCapturingPhoto || isStampingPhoto;
  const showLiveCamera =
    (mode === 'photo' || mode === 'video') &&
    isExpoCameraAvailable() &&
    cameraPermission?.granted;

  const getJobLabel = useCallback((): string | undefined => {
    if (isIntake) return 'Intake';
    if (isPpm) return `PPM: ${id}`;
    return `WO: ${id}`;
  }, [id, isIntake, isPpm]);

  const addEvidence = useCallback(
    async (item: Omit<EvidenceItem, 'id'>) => {
      const capturedAt = item.capturedAt ?? new Date().toISOString();
      const newItem: EvidenceItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        capturedAt,
        displayTime:
          item.displayTime ?? formatCaptureDisplayTime(new Date(capturedAt)),
      };

      setEvidence((prev) => {
        const next = [...prev, newItem];
        if (isIntake) {
          void saveIntakeEvidence(next);
        } else {
          void saveEvidence(id, type as 'before' | 'after', next);
        }
        return next;
      });
    },
    [id, type, isIntake],
  );

  const processAndAddPhoto = useCallback(
    async (rawUri: string) => {
      const capturedAt = new Date();
      setIsStampingPhoto(true);
      try {
        const uri = await stampPhoto(rawUri, {
          capturedAt,
          jobLabel: getJobLabel(),
        });
        await addEvidence({
          type: 'photo',
          uri,
          capturedAt: capturedAt.toISOString(),
          displayTime: formatCaptureDisplayTime(capturedAt),
        });
      } finally {
        setIsStampingPhoto(false);
      }
    },
    [addEvidence, getJobLabel],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoadingEvidence(true);
        const saved = isIntake ? await loadIntakeEvidence() : await loadEvidence(id, type);
        if (!cancelled) {
          setEvidence(saved);
          setLoadingEvidence(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id, type, isIntake]),
  );

  useEffect(() => {
    return () => {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      soundFinishSubRef.current?.remove();
      releaseMaintenancePlayer(soundRef.current);
      try {
        recordingRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    setCameraReady(false);
    if (isRecordingVideo && cameraRef.current) {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      try {
        cameraRef.current.stopRecording();
      } catch {
        // ignore mode-switch stop errors
      }
      setIsRecordingVideo(false);
      setVideoRecordSeconds(0);
      videoPromiseRef.current = null;
    }
  }, [mode, isRecordingVideo]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const ensureCameraPermissions = async (): Promise<boolean> => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to capture photos and videos.');
        return false;
      }
    }
    if (mode === 'video' && !micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Please allow microphone access to record video.');
        return false;
      }
    }
    return true;
  };

  const captureWithImagePicker = async (media: 'photo' | 'video') => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert('Camera Unavailable', 'Rebuild the app with expo-camera installed.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: media === 'photo' ? ['images'] : ['videos'],
      quality: media === 'photo' ? 0.85 : 0.7,
      videoMaxDuration: 60,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const capturedAt = new Date();
      if (media === 'photo') {
        await processAndAddPhoto(asset.uri);
      } else {
        await addEvidence({
          type: 'video',
          uri: asset.uri,
          fileName: asset.fileName || 'video_note.mp4',
          capturedAt: capturedAt.toISOString(),
          displayTime: formatCaptureDisplayTime(capturedAt),
        });
      }
    }
  };

  const handleTakePhoto = async () => {
    if (!isExpoCameraAvailable()) {
      await captureWithImagePicker('photo');
      return;
    }
    const allowed = await ensureCameraPermissions();
    if (!allowed || !cameraRef.current || !cameraReady || isProcessingPhoto) return;

    setIsCapturingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await processAndAddPhoto(photo.uri);
      }
    } catch (err) {
      console.error('Photo capture error:', err);
      Alert.alert('Error', 'Could not capture photo.');
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleStartVideo = async () => {
    if (!isExpoCameraAvailable()) {
      await captureWithImagePicker('video');
      return;
    }
    const allowed = await ensureCameraPermissions();
    if (!allowed || !cameraRef.current || !cameraReady || isRecordingVideo) return;

    try {
      setIsRecordingVideo(true);
      setVideoRecordSeconds(0);
      videoTimerRef.current = setInterval(() => {
        setVideoRecordSeconds((prev) => {
          if (prev + 1 >= MAX_VIDEO_SECONDS) {
            handleStopVideo();
            return MAX_VIDEO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
      videoPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: MAX_VIDEO_SECONDS });
    } catch (err) {
      console.error('Video start error:', err);
      setIsRecordingVideo(false);
      Alert.alert('Error', 'Could not start video recording.');
    }
  };

  const handleStopVideo = async () => {
    if (!cameraRef.current || !isRecordingVideo) return;

    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }

    try {
      cameraRef.current.stopRecording();
      const result = await videoPromiseRef.current;
      videoPromiseRef.current = null;
      setIsRecordingVideo(false);
      setVideoRecordSeconds(0);

      if (result?.uri) {
        const capturedAt = new Date();
        await addEvidence({
          type: 'video',
          uri: result.uri,
          fileName: result.uri.split('/').pop() || 'video_note.mp4',
          capturedAt: capturedAt.toISOString(),
          displayTime: formatCaptureDisplayTime(capturedAt),
        });
      }
    } catch (err) {
      console.error('Video stop error:', err);
      setIsRecordingVideo(false);
      Alert.alert('Error', 'Could not save video.');
    }
  };

  const startAudioRecording = async () => {
    if (isRecordingAudio) return;
    if (!isExpoAudioAvailable()) {
      Alert.alert(
        'Voice Note Unavailable',
        'Microphone recording requires a dev build with expo-audio. Rebuild and try again.',
      );
      return;
    }
    try {
      const granted = await requestMaintenanceMicPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow microphone access.');
        return;
      }
      soundFinishSubRef.current?.remove();
      releaseMaintenancePlayer(soundRef.current);
      soundRef.current = null;

      await configureMaintenanceAudioForRecording();
      const recorder = await createMaintenanceRecorder();
      recordingRef.current = recorder;
      recorder.record();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopAudioRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopAudioRecording = async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecordingAudio(false);

    if (!recordingRef.current) return;
    try {
      const status = recordingRef.current.getStatus();
      await recordingRef.current.stop();
      await configureMaintenanceAudioForPlayback();
      const uri = recordingRef.current.uri;
      recordingRef.current = null;
      if (uri) {
        const capturedAt = new Date();
        await addEvidence({
          type: 'audio',
          uri,
          durationSec: Math.max(1, Math.floor((status.durationMillis ?? 0) / 1000)),
          capturedAt: capturedAt.toISOString(),
          displayTime: formatCaptureDisplayTime(capturedAt),
        });
      }
    } catch (err) {
      console.error('Recording stop error:', err);
      recordingRef.current = null;
    }
  };

  const togglePlayAudio = async (item: EvidenceItem) => {
    if (item.type !== 'audio' || !isExpoAudioAvailable()) return;

    if (playingId === item.id) {
      soundRef.current?.pause();
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      setPlayingId(null);
      return;
    }

    try {
      soundFinishSubRef.current?.remove();
      releaseMaintenancePlayer(soundRef.current);
      await configureMaintenanceAudioForPlayback();
      const player = createMaintenancePlayer(item.uri);
      soundRef.current = player;
      soundFinishSubRef.current = subscribeToPlayerFinished(player, () => {
        if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
        setPlayingId(null);
      });
      player.play();
      setPlayingId(item.id);
      playbackIntervalRef.current = setInterval(() => {
        const current = Math.floor(soundRef.current?.currentTime ?? 0);
        if (item.durationSec && current >= item.durationSec) {
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
          setPlayingId(null);
        }
      }, 500);
    } catch (err) {
      Alert.alert('Error', 'Could not play audio.');
    }
  };

  const handleCapture = () => {
    if (mode === 'photo') {
      handleTakePhoto();
      return;
    }
    if (mode === 'video') {
      if (!isRecordingVideo) handleStartVideo();
      else handleStopVideo();
      return;
    }
    if (!isRecordingAudio) startAudioRecording();
    else stopAudioRecording();
  };

  const removeEvidence = async (evidenceId: string) => {
    if (playingId === evidenceId) {
      soundFinishSubRef.current?.remove();
      releaseMaintenancePlayer(soundRef.current);
      soundRef.current = null;
      setPlayingId(null);
    }
    setEvidence((prev) => {
      const next = prev.filter((item) => item.id !== evidenceId);
      if (isIntake) {
        void saveIntakeEvidence(next);
      } else {
        void saveEvidence(id, type, next);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (evidence.length === 0) {
      Alert.alert('No Evidence', 'Please capture at least one photo, video, or audio note.');
      return;
    }
    if (isIntake) {
      navigation.goBack();
      return;
    }
    const step = type === 'before' ? 'before_photos' : 'after_photos';
    navigateAfterStep(navigation, route.params, {
      stepCompleted: step,
      evidence: evidence.map((item) => ({
        id: item.id,
        type: item.type,
        fileName: item.fileName ?? `${item.type}-${item.id}`,
        uri: item.uri,
        capturedAt: item.capturedAt,
        durationSec: item.durationSec,
      })),
    });
  };

  const renderViewfinder = () => {
    if (mode === 'audio') {
      return (
        <>
          <Mic size={64} color={isRecordingAudio ? colors.primary : 'rgba(255,255,255,0.25)'} />
          {isRecordingAudio && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC {formatTime(recordingSeconds)}</Text>
            </View>
          )}
          <Text style={styles.guideText}>
            {isRecordingAudio ? 'Tap stop to save voice note' : 'Tap record to capture audio'}
          </Text>
        </>
      );
    }

    if (!cameraPermission?.granted) {
      return (
        <>
          <Camera size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.guideText}>Camera permission required</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
            <Text style={styles.permissionBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (!isExpoCameraAvailable()) {
      return (
        <>
          <Camera size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.guideText}>Tap shutter to open camera</Text>
        </>
      );
    }

    return (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode={mode === 'video' ? 'video' : 'picture'}
          onCameraReady={() => setCameraReady(true)}
        />
        {!cameraReady && (
          <View style={styles.cameraLoading}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )}
        {isRecordingVideo && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC {formatTime(videoRecordSeconds)}</Text>
          </View>
        )}
        {isStampingPhoto && (
          <View style={styles.stampingOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.stampingText}>Adding timestamp…</Text>
          </View>
        )}
        <Text style={styles.guideTextOverlay}>
          {mode === 'photo'
            ? 'Align and tap shutter to capture'
            : isRecordingVideo
              ? 'Tap stop to finish video'
              : 'Tap shutter to start recording'}
        </Text>
      </>
    );
  };

  const renderThumbnail = (item: EvidenceItem) => {
    if (item.type === 'photo') {
      return <Image source={{ uri: item.uri }} style={styles.evidenceImage} />;
    }
    if (item.type === 'video') {
      return (
        <View style={styles.evidenceIconWrap}>
          <Video size={20} color="#FFF" />
        </View>
      );
    }
    return (
      <View style={styles.evidenceIconWrap}>
        <Music size={20} color="#FFF" />
      </View>
    );
  };

  const photos = evidence.filter((e) => e.type === 'photo');
  const videos = evidence.filter((e) => e.type === 'video');
  const audios = evidence.filter((e) => e.type === 'audio');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleArea}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {isIntake ? (
          <View style={styles.placeholderSide} />
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkOrderDetails', { id, holdWork: true } as any)}
            style={styles.holdButton}
          >
            <Pause size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mainArea}>
        <View style={[styles.viewfinder, showLiveCamera && styles.viewfinderLive]}>
          {renderViewfinder()}
        </View>

        {videos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Latest video</Text>
            <VideoPlayer uri={videos[videos.length - 1].uri} height={120} />
          </View>
        )}

        <View style={styles.galleryArea}>
          <Text style={styles.galleryTitle}>
            CAPTURED — {photos.length} photos · {videos.length} videos · {audios.length} audio
          </Text>
          {loadingEvidence ? (
            <ActivityIndicator color="rgba(255,255,255,0.5)" style={{ marginLeft: 16 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScroll}
            >
              {evidence.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInRight.delay(index * 50)}
                  layout={Layout.springify()}
                  style={styles.evidenceCard}
                >
                  <TouchableOpacity
                    onPress={() => item.type === 'audio' && togglePlayAudio(item)}
                    style={styles.evidenceThumbnail}
                    activeOpacity={0.9}
                  >
                    {renderThumbnail(item)}
                    {item.type === 'audio' && playingId === item.id && (
                      <View style={styles.playingOverlay}>
                        <Play size={16} color="#FFF" fill="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeEvidence(item.id)}>
                    <X size={12} color="#FFF" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
              {evidence.length === 0 && (
                <Text style={styles.emptyText}>No evidence captured yet — use shutter below</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.controlsArea}>
        <View style={styles.modeSelector}>
          {(['photo', 'video', 'audio'] as MediaType[]).map((m) => {
            const Icon = m === 'photo' ? ImageIcon : m === 'video' ? Video : Mic;
            const count =
              m === 'photo' ? photos.length : m === 'video' ? videos.length : audios.length;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
                disabled={isRecordingAudio || isRecordingVideo}
              >
                <Icon size={18} color={mode === m ? colors.primary : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                  {m.toUpperCase()}{count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <View style={styles.placeholderSide} />
          <TouchableOpacity
            onPress={handleCapture}
            style={styles.shutterButton}
            activeOpacity={0.8}
            disabled={isProcessingPhoto || (showLiveCamera && !cameraReady && mode !== 'audio')}
          >
            <View
              style={[
                styles.shutterInner,
                mode === 'video' && { backgroundColor: colors.destructive },
                mode === 'audio' && { backgroundColor: colors.primary },
                (mode === 'video' && isRecordingVideo) || (mode === 'audio' && isRecordingAudio)
                  ? { borderRadius: 8, width: 32, height: 32 }
                  : null,
              ]}
            >
              {mode === 'photo' && (isProcessingPhoto ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Camera size={24} color="#000" />
              ))}
              {mode === 'video' && !isRecordingVideo && <Video size={24} color="#FFF" />}
              {mode === 'video' && isRecordingVideo && <Square size={20} color="#FFF" fill="#FFF" />}
              {mode === 'audio' && !isRecordingAudio && <Mic size={24} color="#FFF" />}
              {mode === 'audio' && isRecordingAudio && <Square size={20} color="#FFF" fill="#FFF" />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitBtn, evidence.length === 0 && styles.submitBtnDisabled]}
            disabled={isRecordingAudio || isRecordingVideo || isProcessingPhoto}
          >
            <Check size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    headerTitleArea: { alignItems: 'center' },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    holdButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 16, fontWeight: '800', color: '#FFF' },
    subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },
    mainArea: { flex: 1 },
    viewfinder: {
      flex: 1,
      margin: 16,
      borderRadius: 32,
      backgroundColor: '#111',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      minHeight: 220,
    },
    viewfinderLive: {
      backgroundColor: '#000',
    },
    cameraLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    guideText: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 24,
      marginTop: 12,
    },
    guideTextOverlay: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      color: '#fff',
      fontSize: 12,
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    permissionBtn: {
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    permissionBtnText: { color: '#fff', fontWeight: '700' },
    recordingIndicator: {
      position: 'absolute',
      top: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
      zIndex: 10,
    },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive },
    recordingText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    stampingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      gap: 10,
      zIndex: 12,
    },
    stampingText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    previewSection: { paddingHorizontal: 16, marginBottom: 4 },
    previewLabel: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    galleryArea: { height: 120, paddingVertical: 8 },
    galleryTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.5)',
      marginLeft: 20,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    galleryScroll: { paddingHorizontal: 16, alignItems: 'center', gap: 12 },
    evidenceCard: {
      width: 72,
      height: 72,
      borderRadius: 12,
      overflow: 'visible',
      position: 'relative',
    },
    evidenceThumbnail: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
    },
    evidenceImage: { width: '100%', height: '100%' },
    evidenceIconWrap: {
      flex: 1,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.destructive,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#000',
    },
    emptyText: {
      color: 'rgba(255,255,255,0.35)',
      fontSize: 12,
      fontStyle: 'italic',
      marginLeft: 4,
      maxWidth: 260,
    },
    controlsArea: { backgroundColor: '#000', paddingBottom: 90, paddingTop: 10 },
    modeSelector: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
    modeBtn: { alignItems: 'center', gap: 6, opacity: 0.55 },
    modeBtnActive: { opacity: 1 },
    modeText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    modeTextActive: { color: colors.primary },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 32,
    },
    placeholderSide: { width: 56 },
    shutterButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.card,
    },
    submitBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)', opacity: 0.5 },
  });
