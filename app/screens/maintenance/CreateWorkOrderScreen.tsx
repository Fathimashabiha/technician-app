import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import {
  ArrowLeft,
  Scan,
  MapPin,
  Camera,
  Mic,
  Check,
  X,
  ChevronRight,
  Video,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/app/constants/theme';
import { Card } from '@/components/ui/Card';
import AssetQrScanner from '@/components/media/AssetQrScanner';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  createWorkOrderFromScan,
  previewScanForWorkOrder,
  type ScanPreview,
} from '@/lib/intakeService';
import {
  clearIntakeEvidence,
  loadIntakeEvidence,
  type EvidenceItem,
} from '@/lib/evidenceStorage';

export default function CreateWorkOrderScreen() {
  const { colors, shadows, isDark } = useTheme();
  const styles = getStyles(colors, shadows, isDark);
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const insets = useSafeAreaInsets();

  const [scope, setScope] = useState<'asset' | 'location'>('asset');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState('Reactive');
  const [issueCategory, setIssueCategory] = useState('Mechanical');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [scanPreview, setScanPreview] = useState<ScanPreview | null>(null);
  const [resolvingScan, setResolvingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [intakeEvidence, setIntakeEvidence] = useState<EvidenceItem[]>([]);

  const refreshIntakeEvidence = useCallback(() => {
    loadIntakeEvidence().then(setIntakeEvidence);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshIntakeEvidence();
    }, [refreshIntakeEvidence])
  );

  const mediaCounts = {
    photo: intakeEvidence.filter((e) => e.type === 'photo').length,
    video: intakeEvidence.filter((e) => e.type === 'video').length,
    audio: intakeEvidence.filter((e) => e.type === 'audio').length,
  };

  const openLiveCapture = (mode: 'photo' | 'video' | 'audio') => {
    navigation.navigate('PhotoCapture', {
      id: 'intake',
      type: 'intake',
      initialMode: mode,
    });
  };

  const resetScan = useCallback(() => {
    setScanPreview(null);
    setScanError(null);
    setManualCode('');
    setScannerOpen(false);
  }, []);

  const changeScope = (next: 'asset' | 'location') => {
    setScope(next);
    resetScan();
  };

  const applyScan = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value || resolvingScan) return;

      setResolvingScan(true);
      setScanError(null);
      try {
        const preview = await previewScanForWorkOrder(value, scope);
        setScanPreview(preview);
        setManualCode(value);
        setScannerOpen(false);
        setScanError(null);
      } catch (err) {
        setScanPreview(null);
        setScanError(err instanceof Error ? err.message : 'Scan failed');
      } finally {
        setResolvingScan(false);
      }
    },
    [scope, resolvingScan]
  );

  const scanHint =
    scope === 'asset'
      ? 'Scan the asset QR or barcode on the equipment tag'
      : 'Scan the location QR posted at the site';

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Enter a short title for the work order.');
      return;
    }
    if (!scanPreview?.scanToken) {
      Alert.alert(
        'Scan required',
        scope === 'location'
          ? 'Scan a location QR code before submitting.'
          : 'Scan an asset QR or barcode before submitting.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await createWorkOrderFromScan({
        scope,
        scanToken: scanPreview.scanToken,
        title: title.trim(),
        description: description.trim(),
        woType: workType,
        category: issueCategory,
      });

      await clearIntakeEvidence();
      setIntakeEvidence([]);

      const workOrderId = result.workOrderId || result.id;

      Alert.alert(
        'Request submitted',
        `${workOrderId} was sent to the work order webapp for manager approval. You can track it under My Requests until it is approved.`,
        [
          {
            text: 'View My Requests',
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [{ name: 'MaintenanceHome' }, { name: 'RequestList' }],
              });
            },
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Could not create work order',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderDropdownModal = () => {
    if (!activeDropdown) return null;

    let modalTitle = '';
    let options: string[] = [];
    let currentVal = '';
    let setter: (val: string) => void = () => {};
    let iconColor = colors.primary;

    switch (activeDropdown) {
      case 'type':
        modalTitle = 'Work Order Type';
        options = ['Reactive', 'Breakdown', 'Service Request'];
        currentVal = workType;
        setter = setWorkType;
        break;
      case 'category':
        modalTitle = 'Issue Category';
        options = ['Mechanical', 'Electrical', 'Plumbing', 'HVAC', 'General', 'Civil', 'Security'];
        currentVal = issueCategory;
        setter = setIssueCategory;
        iconColor = colors.secondary;
        break;
      default:
        return null;
    }

    return (
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setActiveDropdown(null)} />
        <Animated.View entering={FadeInDown} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={() => setActiveDropdown(null)}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: Dimensions.get('window').height * 0.5 }}
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.modalItem}
                onPress={() => {
                  setter(opt);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.modalItemText, currentVal === opt && { color: iconColor }]}>
                  {opt}
                </Text>
                {currentVal === opt && <Check size={18} color={iconColor} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  const scanSectionLabel =
    scope === 'asset' ? 'Scan Asset QR / Barcode' : 'Scan Location QR';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={18} color={isDark ? '#FFF' : colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>New Work Order</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.scopeToggleContainer}>
            <TouchableOpacity
              style={[styles.scopeBtn, scope === 'asset' && styles.scopeBtnActive]}
              onPress={() => changeScope('asset')}
            >
              <Scan size={16} color={scope === 'asset' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.scopeBtnText, scope === 'asset' && { color: colors.foreground }]}>
                Asset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeBtn, scope === 'location' && styles.scopeBtnActive]}
              onPress={() => changeScope('location')}
            >
              <MapPin size={16} color={scope === 'location' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
              <Text
                style={[styles.scopeBtnText, scope === 'location' && { color: colors.foreground }]}
              >
                Location
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInUp.delay(50)} style={styles.section}>
            <Card style={styles.fieldCard}>
              <Text style={styles.innerLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief title..."
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
              />
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
            <Card style={styles.fieldCard}>
              <Text style={styles.innerLabel}>Description</Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Details..."
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
              />
            </Card>
          </Animated.View>

          <View style={[styles.row, { marginBottom: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Type</Text>
              <TouchableOpacity style={styles.dropdownField} onPress={() => setActiveDropdown('type')}>
                <Text style={styles.dropdownValue} numberOfLines={1}>
                  {workType}
                </Text>
                <ChevronRight size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => setActiveDropdown('category')}
              >
                <Text style={[styles.dropdownValue, { color: colors.secondary }]} numberOfLines={1}>
                  {issueCategory}
                </Text>
                <ChevronRight size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View entering={FadeIn} key={scope} style={styles.scanBlock}>
            <Text style={styles.sectionLabel}>{scanSectionLabel}</Text>

            {scanPreview ? (
              <View>
                <View style={[styles.scanTrigger, styles.scanTriggerSuccess]}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.scanGradient}>
                    <Check size={20} color="#FFF" />
                    <Text style={[styles.scanText, { color: '#FFF' }]}>
                      {scope === 'asset' ? 'Asset identified' : 'Location identified'}
                    </Text>
                  </LinearGradient>
                </View>
                <Animated.View entering={FadeInUp} style={styles.autoDataGrid}>
                  <View style={styles.dataNode}>
                    <Text style={styles.dataLabel}>{scope === 'asset' ? 'Asset' : 'Location'}</Text>
                    <Text style={styles.dataValue} numberOfLines={2}>
                      {scanPreview.label}
                    </Text>
                  </View>
                  <View style={styles.dataNode}>
                    <Text style={styles.dataLabel}>Site</Text>
                    <Text style={styles.dataValue} numberOfLines={2}>
                      {scanPreview.property}
                    </Text>
                  </View>
                  <View style={[styles.dataNode, { flexBasis: '100%' }]}>
                    <Text style={styles.dataLabel}>Details</Text>
                    <Text style={styles.dataValue} numberOfLines={2}>
                      {scanPreview.location}
                    </Text>
                  </View>
                </Animated.View>
                <TouchableOpacity style={styles.rescanBtn} onPress={resetScan}>
                  <Text style={styles.rescanText}>Scan again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={styles.scanCta}
                  onPress={() => {
                    setScanError(null);
                    setScannerOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.scanCtaIcon}>
                    {scope === 'asset' ? (
                      <Scan size={26} color={colors.primary} />
                    ) : (
                      <MapPin size={26} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.scanCtaTextWrap}>
                    <Text style={styles.scanCtaTitle}>Open camera to scan</Text>
                    <Text style={styles.scanCtaSub}>{scanHint}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </TouchableOpacity>

                {scanError && !scannerOpen ? (
                  <Text style={styles.scanErrorInline}>{scanError}</Text>
                ) : null}

                <Card style={styles.manualCard}>
                  <Text style={styles.manualLabel}>Or enter code manually</Text>
                  <View style={styles.manualRow}>
                    <TextInput
                      style={styles.manualInput}
                      placeholder={scope === 'location' ? 'Location QR token' : 'Asset QR / barcode'}
                      placeholderTextColor={colors.mutedForeground}
                      value={manualCode}
                      onChangeText={(t) => {
                        setManualCode(t);
                        if (scanError) setScanError(null);
                      }}
                      editable={!resolvingScan}
                    />
                    <TouchableOpacity
                      style={[
                        styles.manualBtn,
                        (!manualCode.trim() || resolvingScan) && styles.manualBtnDisabled,
                      ]}
                      onPress={() => applyScan(manualCode)}
                      disabled={resolvingScan || !manualCode.trim()}
                    >
                      {resolvingScan ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.manualBtnText}>Verify</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              </View>
            )}
          </Animated.View>

          <View style={[styles.section, { marginBottom: 32 }]}>
            <Text style={styles.sectionLabel}>Attachments</Text>
            <View style={styles.mediaRow}>
              <TouchableOpacity
                style={[styles.mediaSlot, mediaCounts.photo > 0 && styles.mediaSlotActive]}
                onPress={() => openLiveCapture('photo')}
                activeOpacity={0.85}
              >
                <Camera
                  size={18}
                  color={mediaCounts.photo > 0 ? '#FFF' : 'rgba(255,255,255,0.4)'}
                />
                <Text
                  style={[styles.mediaText, mediaCounts.photo > 0 && { color: colors.foreground }]}
                >
                  Photo
                </Text>
                {mediaCounts.photo > 0 ? (
                  <View style={styles.mediaBadge}>
                    <Text style={styles.mediaBadgeText}>{mediaCounts.photo}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaSlot, mediaCounts.video > 0 && styles.mediaSlotActive]}
                onPress={() => openLiveCapture('video')}
                activeOpacity={0.85}
              >
                <Video
                  size={18}
                  color={mediaCounts.video > 0 ? '#FFF' : 'rgba(255,255,255,0.4)'}
                />
                <Text
                  style={[styles.mediaText, mediaCounts.video > 0 && { color: colors.foreground }]}
                >
                  Video
                </Text>
                {mediaCounts.video > 0 ? (
                  <View style={styles.mediaBadge}>
                    <Text style={styles.mediaBadgeText}>{mediaCounts.video}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaSlot, mediaCounts.audio > 0 && styles.mediaSlotActive]}
                onPress={() => openLiveCapture('audio')}
                activeOpacity={0.85}
              >
                <Mic
                  size={18}
                  color={mediaCounts.audio > 0 ? '#FFF' : 'rgba(255,255,255,0.4)'}
                />
                <Text
                  style={[styles.mediaText, mediaCounts.audio > 0 && { color: colors.foreground }]}
                >
                  Audio
                </Text>
                {mediaCounts.audio > 0 ? (
                  <View style={styles.mediaBadge}>
                    <Text style={styles.mediaBadgeText}>{mediaCounts.audio}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
            {intakeEvidence.length > 0 ? (
              <Text style={styles.mediaHint}>
                {mediaCounts.photo} photo{mediaCounts.photo === 1 ? '' : 's'} · {mediaCounts.video}{' '}
                video{mediaCounts.video === 1 ? '' : 's'} · {mediaCounts.audio} audio — tap to add
                more
              </Text>
            ) : (
              <Text style={styles.mediaHint}>
                Tap Photo, Video, or Audio to open the live camera / recorder
              </Text>
            )}
          </View>

          <View style={styles.footerInner}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Check size={20} color="#FFF" />
                )}
                <Text style={styles.submitText}>
                  {submitting ? 'Submitting…' : 'Submit for Approval'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderDropdownModal()}

      <Modal
        visible={scannerOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={[styles.scanModal, { paddingTop: insets.top }]}>
          <View style={styles.scanModalHeader}>
            <Text style={styles.scanModalTitle}>
              {scope === 'asset' ? 'Scan asset' : 'Scan location'}
            </Text>
            <TouchableOpacity
              style={styles.scanModalClose}
              onPress={() => setScannerOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={22} color="#f8fafc" />
            </TouchableOpacity>
          </View>
          <View style={styles.scanModalBody}>
            <AssetQrScanner
              layout="full"
              hintText={scanHint}
              onScanSuccess={applyScan}
              isResolving={resolvingScan}
              errorMessage={scanError}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, shadows: any, isDark: boolean) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 10,
      gap: 12,
      backgroundColor: colors.background,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.panel,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
    content: { flex: 1, paddingHorizontal: 16 },
    scopeToggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.panel,
      padding: 3,
      borderRadius: 12,
      marginBottom: 16,
    },
    scopeBtn: {
      flex: 1,
      flexDirection: 'row',
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      gap: 6,
    },
    scopeBtnActive: {
      backgroundColor: colors.primary,
      ...shadows.card,
    },
    scopeBtnText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
    section: { marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    fieldCard: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    innerLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    textInput: { color: colors.foreground, fontSize: 15, fontWeight: '600', paddingVertical: 2 },
    textArea: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '500',
      height: 60,
      textAlignVertical: 'top',
      paddingVertical: 2,
    },
    dropdownField: {
      height: 44,
      backgroundColor: colors.panel,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownValue: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '700' },
    scanBlock: { marginBottom: 16 },
    scanCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      ...shadows.card,
    },
    scanCtaIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanCtaTextWrap: { flex: 1, gap: 4 },
    scanCtaTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground },
    scanCtaSub: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },
    scanErrorInline: {
      fontSize: 12,
      color: '#ef4444',
      marginBottom: 10,
      marginTop: -4,
      paddingHorizontal: 4,
    },
    scanModal: { flex: 1, backgroundColor: '#0f172a' },
    scanModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    scanModalTitle: { fontSize: 18, fontWeight: '800', color: '#f8fafc' },
    scanModalClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanModalBody: { flex: 1 },
    scanTrigger: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderStyle: 'dashed',
    },
    scanTriggerSuccess: { borderStyle: 'solid', borderColor: '#10B981' },
    scanGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
    scanText: { fontSize: 13, fontWeight: '800', color: colors.primary },
    autoDataGrid: {
      marginTop: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    dataNode: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : colors.primary + '1A',
      padding: 10,
      borderRadius: 10,
    },
    dataLabel: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    dataValue: { fontSize: 11, fontWeight: '700', color: colors.foreground },
    rescanBtn: { marginTop: 10, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
    rescanText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    manualCard: {
      backgroundColor: colors.panel,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    manualLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.mutedForeground,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    manualRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    manualInput: {
      flex: 1,
      height: 48,
      color: colors.foreground,
      fontSize: 14,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    manualBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      height: 48,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualBtnDisabled: { opacity: 0.45 },
    manualBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    mediaRow: { flexDirection: 'row', gap: 8 },
    mediaSlot: {
      flex: 1,
      height: 58,
      borderRadius: 14,
      backgroundColor: colors.panel,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    mediaSlotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    mediaText: { fontSize: 9, fontWeight: '700', color: colors.mutedForeground },
    mediaBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    mediaBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
    mediaHint: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 8,
      lineHeight: 15,
      paddingHorizontal: 2,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
      zIndex: 2000,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
    modalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.panel,
    },
    modalItemText: { fontSize: 15, fontWeight: '600', color: colors.mutedForeground },
    footerInner: { marginTop: 20, marginBottom: 40 },
    submitBtn: { borderRadius: 20, overflow: 'hidden', ...shadows.card },
    submitGradient: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  });
