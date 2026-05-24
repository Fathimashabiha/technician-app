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
import CaptureCamera from '@/components/media/CaptureCamera';
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
  saveEvidence,
  type EvidenceItem,
} from '@/lib/evidenceStorage';

type MediaType = 'photo' | 'video' | 'audio';

export default function PhotoCaptureScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const route = useRoute<RouteProp<MaintenanceStackParamList, 'PhotoCapture'>>();
  const { id, type } = route.params;

  const [mode, setMode] = useState<MediaType>('photo');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [captureCameraVisible, setCaptureCameraVisible] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<MaintenanceAudioRecorder | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioPlaySeconds, setAudioPlaySeconds] = useState(0);
  const soundRef = useRef<MaintenanceAudioPlayer | null>(null);
  const soundFinishSubRef = useRef<{ remove: () => void } | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const title = type === 'before' ? 'Before Evidence' : 'After Evidence';

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoadingEvidence(true);
        const saved = await loadEvidence(id, type);
        if (!cancelled) {
          setEvidence(saved);
          setLoadingEvidence(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id, type]),
  );

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      soundFinishSubRef.current?.remove();
      releaseMaintenancePlayer(soundRef.current);
      try {
        recordingRef.current?.stop();
      } catch {
        // ignore cleanup
      }
    };
  }, []);

  const persistEvidence = async (items: EvidenceItem[]) => {
    setEvidence(items);
    await saveEvidence(id, type, items);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addEvidence = async (item: Omit<EvidenceItem, 'id' | 'timestamp'>) => {
    const newItem: EvidenceItem = {
      ...item,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
    };
    await persistEvidence([...evidence, newItem]);
  };

  const openPhotoCamera = async () => {
    if (isExpoCameraAvailable()) {
      setCaptureCameraVisible(true);
      return;
    }
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert('Camera Unavailable', 'Rebuild the app with expo-camera to capture photos.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      await addEvidence({ type: 'photo', uri: result.assets[0].uri });
    }
  };

  const openVideoCamera = async () => {
    if (isExpoCameraAvailable()) {
      setCaptureCameraVisible(true);
      return;
    }
    const ImagePicker = getImagePicker();
    if (!ImagePicker) {
      Alert.alert('Camera Unavailable', 'Rebuild the app with expo-camera to record video.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await addEvidence({
        type: 'video',
        uri: asset.uri,
        fileName: asset.fileName || 'video_note.mp4',
      });
    }
  };

  const startAudioRecording = async () => {
    if (isRecording) return;
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
      setIsRecording(true);
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
    setIsRecording(false);

    if (!recordingRef.current) return;
    try {
      const status = recordingRef.current.getStatus();
      await recordingRef.current.stop();
      await configureMaintenanceAudioForPlayback();
      const uri = recordingRef.current.uri;
      recordingRef.current = null;
      if (uri) {
        await addEvidence({
          type: 'audio',
          uri,
          durationSec: Math.max(1, Math.floor((status.durationMillis ?? 0) / 1000)),
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
      setAudioPlaySeconds(0);
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
        setAudioPlaySeconds(0);
      });
      player.play();
      setPlayingId(item.id);
      setAudioPlaySeconds(0);
      playbackIntervalRef.current = setInterval(() => {
        const current = Math.floor(soundRef.current?.currentTime ?? 0);
        setAudioPlaySeconds(current);
        if (item.durationSec && current >= item.durationSec) {
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
          setPlayingId(null);
          setAudioPlaySeconds(0);
        }
      }, 500);
    } catch (err) {
      console.error('Playback error:', err);
      Alert.alert('Error', 'Could not play audio.');
    }
  };

  const handleCapture = () => {
    if (mode === 'photo') {
      openPhotoCamera();
      return;
    }
    if (mode === 'video') {
      openVideoCamera();
      return;
    }
    if (!isRecording) {
      startAudioRecording();
    } else {
      stopAudioRecording();
    }
  };

  const removeEvidence = async (evidenceId: string) => {
    if (playingId === evidenceId) {
      soundFinishSubRef.current?.remove();
      releaseMaintenancePlayer(soundRef.current);
      soundRef.current = null;
      setPlayingId(null);
    }
    await persistEvidence(evidence.filter((item) => item.id !== evidenceId));
  };

  const handleSubmit = async () => {
    if (evidence.length === 0) {
      Alert.alert('No Evidence', 'Please capture at least one piece of evidence before submitting.');
      return;
    }
    const step = type === 'before' ? 'before_photos' : 'after_photos';
    navigation.navigate('WorkOrderDetails', { id, stepCompleted: step } as any);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleArea}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>WO: {id}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('WorkOrderDetails', { id, holdWork: true } as any)}
          style={styles.holdButton}
        >
          <Pause size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainArea}>
        <View style={styles.viewfinder}>
          {mode === 'photo' && <Camera size={64} color="rgba(255,255,255,0.2)" />}
          {mode === 'video' && (
            <Video size={64} color={isRecording ? colors.destructive : 'rgba(255,255,255,0.2)'} />
          )}
          {mode === 'audio' && (
            <Mic size={64} color={isRecording ? colors.primary : 'rgba(255,255,255,0.2)'} />
          )}

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC {formatTime(recordingSeconds)}</Text>
            </View>
          )}

          <Text style={styles.guideText}>
            {mode === 'photo' && 'Tap shutter to open camera and take a photo'}
            {mode === 'video' && 'Tap shutter to open camera and record video'}
            {mode === 'audio' && (isRecording ? 'Tap stop to save voice note' : 'Tap record to capture audio note')}
          </Text>
        </View>

        {evidence.some((e) => e.type === 'video') && (
          <View style={styles.previewSection}>
            {evidence
              .filter((e) => e.type === 'video')
              .slice(-1)
              .map((item) => (
                <VideoPlayer key={item.id} uri={item.uri} height={140} />
              ))}
          </View>
        )}

        <View style={styles.galleryArea}>
          <Text style={styles.galleryTitle}>CAPTURED ({evidence.length})</Text>
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
                <Text style={styles.emptyText}>No evidence captured yet</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.controlsArea}>
        <View style={styles.modeSelector}>
          {(['photo', 'video', 'audio'] as MediaType[]).map((m) => {
            const Icon = m === 'photo' ? ImageIcon : m === 'video' ? Video : Mic;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
                disabled={isRecording}
              >
                <Icon size={18} color={mode === m ? colors.primary : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                  {m.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <View style={styles.placeholderSide} />
          <TouchableOpacity onPress={handleCapture} style={styles.shutterButton} activeOpacity={0.8}>
            <View
              style={[
                styles.shutterInner,
                mode === 'video' && { backgroundColor: colors.destructive },
                mode === 'audio' && isRecording && {
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  backgroundColor: colors.primary,
                },
                mode === 'audio' && !isRecording && { backgroundColor: colors.primary },
              ]}
            >
              {mode === 'photo' && <Camera size={24} color="#000" />}
              {mode === 'video' && <Video size={24} color="#FFF" />}
              {mode === 'audio' && !isRecording && <Mic size={24} color="#FFF" />}
              {mode === 'audio' && isRecording && <Square size={20} color="#FFF" fill="#FFF" />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitBtn, evidence.length === 0 && styles.submitBtnDisabled]}
            disabled={isRecording}
          >
            <Check size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <CaptureCamera
        visible={captureCameraVisible && (mode === 'photo' || mode === 'video')}
        mode={mode === 'video' ? 'video' : 'photo'}
        onClose={() => setCaptureCameraVisible(false)}
        onPhotoCaptured={async (uri) => {
          await addEvidence({ type: 'photo', uri });
        }}
        onVideoCaptured={async (uri, fileName) => {
          await addEvidence({ type: 'video', uri, fileName });
        }}
      />
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
    },
    guideText: {
      position: 'absolute',
      bottom: 32,
      color: 'rgba(255,255,255,0.4)',
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    recordingIndicator: {
      position: 'absolute',
      top: 32,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
    },
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive },
    recordingText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    previewSection: { paddingHorizontal: 16, marginBottom: 8 },
    galleryArea: { height: 110, paddingVertical: 10 },
    galleryTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.5)',
      marginLeft: 20,
      marginBottom: 8,
      letterSpacing: 1,
    },
    galleryScroll: { paddingHorizontal: 16, alignItems: 'center', gap: 12 },
    evidenceCard: {
      width: 64,
      height: 64,
      borderRadius: 12,
      overflow: 'visible',
      position: 'relative',
    },
    evidenceThumbnail: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    evidenceImage: { width: '100%', height: '100%' },
    evidenceIconWrap: {
      flex: 1,
      backgroundColor: '#444',
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
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.destructive,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#000',
    },
    emptyText: {
      color: 'rgba(255,255,255,0.3)',
      fontSize: 13,
      fontStyle: 'italic',
      marginLeft: 4,
    },
    controlsArea: { backgroundColor: '#000', paddingBottom: 90, paddingTop: 10 },
    modeSelector: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 24 },
    modeBtn: { alignItems: 'center', gap: 6, opacity: 0.6 },
    modeBtnActive: { opacity: 1 },
    modeText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
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
