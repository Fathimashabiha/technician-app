import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '@/app/types/navigation';
import { fetchExternalAsset } from '@/lib/assetService';
import { fetchExternalLocation } from '@/lib/locationService';
import type { Asset } from '@/lib/types/asset';
import type { Location } from '@/lib/types/location';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/Card';
import { SHADOWS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ppmStepNavParams } from '@/lib/executionNavigation';
import { prepareEvidenceUploadFiles } from '@/lib/mediaUpload';
import {
  getPpmScheduleDetail,
  startPpmExecution,
  completePpmStep,
  submitPpmExecution,
  updatePpmChecklistItem,
  buildPpmStepPayloadFromUi,
  holdPpmExecution,
  resumePpmExecution,
  type PpmScheduleDetail,
} from '@/lib/ppmService';
import {
  fetchWorkOrderByPpmSchedule,
  holdWorkOrder,
  resumeWorkOrder,
} from '@/lib/workOrderService';
import {
  ArrowLeft,
  MapPin,
  Play,
  Camera,
  ClipboardList,
  ImageIcon,
  PenLine,
  Package,
  CheckCircle2,
  ChevronRight,
  Navigation,
  Timer,
  Barcode,
  Pause,
  BookOpen,
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList, 'PpmExecutionDetails'>;
type RouteType = RouteProp<MoreStackParamList, 'PpmExecutionDetails'>;

const STEPS = [
  { id: 'start', label: 'Start Work', desc: 'Begin PPM execution and load the asset checklist', Icon: Play, action: 'Start Work' },
  { id: 'qr_scan', label: 'Verify Asset', desc: 'Scan asset QR to verify you are at the correct asset', Icon: Barcode, action: 'Verify Asset' },
  { id: 'before_photos', label: 'Before Photos', desc: 'Capture photos before starting work', Icon: Camera, action: 'Take Photos' },
  { id: 'checklist', label: 'Execute Checklist', desc: 'Complete all checklist items', Icon: ClipboardList, action: 'Open Checklist' },
  { id: 'parts', label: 'Parts Used', desc: 'Record and update materials used', Icon: Package, action: 'Update Parts' },
  { id: 'after_photos', label: 'After Photos', desc: 'Capture photos after completing work', Icon: ImageIcon, action: 'Take After Photos' },
  { id: 'signature', label: 'Digital Signature', desc: 'Sign off on the completed PPM', Icon: PenLine, action: 'Sign Off' },
] as const;

function formatPpmStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    PENDING_REVIEW: 'Pending Review',
    PASSED: 'Passed',
    FAILED: 'Failed',
    COMPLETED: 'Completed',
  };
  return map[status] ?? status;
}

export default function PpmExecutionDetails() {
  const { colors, gradients, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const scheduleId = route.params.scheduleId;
  const titleParam = route.params.title;

  const [schedule, setSchedule] = useState<PpmScheduleDetail | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [locationDetails, setLocationDetails] = useState<Location | null>(null);
  const [linkedWorkOrder, setLinkedWorkOrder] = useState<{ scope?: 'asset' | 'location'; locationRef?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendBusy, setBackendBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [usedParts, setUsedParts] = useState<{ id: string; name: string; quantity: number }[]>([]);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [linkedWorkOrderId, setLinkedWorkOrderId] = useState<string | null>(null);

  const isLocationPpm = schedule?.scope === 'location' || (!schedule?.assetId && !!schedule?.locationName);

  const workflowSteps = useMemo(() => {
    if (!isLocationPpm) return [...STEPS];
    return STEPS.map((s) =>
      s.id === 'qr_scan'
        ? {
            ...s,
            label: 'Verify Location',
            desc: 'Scan location QR to verify you are on site',
            action: 'Verify Location',
          }
        : s
    );
  }, [isLocationPpm]);

  const openAssetDetails = (opts?: { reviewMode?: boolean; initialView?: 'details' | 'manuals' | 'history' }) => {
    const assetRef = schedule?.assetId ?? asset?.id;
    if (!assetRef) return;
    navigation.navigate('AssetDetails', {
      assetId: assetRef,
      isReviewMode: opts?.reviewMode,
      workOrderId: scheduleId,
      scheduleId,
      returnTo: 'PpmExecutionDetails',
      initialView: opts?.initialView,
    });
  };

  const openLocationDetails = (opts?: { reviewMode?: boolean }) => {
    const locationRef =
      locationDetails?.id ??
      schedule?.locationId ??
      schedule?.locationRef ??
      linkedWorkOrder?.locationRef ??
      undefined;
    if (!locationRef) return;
    navigation.navigate('LocationDetails', {
      locationId: locationRef,
      isReviewMode: opts?.reviewMode,
      workOrderId: scheduleId,
      scheduleId,
      returnTo: 'PpmExecutionDetails',
    });
  };

  const reloadSchedule = useCallback(async () => {
    const data = await getPpmScheduleDetail(scheduleId);
    if (!data) return null;
    setSchedule(data);
    if (data.partsUsed?.length) {
      setUsedParts(
        data.partsUsed.map((p) => ({
          id: p.partId,
          name: p.name ?? p.partId,
          quantity: p.quantity,
        }))
      );
    }
    if (data.executionState) {
      const idx = data.executionState.currentStepIndex ?? 0;
      const started = ['IN_PROGRESS', 'PENDING_REVIEW', 'PASSED', 'FAILED', 'COMPLETED'].includes(
        data.status
      );
      if (started) {
        setTimerActive(true);
        setCurrentStep(Math.min((data.executionState.currentStepIndex ?? 0) + 1, workflowSteps.length));
      }
      if (data.executionState?.onHold) {
        setIsPaused(true);
        if (data.executionState.onHoldReason) {
          setHoldReason(data.executionState.onHoldReason);
        }
      }
    }
    return data;
  }, [scheduleId, workflowSteps.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const data = await reloadSchedule();
        if (cancelled || !data) return;
        if (data.scope === 'location' || (!data.assetId && data.locationName)) {
          setAsset(null);
          const locationRef = data.locationId ?? data.locationRef;
          if (locationRef) {
            try {
              const loaded = await fetchExternalLocation(locationRef);
              if (!cancelled) setLocationDetails(loaded);
            } catch {
              if (!cancelled) setLocationDetails(null);
            }
          }
        } else if (data.assetId) {
          setLocationDetails(null);
          try {
            const loaded = await fetchExternalAsset(data.assetId);
            if (!cancelled) setAsset(loaded);
          } catch {
            if (!cancelled) setAsset(null);
          }
        }
      } catch {
        if (!cancelled) Alert.alert('Error', 'Could not load PPM schedule.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadSchedule]);

  useEffect(() => {
    void fetchWorkOrderByPpmSchedule(scheduleId)
      .then((wo) => {
        setLinkedWorkOrderId(wo?.id ?? null);
        setLinkedWorkOrder(
          wo
            ? { scope: wo.scope, locationRef: wo.locationRef ?? null }
            : null
        );
      })
      .catch(() => {
        setLinkedWorkOrderId(null);
        setLinkedWorkOrder(null);
      });
  }, [scheduleId]);

  useEffect(() => {
    const p = route.params as { holdWork?: boolean; holdReason?: string };
    if (p?.holdWork) {
      setShowHoldForm(true);
      if (p.holdReason) setHoldReason(p.holdReason);
      navigation.setParams({ holdWork: undefined, holdReason: undefined } as never);
    }
  }, [(route.params as { holdWork?: boolean })?.holdWork]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && !isPaused) {
      interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isPaused]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const syncChecklistAnswers = async (params: Record<string, unknown>) => {
    const answers = (params.checklistAnswers as Array<{ itemId: string; status: string | null }>) ?? [];
    for (const row of answers) {
      if (!row.itemId || !row.status) continue;
      const ppmStatus = row.status === 'pass' ? 'PASSED' : 'FAILED';
      await updatePpmChecklistItem(scheduleId, row.itemId, ppmStatus);
    }
  };

  useEffect(() => {
    const p = route.params as Record<string, unknown>;
    if (!p?.stepCompleted) {
      setIsAutoNavigating(false);
      return;
    }

    setIsAutoNavigating(true);
    const stepId = String(p.stepCompleted);

    void (async () => {
      try {
        if (stepId === 'checklist') {
          await syncChecklistAnswers(p);
        }

        const payload = buildPpmStepPayloadFromUi(p, stepId);
        const uploadFiles =
          stepId === 'before_photos' || stepId === 'after_photos'
            ? await prepareEvidenceUploadFiles(
                p.evidence as Array<Record<string, unknown>> | undefined,
              )
            : undefined;

        await completePpmStep(scheduleId, stepId, payload, uploadFiles);

        if (p.selectedParts) {
          setUsedParts(p.selectedParts as { id: string; name: string; quantity: number }[]);
        }

        if (stepId === 'signature') {
          const sig = p.signatureData as { technicianNotes?: string } | undefined;
          const notes =
            typeof sig?.technicianNotes === 'string' ? sig.technicianNotes.trim() : undefined;
          await submitPpmExecution(scheduleId, notes);
          await reloadSchedule();
          setCurrentStep(workflowSteps.length);
          setIsAutoNavigating(false);
          navigation.setParams({ stepCompleted: undefined } as never);
          Alert.alert('PPM Complete', 'This PPM schedule has been submitted successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        const index = workflowSteps.findIndex((s) => s.id === stepId);
        if (index !== -1) {
          const nextStepIndex = index + 1;
          setCurrentStep(nextStepIndex);
          navigation.setParams({ stepCompleted: undefined } as never);
          if (nextStepIndex < workflowSteps.length) {
            performStepNavigation(workflowSteps[nextStepIndex].id);
          } else {
            setIsAutoNavigating(false);
          }
        } else {
          setIsAutoNavigating(false);
        }
      } catch (error: unknown) {
        setIsAutoNavigating(false);
        const message = error instanceof Error ? error.message : 'Unable to save step.';
        Alert.alert('Sync failed', message);
        navigation.setParams({ stepCompleted: undefined } as never);
      }
    })();
  }, [(route.params as { stepCompleted?: string })?.stepCompleted]);

  const performStepNavigation = (stepId: string) => {
    const nav = ppmStepNavParams(scheduleId);
    if (stepId === 'qr_scan') {
      navigation.navigate('WorkOrderQRScan', {
        ...nav,
        id: linkedWorkOrderId ?? scheduleId,
        assetId: schedule?.assetId ?? '',
        scope: isLocationPpm ? 'location' : 'asset',
        location: schedule?.locationName ?? locationDetails?.name,
        locationRef:
          schedule?.locationRef ??
          schedule?.locationId ??
          linkedWorkOrder?.locationRef ??
          locationDetails?.locationId ??
          null,
        returnTo: 'PpmExecutionDetails',
        scheduleId,
      });
    } else if (stepId === 'before_photos') {
      navigation.navigate('PhotoCapture', { ...nav, type: 'before' });
    } else if (stepId === 'checklist') {
      navigation.navigate('Checklist', {
        ...nav,
        assetId: schedule?.assetId,
        woType: 'PPM',
        ppmChecklistItems: schedule?.checklistItems,
      });
    } else if (stepId === 'parts') {
      navigation.navigate('PartsUsage', nav);
    } else if (stepId === 'after_photos') {
      navigation.navigate('PhotoCapture', { ...nav, type: 'after' });
    } else if (stepId === 'signature') {
      navigation.navigate('Signature', nav);
    } else {
      setIsAutoNavigating(false);
    }
  };

  const submitHold = async () => {
    if (!holdReason.trim()) return;
    setBackendBusy(true);
    try {
      await holdPpmExecution(scheduleId, holdReason.trim());
      if (linkedWorkOrderId) {
        try {
          await holdWorkOrder(linkedWorkOrderId, holdReason.trim());
        } catch {
          // Linked WO hold is best-effort
        }
      }
      setIsPaused(true);
      setShowHoldForm(false);
      await reloadSchedule();
    } catch (e: unknown) {
      Alert.alert('Sync error', e instanceof Error ? e.message : 'Failed to hold PPM');
    } finally {
      setBackendBusy(false);
    }
  };

  const submitResume = async () => {
    setBackendBusy(true);
    try {
      await resumePpmExecution(scheduleId);
      if (linkedWorkOrderId) {
        try {
          await resumeWorkOrder(linkedWorkOrderId);
        } catch {
          // best-effort
        }
      }
      setIsPaused(false);
      await reloadSchedule();
    } catch (e: unknown) {
      Alert.alert('Sync error', e instanceof Error ? e.message : 'Failed to resume PPM');
    } finally {
      setBackendBusy(false);
    }
  };

  const handleAction = async () => {
    if (isPaused) {
      Alert.alert('On Hold', 'Resume work before continuing to the next step.');
      return;
    }
    const activeStep = workflowSteps[Math.min(currentStep, workflowSteps.length - 1)];
    if (!activeStep || currentStep >= workflowSteps.length) return;

    if (activeStep.id === 'start') {
      setBackendBusy(true);
      try {
        await startPpmExecution(scheduleId);
        await reloadSchedule();
        setTimerActive(true);
        setCurrentStep(1);
        performStepNavigation('qr_scan');
      } catch (e: unknown) {
        Alert.alert('Sync error', e instanceof Error ? e.message : 'Failed to start PPM');
      } finally {
        setBackendBusy(false);
      }
      return;
    }
    performStepNavigation(activeStep.id);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={{ color: colors.mutedForeground }}>Schedule not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDone =
    currentStep >= workflowSteps.length ||
    ['PASSED', 'FAILED', 'PENDING_REVIEW', 'COMPLETED'].includes(schedule.status);
  const activeStep = workflowSteps[Math.min(currentStep, workflowSteps.length - 1)];
  const displayTitle = titleParam ?? schedule.title;

  if ((route.params as { stepCompleted?: string })?.stepCompleted || isAutoNavigating) {
    return (
      <View style={[styles.autoNavOverlay, { backgroundColor: colors.background }]}>
        <StatusBar backgroundColor={colors.background} barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.autoNavText, { color: colors.foreground }]}>Opening Next Step...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.card} barStyle="light-content" />
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.woId, { color: colors.mutedForeground }]}>
            {schedule.id.slice(0, 12)}
          </Text>
          <Text style={[styles.woSubtitle, { color: colors.foreground }]} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>
        {timerActive && !isDone && (
          <View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.warning + '20',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                gap: 6,
              },
              isPaused && { backgroundColor: colors.muted },
            ]}
          >
            {isPaused ? <Pause size={12} color={colors.mutedForeground} /> : <Timer size={12} color={colors.warning} />}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: isPaused ? colors.mutedForeground : colors.warning,
              }}
            >
              {formatTime(elapsed)}
            </Text>
          </View>
        )}
        {(schedule?.assetId ?? asset?.id) && (
          <TouchableOpacity
            onPress={() => openAssetDetails({ initialView: 'manuals' })}
            style={[styles.backButton, { marginLeft: 8, marginRight: 0 }]}
          >
            <BookOpen size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.mapCard}>
          <View style={styles.mapContainer}>
            <View style={styles.mapPin}>
              <MapPin size={24} color={colors.destructive} />
            </View>
          </View>
          <View style={styles.mapInfo}>
            <View style={styles.mapTitleRow}>
              <View style={styles.mapIconBox}>
                <Navigation size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapTitle}>{asset?.location ?? schedule.assetName ?? 'On-site PPM'}</Text>
                <Text style={styles.mapSubtitle}>Planned Preventive Maintenance</Text>
              </View>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          onPress={() => (isLocationPpm ? openLocationDetails() : openAssetDetails())}
          activeOpacity={
            isLocationPpm
              ? schedule?.locationRef || schedule?.locationId || locationDetails?.id
                ? 0.9
                : 1
              : schedule?.assetId || asset?.id
                ? 0.9
                : 1
          }
          disabled={
            isLocationPpm
              ? !schedule?.locationRef && !schedule?.locationId && !locationDetails?.id
              : !schedule?.assetId && !asset?.id
          }
        >
          <Card style={styles.assetCard}>
            <View style={styles.assetHeaderBg}>
              {isLocationPpm ? (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetNameText, { color: colors.foreground }]}>
                    {locationDetails?.name ?? schedule.locationName ?? 'Location'}
                  </Text>
                  <Text style={[styles.assetModelText, { color: colors.mutedForeground }]}>
                    {locationDetails?.locationId ?? schedule.locationRef ?? schedule.locationId ?? 'Location-based PPM'}
                  </Text>
                </View>
              ) : asset ? (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetNameText, { color: colors.foreground }]}>{asset.name}</Text>
                  <Text style={[styles.assetModelText, { color: colors.mutedForeground }]}>
                    {asset.type} • {asset.id}
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetNameText, { color: colors.foreground }]}>
                    {schedule.assetName ?? 'Asset'}
                  </Text>
                  <Text style={[styles.assetModelText, { color: colors.mutedForeground }]}>
                    {schedule.assetId ?? 'Tap to load asset details'}
                  </Text>
                </View>
              )}
              {(isLocationPpm
                ? schedule?.locationRef || schedule?.locationId || locationDetails?.id
                : schedule?.assetId || asset?.id) && (
                <View style={styles.assetArrow}>
                  <ChevronRight size={18} color={colors.foreground} />
                </View>
              )}
            </View>
            <View style={styles.assetBody}>
              <View style={styles.badges}>
                <StatusBadge status={formatPpmStatus(schedule.status)} />
                <StatusBadge status="PPM" />
                {isLocationPpm ? (
                  <StatusBadge status="Location" />
                ) : asset?.status ? (
                  <StatusBadge status={asset.status} />
                ) : null}
              </View>
              <Text style={styles.description}>
                {schedule.dueDate
                  ? `Due: ${new Date(schedule.dueDate).toLocaleDateString()} — review ${isLocationPpm ? 'location' : 'asset'} details before starting.`
                  : `Review ${isLocationPpm ? 'location' : 'asset'} details before starting.`}
              </Text>
            </View>
          </Card>
        </TouchableOpacity>

        {(schedule?.assetId ?? asset?.id) && (
          <View style={styles.manualsRow}>
            <TouchableOpacity style={styles.manualsBtn} onPress={() => openAssetDetails({ initialView: 'manuals' })}>
              <BookOpen size={16} color={colors.primary} />
              <Text style={styles.manualsBtnText}>View Manuals & Documents</Text>
            </TouchableOpacity>
          </View>
        )}

        {usedParts.length > 0 && (
          <Animated.View entering={FadeInUp} style={styles.usedPartsSection}>
            <Text style={styles.sectionTitle}>PARTS CONSUMPTION</Text>
            <Card style={styles.partsSummaryCard}>
              {usedParts.map((item, idx) => (
                <View key={item.id} style={[styles.partItemRow, idx === 0 && { borderTopWidth: 0 }]}>
                  <View style={styles.partIconCircle}>
                    <Package size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.partNameMain}>{item.name}</Text>
                  <View style={styles.partQtyBadge}>
                    <Text style={styles.partQtyNum}>x{item.quantity}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {!isDone && activeStep && (
          <Animated.View key={activeStep.id} entering={FadeInUp} style={styles.activeStepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconBubble}>
                <activeStep.Icon size={24} color={colors.primary} />
              </View>
              <View style={styles.stepTitleWrap}>
                <Text style={styles.activeStepLabel}>{activeStep.label}</Text>
                <Text style={styles.activeStepDesc}>{activeStep.desc}</Text>
              </View>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepInstruction}>
                <Text style={styles.instructionText}>
                  {activeStep.id === 'start'
                    ? 'Once you start, the asset checklist is snapshotted for this PPM run.'
                    : `Tap "${activeStep.action}" to open the same step screen used for work orders.`}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {isDone && (
          <Animated.View entering={FadeInUp} style={styles.completionCard}>
            <View
              style={[
                styles.completionIconBubble,
                { backgroundColor: colors.success + '20', borderColor: colors.success + '40', borderWidth: 1 },
              ]}
            >
              <CheckCircle2 size={40} color={colors.success} />
            </View>
            <Text style={styles.completionTitle}>PPM Finished</Text>
            <Text style={styles.completionDesc}>
              All workflow steps for this schedule are complete.
            </Text>
          </Animated.View>
        )}

        {!isDone && activeStep && (
          <View style={styles.scrollableBottomBar}>
            {timerActive && (
              showHoldForm ? (
                <View style={styles.holdForm}>
                  <TextInput
                    style={styles.holdInput}
                    placeholder="Reason for hold..."
                    placeholderTextColor={colors.mutedForeground}
                    value={holdReason}
                    onChangeText={setHoldReason}
                    autoFocus
                  />
                  <View style={styles.holdFormActions}>
                    <TouchableOpacity style={styles.holdCancelBtn} onPress={() => setShowHoldForm(false)}>
                      <Text style={styles.holdCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.holdSubmitBtn} onPress={() => void submitHold()} disabled={backendBusy}>
                      <Text style={styles.holdSubmitText}>Submit Hold</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.floatingActionsRow}>
                  {isPaused ? (
                    <TouchableOpacity style={styles.floatBtn} onPress={() => void submitResume()} disabled={backendBusy}>
                      <Play size={18} color={colors.foreground} />
                      <Text style={styles.floatBtnText}>Resume Work</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.floatBtn} onPress={() => setShowHoldForm(true)}>
                      <Pause size={18} color={colors.foreground} />
                      <Text style={styles.floatBtnText}>Hold Work</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            )}
            <TouchableOpacity
              onPress={handleAction}
              disabled={backendBusy || isPaused}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={gradients.primary as [string, string, ...string[]]}
                style={[styles.ctaButton, (backendBusy || isPaused) && { opacity: 0.6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {backendBusy ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <activeStep.Icon size={20} color="#FFF" />
                    <Text style={styles.ctaText}>{activeStep.action}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], _isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 24,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      borderBottomWidth: 1,
      borderBottomColor: colors.muted + '40',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.panel,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerText: { flex: 1 },
    woId: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    woSubtitle: { fontSize: 16, fontWeight: '800' },
    scroll: { padding: 20, paddingTop: 16 },
    mapCard: { marginBottom: 12, padding: 0, overflow: 'hidden', borderRadius: 24 },
    mapContainer: { height: 100, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    mapPin: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.card,
    },
    mapInfo: { padding: 16 },
    mapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mapIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
    mapSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    assetCard: {
      marginBottom: 8,
      padding: 0,
      borderRadius: 24,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    assetHeaderBg: { padding: 12, flexDirection: 'row', alignItems: 'center' },
    assetNameText: { fontSize: 15, fontWeight: '700' },
    assetModelText: { fontSize: 12 },
    assetArrow: { marginLeft: 8 },
    assetBody: { padding: 12, paddingTop: 4 },
    badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    description: { fontSize: 14, lineHeight: 20, color: colors.foreground },
    usedPartsSection: { marginTop: 12 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.mutedForeground,
      marginBottom: 8,
      letterSpacing: 1,
    },
    partsSummaryCard: {
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    partItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border + '40',
    },
    partIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    partNameMain: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: '500' },
    partQtyBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    partQtyNum: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    activeStepContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    stepIconBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    stepTitleWrap: { flex: 1 },
    activeStepLabel: { fontSize: 16, fontWeight: '800', color: colors.foreground, marginBottom: 2 },
    activeStepDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
    stepContent: { marginTop: 8 },
    stepInstruction: {
      padding: 10,
      backgroundColor: colors.muted,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    instructionText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
    completionCard: {
      marginTop: 24,
      padding: 24,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.success + '40',
      alignItems: 'center',
    },
    completionIconBubble: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    completionTitle: { fontSize: 24, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
    completionDesc: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 },
    manualsRow: { marginBottom: 12 },
    manualsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary + '12',
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    manualsBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    holdForm: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    holdInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      color: colors.foreground,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    holdFormActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    holdCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: colors.muted,
    },
    holdCancelText: { fontWeight: '700', color: colors.foreground },
    holdSubmitBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    holdSubmitText: { fontWeight: '700', color: '#FFF' },
    floatingActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    floatBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    floatBtnText: { fontWeight: '700', color: colors.foreground },
    scrollableBottomBar: { marginTop: 8 },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 16,
    },
    ctaText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    autoNavOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.card,
    },
    autoNavText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  });
