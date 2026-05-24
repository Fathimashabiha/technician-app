import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import { workOrders, assets } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/Card';
import { COLORS, GRADIENTS, SHADOWS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  Lock,
  ChevronRight,
  Navigation,
  Play,
  Camera,
  ClipboardList,
  ImageIcon,
  PenLine,
  Send,
  Edit3,
  Mic,
  Paperclip,
  Pause,
  MessageSquare,
  BookOpen,
  Package,
  Activity,
  AlertCircle,
  Timer,
  Barcode,
  ShieldCheck,
  Zap,
  Wrench,
  UserPlus,
  Search,
  X,
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<MaintenanceStackParamList, 'WorkOrderDetails'>;
type RouteType = RouteProp<MaintenanceStackParamList, 'WorkOrderDetails'>;

export default function WorkOrderDetails() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { id } = route.params as any;

  const wo = workOrders.find(w => w.id === id);





  const [currentStep, setCurrentStep] = useState(0);
  const [note, setNote] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checklistResult, setChecklistResult] = useState<'pass'|'fail'>('pass');
  const [diagnosisData, setDiagnosisData] = useState<any>(null);
  const [usedParts, setUsedParts] = useState<{ id: string; name: string; quantity: number }[]>([]);
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [failedChecklistItems, setFailedChecklistItems] = useState<any[]>([]);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferredTo, setTransferredTo] = useState<string | null>(null);
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [pendingTech, setPendingTech] = useState<any>(null);

  const AVAILABLE_TECHS = [
    { id: 'T002', name: 'Sarah Connor', role: 'HVAC Specialist', status: 'Available', avatar: 'SC' },
    { id: 'T003', name: 'Mark Ruffalo', role: 'Electrical Lead', status: 'Busy', avatar: 'MR' },
    { id: 'T004', name: 'James Wilson', role: 'Mechanical Tech', status: 'Available', avatar: 'JW' },
    { id: 'T005', name: 'Elena Gilbert', role: 'Plumbing Expert', status: 'Available', avatar: 'EG' },
  ];

  const filteredTechs = AVAILABLE_TECHS.filter(tech => 
    tech.name.toLowerCase().includes(transferSearch.toLowerCase()) ||
    tech.role.toLowerCase().includes(transferSearch.toLowerCase())
  );

  const STEPS = [
    { id: 'start',        label: 'Start Work',         desc: 'Begin the job and start timer',        Icon: Play,         action: 'Start Work' },
    { id: 'qr_scan',      label: 'Verify Asset',       desc: 'Scan asset QR to verify',              Icon: Camera,       action: 'Verify Asset' },
    { id: 'before_photos',label: 'Before Photos',     desc: 'Capture photos before starting work',  Icon: Camera,       action: 'Take Photos' },
    { id: 'checklist',    label: 'Execute Checklist', desc: 'Complete all checklist items',          Icon: ClipboardList,action: 'Open Checklist' },
    { id: 'diagnostics',  label: 'Diagnostic Notes',  desc: (checklistResult === 'fail' || wo?.type === 'Corrective') ? 'Rectification Required: Address failed items' : 'Identify faults and root causes',       Icon: Activity,     action: 'Record Diagnosis' },
    { id: 'parts',        label: 'Parts Used',        desc: 'Record and update materials used',      Icon: Package,      action: 'Update Parts' },
    { id: 'after_photos', label: 'After Photos',      desc: 'Capture photos after completing work',  Icon: ImageIcon,    action: 'Take After Photos' },
    { id: 'signature',    label: 'Digital Signature', desc: 'Sign off on the completed work',        Icon: PenLine,      action: 'Sign Off' },
    { id: 'submit',       label: 'Submit & Complete', desc: 'Submit work order for verification',    Icon: Send,         action: 'Submit Work Order' },
  ];

  const workflowSteps = (wo?.type === 'Inspection' 
    ? STEPS
    : (wo?.type === 'Breakdown' || wo?.type === 'Corrective')
      ? STEPS.filter(s => s.id !== 'checklist')
      : STEPS.filter(s => s.id !== 'diagnostics'))
    .filter(s => wo?.scope === 'location' ? s.id !== 'qr_scan' : true);

  const asset = assets.find(a => a.id === wo?.assetId);

  // Reset internal state completely when opening a different work order
  useEffect(() => {
    const workOrder = workOrders.find(w => w.id === id);
    if (!workOrder) return;

    // If WO is already final, jump to completion state
    const isFinal = ['Completed', 'Verified', 'Closed'].includes(workOrder.status);
    if (isFinal) {
      setCurrentStep(workflowSteps.length);
    } else {
      setCurrentStep(0);
    }

    setTimerActive(false);
    setIsPaused(false);
    setHoldReason('');
    setNote('');
    
    // For Corrective WOs, pre-populate failed items to rectify
    if (workOrder.type === 'Corrective') {
      setFailedChecklistItems([
        { label: 'Mechanical Seal Condition', status: 'fail', note: 'Visible leakage detected in previous inspection' },
        { label: 'System Operating Vibration', status: 'flag', note: 'Higher than normal decibel levels' }
      ]);
    } else {
      setFailedChecklistItems([]);
    }
  }, [id, workflowSteps.length]);

  useEffect(() => {
    const p = route.params as any;
    if (p?.stepCompleted) {
      setIsAutoNavigating(true);
      const stepId = p.stepCompleted;
      
      if (p.checklistResult) {
        setChecklistResult(p.checklistResult);
      }
      if (p.selectedParts) {
         setUsedParts(p.selectedParts);
      }
      if (p.diagnosisData) {
         setDiagnosisData(p.diagnosisData);
      }
      if (p.failedItems) {
         setFailedChecklistItems(p.failedItems);
      }

      if (p.holdWork) {
        setIsPaused(true);
        if (p.holdReason) setHoldReason(p.holdReason);
        setIsAutoNavigating(false);
        navigation.setParams({ holdWork: undefined, holdReason: undefined } as any);
        return;
      }

      const index = workflowSteps.findIndex(s => s.id === stepId);
      if (index !== -1) {
        if (stepId === 'checklist' && (wo?.type === 'Inspection' || wo?.type === 'PPM')) {
          if (p.checklistResult === 'pass') {
            // For Inspection, we might jump to parts. For PPM, we usually just continue.
            // Let's check if the next step is specifically navigation-worthy.
            const nextStepIndex = index + 1;
            if (nextStepIndex < workflowSteps.length) {
              const nextStep = workflowSteps[nextStepIndex];
              setCurrentStep(nextStepIndex);
              navigation.setParams({ stepCompleted: undefined, checklistResult: undefined } as any);
              performStepNavigation(nextStep.id);
              return;
            }
          } else {
             // FAIL or FLAG: Jump to Manager Decision (Failure Result) immediately
             setChecklistResult('fail');
             const submitIndex = workflowSteps.findIndex(s => s.id === 'submit');
             if (submitIndex !== -1) {
                setCurrentStep(submitIndex);
                navigation.setParams({ stepCompleted: undefined, checklistResult: undefined } as any);
                performStepNavigation('submit', 'fail');
                return;
             }
          }
        }

        // If technician reports the fault was NOT rectified, jump to failure result immediately
        if (stepId === 'diagnostics') {
          const nextStepIndex = index + 1;
          if (p.rectified === false) {
            setChecklistResult('fail');
            const submitIndex = workflowSteps.findIndex(s => s.id === 'submit');
            if (submitIndex !== -1) {
              setCurrentStep(submitIndex);
              navigation.setParams({ stepCompleted: undefined, checklistResult: undefined, rectified: undefined } as any);
              performStepNavigation('submit', 'fail');
              return;
            }
          } else {
            // If rectified, set result to pass and proceed to the next step
            setChecklistResult('pass');
            if (nextStepIndex < workflowSteps.length) {
              const nextStep = workflowSteps[nextStepIndex];
              setCurrentStep(nextStepIndex);
              navigation.setParams({ stepCompleted: undefined, checklistResult: undefined, rectified: undefined } as any);
              performStepNavigation(nextStep.id);
              return;
            }
          }
        }

        const nextStepIndex = index + 1;
        
        // Only advance currentStep if we haven't already passed it
        if (currentStep <= index) {
          setCurrentStep(nextStepIndex);
        }
        
        navigation.setParams({ stepCompleted: undefined, checklistResult: undefined, rectified: undefined } as any);

        // AUTO-NAVIGATE to the next screen if it is a navigation-type step
        if (nextStepIndex < workflowSteps.length) {
           const nextStep = workflowSteps[nextStepIndex];
           if (['qr_scan', 'before_photos', 'checklist', 'diagnostics', 'parts', 'after_photos', 'signature', 'submit'].includes(nextStep.id)) {
              performStepNavigation(nextStep.id);
           } else {
              setIsAutoNavigating(false);
           }
        } else {
           setIsAutoNavigating(false);
        }
      }
    } else {
       setIsAutoNavigating(false);
    }
  }, [(route.params as any)?.stepCompleted]);

  const performStepNavigation = (stepId: string, statusOverride?: 'pass' | 'fail') => {
    if (!wo) return;

    if (stepId === 'qr_scan') {
      navigation.navigate('WorkOrderQRScan' as any, { id: wo.id, assetId: wo.assetId } as any);
    } else if (stepId === 'before_photos') {
      navigation.navigate('PhotoCapture' as any, { id: wo.id, type: 'before' } as any);
    } else if (stepId === 'checklist') {
      if (wo.type === 'Inspection') {
        (navigation as any).navigate('Main', { 
          screen: 'Dashboard', 
          params: { screen: 'Inspections', params: { woId: wo.id } } 
        });
      } else {
        navigation.navigate('Checklist' as any, { id: wo.id, assetId: wo.assetId, woType: wo.type } as any);
      }
    } else if (stepId === 'diagnostics') {
      navigation.navigate('Diagnosis' as any, { id: wo.id, failedItems: failedChecklistItems } as any);
    } else if (stepId === 'parts') {
      navigation.navigate('PartsUsage' as any, { id: wo.id } as any);
    } else if (stepId === 'after_photos') {
      navigation.navigate('PhotoCapture' as any, { id: wo.id, type: 'after' } as any);
    } else if (stepId === 'signature') {
      navigation.navigate('Signature' as any, { id: wo.id } as any);
    } else if (stepId === 'submit') {
      setTimerActive(false);
      navigation.navigate('WorkOrderResult' as any, { id: wo.id, status: statusOverride || checklistResult } as any);
    }
  };

useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && !isPaused) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isPaused]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getSLATimeRemaining = (deadline?: string) => {
    if (!deadline) return null;
    // For demo purposes, we'll use a fixed mapping or a small calculation relative to now
    // In a real app, this would be computed every second
    const target = new Date(deadline).getTime();
    const now = new Date('2024-04-02T10:45:00').getTime(); // Mocking "now" to match the user's data context
    const diff = target - now;
    
    if (diff <= 0) return '00:00:00';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getSLAColor = (status?: string) => {
    switch (status) {
      case 'Breached': return '#EF4444';
      case 'Met': return '#10B981';
      default: return '#3B82F6';
    }
  };

  if (!wo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.mutedForeground }}>Work order not found: {id}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDone = currentStep >= workflowSteps.length;
  const activeStep = workflowSteps[Math.min(currentStep, workflowSteps.length - 1)];

  const handleAction = () => {
    if (isDone || transferredTo) return;
    const step = activeStep.id;

    if (step === 'start') {
      setTimerActive(true);
      setCurrentStep(prev => prev + 1);
      // Auto-trigger navigation to the next step immediately
      if (workflowSteps.length > 1) {
        performStepNavigation(workflowSteps[1].id);
      }
    } else {
      performStepNavigation(step);
    }
  };

  if ((route.params as any)?.stepCompleted) {
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
      {/* ── Header ── */}
      <View style={[styles.header, { 
        backgroundColor: colors.card, 
        borderBottomLeftRadius: 32, 
        borderBottomRightRadius: 32, 
        paddingBottom: 24,
        paddingTop: insets.top + 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.muted + '40'
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.woId, { color: colors.mutedForeground }]}>{wo.id}</Text>
          <Text style={[styles.woSubtitle, { color: colors.foreground }]} numberOfLines={1}>{wo.title}</Text>
        </View>
        {timerActive && (
          <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 }, isPaused && { backgroundColor: colors.muted }]}>
            {isPaused ? <Pause size={12} color={colors.mutedForeground} /> : <Play size={12} color={colors.warning} />}
            <Text style={[{ fontSize: 13, fontWeight: '700', color: colors.warning }, isPaused && { color: colors.mutedForeground }]}>{formatTime(elapsed)}</Text>
          </View>
        )}
        {!timerActive && !isDone && (
          <TouchableOpacity 
            onPress={() => setShowTransferForm(true)} 
            style={[styles.backButton, { marginLeft: 12, marginRight: 0, backgroundColor: colors.primary + '15' }]}
          >
            <UserPlus size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Body (normal background) ── */}
      <View style={styles.container}>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Location Map Card ── */}
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
                <Text style={styles.mapTitle}>{wo.location}</Text>
                <Text style={styles.mapSubtitle}>10 mins away • 2.4 km</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ── Asset & Work Order Details Card ── */}
        <TouchableOpacity onPress={() => navigation.navigate('AssetDetails' as any, { assetId: wo.assetId } as any)} activeOpacity={0.9}>
          <Card style={styles.assetCard}>
            {/* Asset Header */}
            <View style={styles.assetHeaderBg}>
              {asset ? (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetNameText, { color: colors.foreground }]}>{asset.name}</Text>
                  <Text style={[styles.assetModelText, { color: colors.mutedForeground }]}>{asset.type} • {asset.id}</Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetNameText, { color: colors.foreground }]}>Unknown Asset</Text>
                  <Text style={[styles.assetModelText, { color: colors.mutedForeground }]}>{wo.assetId}</Text>
                </View>
              )}
              <View style={styles.assetArrow}>
                <ChevronRight size={18} color={colors.foreground} />
              </View>
            </View>

            {/* Work Order Details */}
            <View style={styles.assetBody}>
              <View style={styles.badges}>
                <StatusBadge status={wo.status} />
                <StatusBadge status={wo.priority} />
                <StatusBadge status={wo.type} />
              </View>

              <Text style={styles.description}>{wo.description}</Text>

              {wo.slaStatus && (
                <View style={[styles.slaBar, { backgroundColor: getSLAColor(wo.slaStatus) + '20', borderColor: getSLAColor(wo.slaStatus) + '40' }]}>
                  <View style={styles.slaLabelRow}>
                    <Timer size={14} color={getSLAColor(wo.slaStatus)} />
                    <Text style={[styles.slaLabel, { color: getSLAColor(wo.slaStatus) }]}>SLA RESOLUTION</Text>
                  </View>
                  <View style={styles.slaValueRow}>
                    <Text style={[styles.slaStatusText, { color: getSLAColor(wo.slaStatus) }]}>
                      {wo.slaStatus === 'Breached' ? 'BREACHED' : wo.slaStatus === 'Met' ? 'SLA MET' : 'IN PROGRESS'}
                    </Text>
                    {wo.slaDeadline && wo.slaStatus !== 'Met' && (
                      <Text style={[styles.slaTime, { color: getSLAColor(wo.slaStatus) }]}>
                        {getSLATimeRemaining(wo.slaDeadline)} remaining
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>

        {/* ── Used Parts Summary ── */}
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

        {/* ── Diagnosis Summary ── */}
        {diagnosisData && (
           <Animated.View entering={FadeInUp} style={styles.usedPartsSection}>
              <Text style={styles.sectionTitle}>TECHNICAL DIAGNOSIS</Text>
              <Card style={styles.diagnosisCard}>
                 <View style={styles.diagnosisTagRow}>
                    {diagnosisData.conditions.map((c: string) => (
                       <View key={c} style={styles.diagTag}>
                          <Text style={styles.diagTagText}>{c}</Text>
                       </View>
                    ))}
                 </View>
                 <Text style={styles.diagnosisText}>{diagnosisData.faultDesc}</Text>
                 <View style={styles.diagnosisDivider} />
                 <Text style={styles.rootCauseLabel}>Root Cause:</Text>
                 <Text style={styles.diagnosisText}>{diagnosisData.rootCause}</Text>
              </Card>
           </Animated.View>
        )}



        {/* ── Active Wizard Step ── */}
        {!isDone && (
          <Animated.View key={activeStep.id} entering={FadeInUp} style={styles.activeStepContainer}>
             <View style={styles.stepHeader}>
                <View style={styles.stepIconBubble}>
                   <activeStep.Icon size={24} color={transferredTo ? colors.success : colors.primary} />
                </View>
                <View style={styles.stepTitleWrap}>
                   <Text style={styles.activeStepLabel}>
                     {activeStep.id === 'start' && transferredTo ? 'Task Transferred' : activeStep.label}
                   </Text>
                   <Text style={styles.activeStepDesc}>
                     {activeStep.id === 'start' && transferredTo 
                       ? `This work order has been reassigned to ${transferredTo}.` 
                       : activeStep.desc}
                   </Text>
                </View>
             </View>

             {/* Step-specific UI extensions could go here */}
             <View style={styles.stepContent}>
                {activeStep.id === 'start' && transferredTo && (
                  <View style={[styles.stepInstruction, { borderLeftColor: colors.success, backgroundColor: colors.success + '08' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                       <CheckCircle2 size={20} color={colors.success} />
                       <Text style={[styles.instructionText, { color: colors.success, fontWeight: '700' }]}>
                         Transferred to {transferredTo}
                       </Text>
                    </View>
                  </View>
                )}
                {activeStep.id === 'start' && !transferredTo && (
                  <View style={styles.stepInstruction}>
                    <Text style={styles.instructionText}>Once you click "Start Work", the SLA clocks will begin ticking.</Text>
                  </View>
                )}
                {activeStep.id === 'accept' && (
                  <View style={styles.stepInstruction}>
                    <Text style={styles.instructionText}>Please review the work order details above before accepting this task.</Text>
                  </View>
                )}
                {activeStep.id === 'submit' && (
                  <View style={styles.stepInstruction}>
                     <Text style={styles.instructionText}>Ensure all documentation and photos are correctly uploaded before final submission.</Text>
                  </View>
                )}
             </View>
          </Animated.View>
        )}

        {isDone && (
           <Animated.View entering={FadeInUp} style={styles.completionCard}>
             <View style={[styles.completionIconBubble, { backgroundColor: colors.success + '20', borderColor: colors.success + '40', borderWidth: 1 }]}>
                <CheckCircle2 size={40} color={colors.success} />
             </View>
             <Text style={styles.completionTitle}>Task Finished!</Text>
             <Text style={styles.completionDesc}>You have successfully completed all steps for this work order.</Text>
           </Animated.View>
        )}



        {/* ── Bottom CTA (Now Scrollable) ── */}
        <View style={styles.scrollableBottomBar}>
          {timerActive && !isDone && !transferredTo && (
            showHoldForm ? (
              <View style={styles.holdForm}>
                 <View style={styles.holdTabRow}>
                    <TouchableOpacity 
                      style={[styles.holdTab, !showTransferForm && styles.holdTabActive]} 
                      onPress={() => setShowTransferForm(false)}
                    >
                       <Text style={[styles.holdTabText, !showTransferForm && styles.holdTabTextActive]}>Pause Work</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.holdTab, showTransferForm && styles.holdTabActive]} 
                      onPress={() => setShowTransferForm(true)}
                    >
                       <Text style={[styles.holdTabText, showTransferForm && styles.holdTabTextActive]}>Transfer Task</Text>
                    </TouchableOpacity>
                 </View>

                 {!showTransferForm ? (
                  <>
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
                      <TouchableOpacity 
                        style={styles.holdSubmitBtn} 
                        onPress={() => {
                          if (!holdReason.trim()) return;
                          setIsPaused(true);
                          setShowHoldForm(false);
                        }}
                      >
                                                <Text style={styles.holdSubmitText}>Submit Hold</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                 ) : (
                  <View style={styles.transferContentInner}>
                     <Text style={styles.transferTitle}>Select Technician</Text>
                     <ScrollView showsVerticalScrollIndicator={false} style={styles.techListVerticalMini}>
                        {AVAILABLE_TECHS.map(tech => (
                          <TouchableOpacity 
                            key={tech.id} 
                            style={styles.techListItem}
                            onPress={() => {
                              setPendingTech(tech);
                              setShowAssignConfirm(true);
                            }}
                          >
                             <View style={styles.techAvatarLarge}>
                                <Text style={styles.techAvatarTextLarge}>{tech.avatar}</Text>
                                <View style={[styles.statusDotLarge, { backgroundColor: tech.status === 'Available' ? colors.success : colors.warning }]} />
                             </View>
                             <View style={styles.techInfo}>
                                <Text style={styles.techNameFull}>{tech.name}</Text>
                                <Text style={styles.techRoleFull}>{tech.role} • {tech.status}</Text>
                             </View>
                             <ChevronRight size={20} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        ))}
                     </ScrollView>
                     <TouchableOpacity style={styles.closeTransferBtn} onPress={() => setShowHoldForm(false)}>
                        <Text style={styles.closeTransferText}>Cancel</Text>
                     </TouchableOpacity>
                  </View>
                 )}
              </View>
            ) : (
              <View style={styles.floatingActionsRow}>
                {isPaused ? (
                    <TouchableOpacity 
                      style={styles.floatBtn} 
                      onPress={() => setIsPaused(false)}
                    >
                      <Play size={18} color={colors.foreground} />
                      <Text style={styles.floatBtnText}>Resume Work</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                      style={styles.floatBtn} 
                      onPress={() => setShowHoldForm(true)}
                    >
                      <Pause size={18} color={colors.foreground} />
                      <Text style={styles.floatBtnText}>Hold Work</Text>
                    </TouchableOpacity>
                )}
              </View>
            )
          )}

          <View style={styles.bottomBar}>
            {isDone || transferredTo ? (
              <View style={[
                styles.doneButton, 
                { 
                  backgroundColor: transferredTo ? colors.primary + '10' : colors.success + '20', 
                  borderColor: transferredTo ? colors.primary + '30' : colors.success + '40', 
                  borderWidth: 1 
                }
              ]}>
                {transferredTo ? (
                  <>
                    <UserPlus size={18} color={colors.primary} />
                    <Text style={[styles.doneText, { color: colors.primary }]}>Task Transferred to {transferredTo}</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} color={colors.success} />
                    <Text style={[styles.doneText, { color: colors.success }]}>Work Order Completed!</Text>
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={handleAction} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient
                  colors={gradients.primary as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButton}
                >
                  <activeStep.Icon size={18} color="#FFF" />
                  <Text style={styles.ctaText}>{activeStep.action}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Transition Overlay — Hides the detail screen flash during auto-nav */}
      {isAutoNavigating && (
        <View style={styles.autoNavOverlay}>
           <ActivityIndicator size="large" color="#FFF" />
           <Text style={styles.autoNavText}>Opening Next Step...</Text>
        </View>
      )}

      {/* Global Transfer Modal for Pre-start — Moved to top level for correct visibility */}
      {showTransferForm && !timerActive && (
          <View style={styles.globalTransferOverlay}>
             <Animated.View entering={FadeInUp} style={styles.transferModal}>
                <View style={styles.transferModalHeader}>
                   <Text style={styles.modalTitle}>Reassign Task</Text>
                   <TouchableOpacity onPress={() => { setShowTransferForm(false); setTransferSearch(''); }}>
                      <X size={24} color={colors.foreground} />
                   </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                   <Search size={18} color={colors.mutedForeground} />
                   <TextInput 
                      style={styles.searchInput}
                      placeholder="Search technicians..."
                      placeholderTextColor={colors.mutedForeground}
                      value={transferSearch}
                      onChangeText={setTransferSearch}
                   />
                </View>

                <ScrollView style={styles.techList} showsVerticalScrollIndicator={false}>
                   {filteredTechs.map(tech => (
                      <TouchableOpacity 
                        key={tech.id} 
                        style={styles.techListItem}
                        onPress={() => {
                          setPendingTech(tech);
                          setShowAssignConfirm(true);
                        }}
                      >
                         <View style={styles.techAvatarLarge}>
                            <Text style={styles.techAvatarTextLarge}>{tech.avatar}</Text>
                            <View style={[styles.statusDotLarge, { backgroundColor: tech.status === 'Available' ? colors.success : colors.warning }]} />
                         </View>
                         <View style={styles.techInfo}>
                            <Text style={styles.techNameFull}>{tech.name}</Text>
                            <Text style={styles.techRoleFull}>{tech.role} • {tech.status}</Text>
                         </View>
                         <ChevronRight size={20} color={colors.mutedForeground} />
                      </TouchableOpacity>
                   ))}
                   {filteredTechs.length === 0 && (
                     <Text style={{ textAlign: 'center', color: colors.mutedForeground, marginTop: 40, fontStyle: 'italic' }}>No technicians found matching "{transferSearch}"</Text>
                   )}
                </ScrollView>
             </Animated.View>
          </View>
        )}

      {/* Custom Confirmation Modal — Moved after Transfer Form to ensure it covers it */}
      {showAssignConfirm && pendingTech && (
        <View style={[styles.globalTransferOverlay, { zIndex: 1100 }]}>
           <Animated.View entering={FadeInUp} style={styles.confirmModal}>
              <View style={styles.confirmIconBubble}>
                 <UserPlus size={32} color={colors.primary} />
              </View>
              <Text style={styles.confirmTitle}>Confirm Reassignment</Text>
              <Text style={styles.confirmDesc}>
                Are you sure you want to transfer <Text style={{ fontWeight: '800' }}>{wo.id}</Text> to <Text style={{ fontWeight: '800' }}>{pendingTech.name}</Text>?
              </Text>
              
              <View style={styles.confirmActions}>
                 <TouchableOpacity 
                   style={styles.confirmCancelBtn} 
                   onPress={() => setShowAssignConfirm(false)}
                 >
                    <Text style={styles.confirmCancelText}>No, Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={styles.confirmProceedBtn} 
                   onPress={() => {
                      setTransferredTo(pendingTech.name);
                      setShowAssignConfirm(false);
                      setShowTransferForm(false);
                      setShowHoldForm(false);
                      setTimerActive(false);
                      setIsPaused(false);
                   }}
                 >
                    <Text style={styles.confirmProceedText}>Yes, Reassign</Text>
                 </TouchableOpacity>
              </View>
           </Animated.View>
        </View>
      )}
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ───────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    // Background set inline in the component to colors.navy
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },

  woId: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  woSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },

  // ── Scroll ───────────────────────────────────────────
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Map & Asset Cards ─────────────────────────────────────
  mapCard: {
    marginBottom: 16,
    padding: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  mapContainer: {
    height: 140,
    backgroundColor: isDark ? colors.muted : '#E2E8F0', // Darker gray in Light Mode
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: { 
    zIndex: 2,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? colors.muted : '#CBD5E1', 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF', // White border for a premium "marker" feel
    ...SHADOWS.card,
    elevation: 4,
  },
  
  mapInfo: {
    padding: 16,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDark ? colors.muted + '80' : '#E2E8F0', // Darker gray background for icon box
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  mapSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  assetCard: {
    marginBottom: 8,
    padding: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.card,
    borderBottomColor: colors.border + '20',
  },
  techAvatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarTextLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  statusDotLarge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.background,
  },
  techInfo: {
    flex: 1,
    marginLeft: 16,
  },
  techNameFull: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 2,
  },
  techRoleFull: {
    fontSize: 12,
    color: colors.mutedForeground,
  },

  // Vertical List Adjustments
  techListVerticalMini: {
    maxHeight: 200,
  },
  techCardVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '15',
  },

  // Custom Confirm Modal
  confirmModal: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 32,
    marginBottom: 'auto',
    marginTop: 'auto',
    alignItems: 'center',
    ...SHADOWS.card,
    zIndex: 2000,
  },
  confirmIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: colors.mutedForeground,
    fontWeight: '700',
  },
  confirmProceedBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmProceedText: {
    color: '#FFF',
    fontWeight: '700',
  },

  autoNavOverlay: { ...SHADOWS.card, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  autoNavText: { color: '#FFF', marginTop: 16, fontSize: 16, fontWeight: '600' },
  assetHeaderBg: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  assetNameText: { fontSize: 15, fontWeight: '700' },
  assetModelText: { fontSize: 12 },
  assetArrow: { marginLeft: 8 },
  assetBody: { padding: 12, paddingTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 20, color: colors.foreground, marginBottom: 12 },
  slaBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
  slaLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slaLabel: { fontSize: 12, fontWeight: '700' },
  slaValueRow: { alignItems: 'flex-end' },
  slaStatusText: { fontSize: 14, fontWeight: '800' },
  slaTime: { fontSize: 12, marginTop: 2 },
  usedPartsSection: { marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8, letterSpacing: 1 },
  partsSummaryCard: { padding: 16, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  partItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border + '40' },
  partIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  partNameMain: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: '500' },
  partQtyBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  partQtyNum: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  diagnosisCard: { padding: 16, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  diagnosisTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  diagTag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primary + '15', borderRadius: 8 },
  diagTagText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  diagnosisText: { fontSize: 15, color: colors.foreground, lineHeight: 22 },
  diagnosisDivider: { height: 1, backgroundColor: colors.border + '40', marginVertical: 12 },
  rootCauseLabel: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground, marginBottom: 4 },
  activeStepContainer: { marginTop: 12, padding: 12, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '30' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepIconBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepTitleWrap: { flex: 1 },
  activeStepLabel: { fontSize: 16, fontWeight: '800', color: colors.foreground, marginBottom: 2 },
  activeStepDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  stepContent: { marginTop: 8 },
  stepInstruction: { padding: 10, backgroundColor: colors.muted, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary },
  instructionText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  completionCard: { marginTop: 24, padding: 24, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.success + '40', alignItems: 'center' },
  completionIconBubble: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  completionTitle: { fontSize: 24, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
  completionDesc: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 },
  scrollableBottomBar: { marginTop: 8, backgroundColor: 'transparent' },
  holdForm: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  holdTabRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: colors.muted, borderRadius: 12, padding: 4 },
  holdTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  holdTabActive: { backgroundColor: colors.card },
  holdTabText: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
  holdTabTextActive: { color: colors.foreground },
  holdInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, fontSize: 15, color: colors.foreground, minHeight: 100, textAlignVertical: 'top' },
  holdFormActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  holdCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.muted },
  holdCancelText: { fontWeight: '700', color: colors.foreground },
  holdSubmitBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.primary },
  holdSubmitText: { fontWeight: '700', color: '#FFF' },
  transferContentInner: {},
  transferTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
  techListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  closeTransferBtn: { paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: colors.muted, marginTop: 16 },
  closeTransferText: { fontWeight: '700', color: colors.foreground },
  floatingActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  floatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  floatBtnText: { fontWeight: '700', color: colors.foreground },
  bottomBar: { marginBottom: 16 },
  doneButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  doneText: { fontSize: 16, fontWeight: '700' },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  globalTransferOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 9999 },
  transferModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%' },
  transferModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.foreground },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.muted, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: colors.foreground },
  techList: { flex: 1 },
});
