import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { ZenFixLogo } from '@/components/ZenFixLogo';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { DashboardStackParamList, RootStackParamList, TabParamList } from '@/app/types/navigation';
import type { WorkOrder } from '@/lib/types/workOrder';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { workOrderTypeLabel } from '@/lib/workOrderService';
import {
  Play,
  Pause,
  Square,
  Clock,
  Wrench,
  CheckCircle2,
  ClipboardCheck,
  Timer,
  ChevronRight,
  Bell,
  Megaphone,
  ShieldAlert,
  FileText,
  ClipboardList,
  ShieldCheck,
  PenTool,
  Zap,
  AlertTriangle,
  LogOut,
  Sun,
  Moon,
  Box,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { notifications } from '@/data/mockData';
import { COLORS, GRADIENTS, SHADOWS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkIn,
  checkOut,
  getAttendanceStatus,
  type AttendanceDayState,
  type AttendanceStatusDto,
} from '@/lib/attendanceService';
import {
  getLocalShiftSession,
  saveLocalShiftSession,
  shiftElapsedSeconds,
  endOfLocalDayMs,
  shouldMarkAbsentAfterMidnight,
  getLocalDayAttendance,
  saveLocalDayAttendance,
} from '@/lib/attendanceLocal';
import { getTechnicianSession } from '@/lib/technicianSession';
import { ApiError } from '@/lib/api';
import { clearTechnicianSession } from '@/lib/technicianSession';
import {
  dueDateKey,
  isDueOnDate,
  isOpenPpmSchedule,
  listMyPpmSchedules,
  ppmStatusForBadge,
  type PpmSchedule,
} from '@/lib/ppmService';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>
>;


export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, gradients, isDark, toggleTheme, shadows } = useTheme();
  const dynamicStyles = getStyles(colors, isDark);
  const [shiftPhase, setShiftPhase] = useState<AttendanceDayState>('can_check_in');
  const [shiftStartedAt, setShiftStartedAt] = useState<number | null>(null);
  const [shiftEndedAt, setShiftEndedAt] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [filter, setFilter] = useState<
    'All' | 'Breakdown' | 'PPM' | 'Inspection' | 'Reactive' | 'In Progress' | 'Completed' | 'Pending'
  >('All');
  const [activeNotice, setActiveNotice] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const { workOrders, loading: woLoading, reload: reloadWorkOrders } = useWorkOrders();
  const [ppmSchedules, setPpmSchedules] = useState<PpmSchedule[]>([]);
  const [ppmLoading, setPpmLoading] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const priorShiftAlertShown = useRef(false);

  const applyServerDay = useCallback(
    async (status: AttendanceStatusDto, technicianId: string) => {
      setShiftPhase(status.dayState);

      const started =
        (status.shiftStartedAt && new Date(status.shiftStartedAt).getTime()) ||
        (status.lastCheckIn && new Date(status.lastCheckIn).getTime()) ||
        null;
      const ended =
        (status.shiftEndedAt && new Date(status.shiftEndedAt).getTime()) ||
        (status.lastCheckOut && new Date(status.lastCheckOut).getTime()) ||
        null;

      if (status.dayState === 'on_shift' && started) {
        setShiftStartedAt(started);
        setShiftEndedAt(null);
        setElapsed(shiftElapsedSeconds(started, 'on_shift'));
        await saveLocalShiftSession(
          true,
          status.technicianName,
          started,
          technicianId,
        );
        await saveLocalDayAttendance(
          { dateKey: '', dayState: 'on_shift', startedAt: started },
          technicianId,
        );
        return;
      }

      if (status.dayState === 'checked_out') {
        setShiftStartedAt(started);
        setShiftEndedAt(ended);
        setElapsed(
          started && ended
            ? Math.max(0, Math.floor((ended - started) / 1000))
            : 0,
        );
        await saveLocalShiftSession(false, undefined, undefined, technicianId);
        await saveLocalDayAttendance(
          {
            dateKey: '',
            dayState: 'checked_out',
            startedAt: started ?? undefined,
            endedAt: ended ?? undefined,
          },
          technicianId,
        );
        return;
      }

      if (status.dayState === 'absent') {
        const absentEnded =
          ended ?? (started != null ? endOfLocalDayMs(started) : null);
        setShiftStartedAt(started);
        setShiftEndedAt(absentEnded);
        setElapsed(
          started != null
            ? shiftElapsedSeconds(started, 'absent', absentEnded)
            : 0,
        );
        await saveLocalShiftSession(false, undefined, undefined, technicianId);
        await saveLocalDayAttendance(
          {
            dateKey: '',
            dayState: 'absent',
            startedAt: started ?? undefined,
            endedAt: absentEnded ?? undefined,
          },
          technicianId,
        );
        return;
      }

      setShiftStartedAt(null);
      setShiftEndedAt(null);
      setElapsed(0);
      await saveLocalShiftSession(false, undefined, undefined, technicianId);
    },
    [],
  );

  const syncAttendance = useCallback(async () => {
    const tech = getTechnicianSession();
    const technicianId = tech?.technicianId;
    if (!technicianId) return;

    try {
      const status = await getAttendanceStatus(technicianId);
      if ('dayState' in status) {
        await applyServerDay(status, technicianId);
        if (status.priorShiftUnclosed && !priorShiftAlertShown.current) {
          priorShiftAlertShown.current = true;
          Alert.alert(
            'Previous shift not closed',
            'Yesterday’s shift was closed automatically. You may be marked absent for that day.',
          );
        }
        return;
      }
    } catch {
      // fall through to local cache
    }

    const applyAbsentFromOpenShift = async (startedAt: number) => {
      const endedAt = endOfLocalDayMs(startedAt);
      setShiftPhase('absent');
      setShiftStartedAt(startedAt);
      setShiftEndedAt(endedAt);
      setElapsed(shiftElapsedSeconds(startedAt, 'absent', endedAt));
      await saveLocalShiftSession(false, undefined, undefined, technicianId);
      await saveLocalDayAttendance(
        { dateKey: '', dayState: 'absent', startedAt, endedAt },
        technicianId,
      );
    };

    const localDay = await getLocalDayAttendance(technicianId);
    if (localDay) {
      if (
        localDay.dayState === 'on_shift' &&
        localDay.startedAt &&
        shouldMarkAbsentAfterMidnight('on_shift', localDay.startedAt)
      ) {
        await applyAbsentFromOpenShift(localDay.startedAt);
        return;
      }

      setShiftPhase(localDay.dayState);
      if (localDay.dayState === 'on_shift' && localDay.startedAt) {
        setShiftStartedAt(localDay.startedAt);
        setShiftEndedAt(null);
        setElapsed(shiftElapsedSeconds(localDay.startedAt, 'on_shift'));
        return;
      }
      if (localDay.dayState === 'checked_out') {
        setShiftStartedAt(localDay.startedAt ?? null);
        setShiftEndedAt(localDay.endedAt ?? null);
        if (localDay.startedAt && localDay.endedAt) {
          setElapsed(
            shiftElapsedSeconds(
              localDay.startedAt,
              'checked_out',
              localDay.endedAt,
            ),
          );
        }
        return;
      }
      if (localDay.dayState === 'absent') {
        const endedAt =
          localDay.endedAt ??
          (localDay.startedAt ? endOfLocalDayMs(localDay.startedAt) : null);
        setShiftStartedAt(localDay.startedAt ?? null);
        setShiftEndedAt(endedAt);
        setElapsed(
          localDay.startedAt
            ? shiftElapsedSeconds(localDay.startedAt, 'absent', endedAt)
            : 0,
        );
        return;
      }
    }

    const local = await getLocalShiftSession(technicianId);
    if (local?.active && local.startedAt) {
      if (shouldMarkAbsentAfterMidnight('on_shift', local.startedAt)) {
        await applyAbsentFromOpenShift(local.startedAt);
        return;
      }
      setShiftPhase('on_shift');
      setShiftStartedAt(local.startedAt);
      setElapsed(shiftElapsedSeconds(local.startedAt, 'on_shift'));
    }
  }, [applyServerDay]);

  const reloadPpmSchedules = useCallback(async () => {
    setPpmLoading(true);
    try {
      const rows = await listMyPpmSchedules();
      setPpmSchedules(rows.filter((r) => !!r.id && !!r.dueDate));
    } catch {
      setPpmSchedules([]);
    } finally {
      setPpmLoading(false);
    }
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([syncAttendance(), reloadWorkOrders(), reloadPpmSchedules()]).finally(() =>
      setRefreshing(false),
    );
  }, [syncAttendance, reloadWorkOrders, reloadPpmSchedules]);
  
  const handleSignOutFinal = () => {
    setShowProfileModal(false);
    clearTechnicianSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as any }],
    });
  };

  // Wall-clock timer while on shift; freeze at midnight if check-out was missed.
  useEffect(() => {
    if (shiftPhase !== 'on_shift' || shiftStartedAt == null) return;

    const tick = () => {
      if (shouldMarkAbsentAfterMidnight('on_shift', shiftStartedAt)) {
        const endedAt = endOfLocalDayMs(shiftStartedAt);
        const technicianId = getTechnicianSession()?.technicianId;
        setShiftPhase('absent');
        setShiftEndedAt(endedAt);
        setElapsed(shiftElapsedSeconds(shiftStartedAt, 'absent', endedAt));
        if (technicianId) {
          void saveLocalShiftSession(false, undefined, undefined, technicianId);
          void saveLocalDayAttendance(
            {
              dateKey: '',
              dayState: 'absent',
              startedAt: shiftStartedAt,
              endedAt,
            },
            technicianId,
          );
        }
        return;
      }
      setElapsed(shiftElapsedSeconds(shiftStartedAt, 'on_shift'));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [shiftPhase, shiftStartedAt]);

  useEffect(() => {
    void syncAttendance();
  }, [syncAttendance]);

  useFocusEffect(
    useCallback(() => {
      void syncAttendance();
      void reloadPpmSchedules();
    }, [syncAttendance, reloadPpmSchedules]),
  );

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void syncAttendance();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [syncAttendance]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filtered = workOrders.filter((wo: WorkOrder) => {
    const isFinalStatus = ['Completed', 'Verified', 'Closed'].includes(wo.status);
    const isPendingApproval = wo.status === 'Pending Approval';

    if (filter === 'All') return !isFinalStatus && !isPendingApproval;
    if (['Breakdown', 'PPM', 'Inspection', 'Reactive'].includes(filter)) {
      if (filter === 'Reactive') {
        return (wo.type === 'Reactive' || wo.type === 'Corrective') && !isFinalStatus && !isPendingApproval;
      }
      return wo.type === filter && !isFinalStatus && !isPendingApproval;
    }
    if (filter === 'Pending') {
      return (wo.status === 'Assigned' || wo.status === 'Accepted') && !isFinalStatus;
    }
    return wo.status === filter && !isFinalStatus;
  });

  const stats = [
    { label: ' Workorder', value: workOrders.length, icon: ClipboardCheck, color: colors.primary },
    { label: 'In Progress', value: workOrders.filter((w: WorkOrder) => w.status === 'In Progress').length, icon: Wrench, color: '#3B82F6' },
    { label: 'Completed', value: workOrders.filter((w: WorkOrder) => w.status === 'Completed' || w.status === 'Verified').length, icon: CheckCircle2, color: colors.success },
    { label: 'Pending', value: workOrders.filter((w: WorkOrder) => w.status === 'Assigned' || w.status === 'Accepted').length, icon: Clock, color: '#60A5FA' },
  ];

  const filters: Array<'All' | 'PPM' | 'Inspection' | 'Breakdown' | 'Reactive'> = [
    'All',
    'PPM',
    'Inspection',
    'Breakdown',
    'Reactive',
  ];

  const filterMap = ['All', 'In Progress', 'Completed', 'Pending'] as const;

  const notices = [
    { type: 'Announcement', title: 'System Maintenance', desc: 'Tonight at 10 PM', icon: Megaphone, color: colors.primary },
    { type: 'Alert', title: 'Zone B PPE', desc: 'Mandatory gear updated', icon: ShieldAlert, color: colors.destructive },
    { type: 'Instruction', title: 'Meter Readings', desc: 'Submit before 5 PM', icon: FileText, color: colors.secondary },
  ];

  // Quick-action grid: 5 items with unique neon accents
  const QUICK_LINKS = [
    { name: 'Work Orders', icon: FileText,      color: '#1E40AF',          bg: '#1E40AF18',              route: 'Maintenance' },
    { name: 'Assets',      icon: Box,           color: '#0d9488',          bg: '#0d948818',              route: 'Assets' },
    { name: 'PPM',         icon: ClipboardList, color: colors.primary,    bg: colors.primary + '18',    route: 'PPM' },
    { name: 'Inspection',  icon: ShieldCheck,   color: colors.secondary,  bg: colors.secondary + '18',  route: 'Inspections' },
    { name: 'HSE',         icon: ShieldAlert,   color: colors.destructive, bg: colors.destructive + '18', route: 'HSE' },
    { name: 'Snagging',    icon: PenTool,       color: colors.accent,     bg: colors.accent + '18',     route: 'Snagging' },
    {
      name: 'Meter Reading',
      icon: Zap,
      color: '#F59E0B',
      bg: '#F59E0B18',
      route: 'MeterReading',
      fullWidth: true,
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayFiltered = filtered.filter(
    (wo: WorkOrder) =>
      isDueOnDate(wo.dueDate, todayStr) &&
      wo.type !== 'PPM' &&
      wo.type !== 'Inspection',
  );

  const isPpmTab = filter === 'PPM';
  const isAllTab = filter === 'All';
  const todayPpmSchedules = ppmSchedules.filter(
    (row) =>
      dueDateKey(row.dueDate) === todayStr &&
      isOpenPpmSchedule(row.status),
  );

  return (
    <ScrollView
      style={[dynamicStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <LinearGradient
        colors={gradients.hero as any}
        style={[dynamicStyles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={dynamicStyles.headerTop}>
          <View style={dynamicStyles.greetingGroup}>
            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.7}
              style={dynamicStyles.logoButton}
            >
              <ZenFixLogo size="sm" />
            </TouchableOpacity>
            <View>
              <Text style={[dynamicStyles.greeting, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>Good Morning</Text>
              <Text style={[dynamicStyles.userName, { color: isDark ? '#FFF' : colors.foreground }]}>Ahmed Rashid</Text>
            </View>
          </View>
          <View style={dynamicStyles.headerActions}>
            <TouchableOpacity
              style={dynamicStyles.themeToggleBtn}
              onPress={toggleTheme}
            >
              {isDark ? <Sun size={20} color="#FFF" /> : <Moon size={20} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={dynamicStyles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell size={24} color={isDark ? "#FFF" : colors.primary} />
              {unreadCount > 0 && (
                <View style={dynamicStyles.notificationBadge}>
                  <Text style={dynamicStyles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View layout={Layout.springify()} style={dynamicStyles.shiftCard}>
          <View style={dynamicStyles.shiftHeader}>
            <View style={dynamicStyles.shiftLabel}>
              <Timer size={16} color={isDark ? colors.secondary : colors.primary} />
              <Text style={[dynamicStyles.shiftLabelText, { color: isDark ? 'rgba(255,255,255,0.7)' : colors.foreground }]}>Shift Timer</Text>
            </View>
            {shiftPhase === 'on_shift' && (
              <View style={[dynamicStyles.activeStatus, { backgroundColor: isDark ? 'rgba(22,101,52,0.2)' : 'rgba(22,101,52,0.1)' }]}>
                <Text style={[dynamicStyles.activeStatusText, { color: colors.success }]}>
                  ● On shift
                </Text>
              </View>
            )}
            {shiftPhase === 'checked_out' && (
              <View style={[dynamicStyles.activeStatus, { backgroundColor: isDark ? 'rgba(100,116,139,0.25)' : 'rgba(100,116,139,0.15)' }]}>
                <Text style={[dynamicStyles.activeStatusText, { color: colors.mutedForeground }]}>
                  Checked out
                </Text>
              </View>
            )}
            {shiftPhase === 'absent' && (
              <View style={[dynamicStyles.activeStatus, { backgroundColor: isDark ? 'rgba(185,28,28,0.25)' : 'rgba(254,226,226,0.9)' }]}>
                <Text style={[dynamicStyles.activeStatusText, { color: colors.destructive }]}>
                  Absent
                </Text>
              </View>
            )}
          </View>

          <Text style={[dynamicStyles.timerText, { color: isDark ? '#FFF' : colors.foreground }]}>
            {shiftPhase === 'can_check_in' ? '--:--:--' : formatTime(elapsed)}
          </Text>

          {shiftPhase === 'checked_out' ? (
            <Text style={dynamicStyles.shiftHint}>
              You have checked out for today. Check in again tomorrow.
            </Text>
          ) : null}
          {shiftPhase === 'absent' ? (
            <Text style={dynamicStyles.shiftHint}>
              Marked absent — no check-out before midnight. Check in to start today&apos;s shift.
            </Text>
          ) : null}

          <View style={dynamicStyles.shiftActions}>
            {shiftPhase === 'can_check_in' || shiftPhase === 'absent' ? (
              <TouchableOpacity
                onPress={async () => {
                  setAttendanceBusy(true);
                  const technicianId = getTechnicianSession()?.technicianId ?? 'T001';
                  const name = getTechnicianSession()?.name ?? 'Technician';
                  try {
                    const startedAt = Date.now();
                    await checkIn(name);
                    await saveLocalShiftSession(true, name, startedAt, technicianId);
                    await saveLocalDayAttendance(
                      { dateKey: '', dayState: 'on_shift', startedAt },
                      technicianId,
                    );
                    setShiftPhase('on_shift');
                    setShiftStartedAt(startedAt);
                    setShiftEndedAt(null);
                    setElapsed(0);
                  } catch (err) {
                    const message =
                      err instanceof ApiError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : 'Could not reach server';
                    if (
                      message.includes('checked out') ||
                      message.includes('absent')
                    ) {
                      Alert.alert('Cannot check in', message);
                      void syncAttendance();
                      return;
                    }
                    const startedAt = Date.now();
                    await saveLocalShiftSession(true, name, startedAt, technicianId);
                    await saveLocalDayAttendance(
                      { dateKey: '', dayState: 'on_shift', startedAt },
                      technicianId,
                    );
                    setShiftPhase('on_shift');
                    setShiftStartedAt(startedAt);
                    setElapsed(0);
                    Alert.alert(
                      'Checked in (offline)',
                      `Shift timer started on this device. Sync when the server is available.\n\n${message}`,
                    );
                  } finally {
                    setAttendanceBusy(false);
                  }
                }}
                style={dynamicStyles.checkInButton}
                activeOpacity={0.85}
                disabled={attendanceBusy}
              >
                <LinearGradient
                  colors={gradients.primary as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={dynamicStyles.checkInGradient}
                >
                  {attendanceBusy ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Play size={16} color="#FFF" />
                  )}
                  <Text style={dynamicStyles.checkInText}>
                    {attendanceBusy ? 'Checking in...' : 'Check In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {shiftPhase === 'on_shift' ? (
              <TouchableOpacity
                onPress={async () => {
                  setAttendanceBusy(true);
                  const technicianId = getTechnicianSession()?.technicianId ?? 'T001';
                  const endedAt = Date.now();
                  try {
                    await checkOut();
                    await saveLocalShiftSession(false, undefined, undefined, technicianId);
                    await saveLocalDayAttendance(
                      {
                        dateKey: '',
                        dayState: 'checked_out',
                        startedAt: shiftStartedAt ?? undefined,
                        endedAt,
                      },
                      technicianId,
                    );
                    setShiftPhase('checked_out');
                    setShiftEndedAt(endedAt);
                    if (shiftStartedAt) {
                      setElapsed(
                        Math.max(0, Math.floor((endedAt - shiftStartedAt) / 1000)),
                      );
                    }
                  } catch (err) {
                    const message =
                      err instanceof ApiError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : 'Could not reach server';
                    await saveLocalShiftSession(false, undefined, undefined, technicianId);
                    await saveLocalDayAttendance(
                      {
                        dateKey: '',
                        dayState: 'checked_out',
                        startedAt: shiftStartedAt ?? undefined,
                        endedAt,
                      },
                      technicianId,
                    );
                    setShiftPhase('checked_out');
                    setShiftEndedAt(endedAt);
                    Alert.alert('Checked out (offline)', message);
                  } finally {
                    setAttendanceBusy(false);
                  }
                }}
                style={dynamicStyles.checkInButton}
                activeOpacity={0.8}
                disabled={attendanceBusy}
              >
                <LinearGradient
                  colors={['#EF4444', '#B91C1C'] as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={dynamicStyles.checkInGradient}
                >
                  {attendanceBusy ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Square size={16} color="#FFF" />
                  )}
                  <Text style={dynamicStyles.checkInText}>
                    {attendanceBusy ? 'Checking out...' : 'Check Out'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {shiftPhase === 'checked_out' && (
              <View style={dynamicStyles.shiftDonePanel}>
                <CheckCircle2 size={20} color={colors.mutedForeground} />
                <Text style={dynamicStyles.shiftDoneText}>Shift complete for today</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={dynamicStyles.mainContent}>
        <Animated.View entering={FadeInUp.delay(100)} style={dynamicStyles.summaryBar}>
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={dynamicStyles.summarySegment}
                onPress={() => setFilter(filterMap[i] as typeof filter)}
              >
                <Text style={[dynamicStyles.summaryValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={dynamicStyles.summaryLabel}>{stat.label}</Text>
              </TouchableOpacity>
              {i < stats.length - 1 && <View style={dynamicStyles.summaryDivider} />}
            </React.Fragment>
          ))}
        </Animated.View>

        <View style={dynamicStyles.noticeSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={dynamicStyles.noticeScroll}
            snapToInterval={width - 40 + 12}
            snapToAlignment="center"
            decelerationRate="fast"
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setActiveNotice(Math.round(x / (width - 40 + 12)));
            }}
            scrollEventThrottle={16}
          >
            {notices.map((notice, n) => (
              <Animated.View key={notice.title} entering={FadeInUp.delay(n * 100)}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={dynamicStyles.noticeCard}
                >
                  <View style={[dynamicStyles.noticeIcon, { backgroundColor: notice.color + '1A' }]}>
                    <notice.icon size={16} color={notice.color} />
                  </View>
                  <View style={dynamicStyles.noticeTextContent}>
                    <Text style={[dynamicStyles.noticeType, { color: notice.color }]}>{notice.type}</Text>
                    <Text style={dynamicStyles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                    <Text style={dynamicStyles.noticeDesc} numberOfLines={1}>{notice.desc}</Text>
                  </View>
                  <View style={dynamicStyles.noticeArrow}>
                    <ChevronRight size={14} color={notice.color} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
          <View style={dynamicStyles.dotContainer}>
            {notices.map((_, i) => (
              <View
                key={i}
                style={[
                  dynamicStyles.paginationDot,
                  activeNotice === i && dynamicStyles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>

        <View style={dynamicStyles.sectionHeader}>
          <Text style={dynamicStyles.sectionLabel}>QUICK ACTIONS</Text>
        </View>
        <View style={dynamicStyles.qaGrid}>
          {QUICK_LINKS.filter((link) => !('fullWidth' in link && link.fullWidth)).map((link) => (
            <TouchableOpacity
              key={link.name}
              onPress={() => navigation.navigate(link.route as any)}
              style={[dynamicStyles.qaCard, { backgroundColor: link.color + (isDark ? '20' : '0D') }]}
              activeOpacity={0.7}
            >
              <View style={dynamicStyles.qaCircle}>
                <link.icon size={24} color={link.color} />
              </View>
              <Text style={[dynamicStyles.qaName, { color: link.color }]} numberOfLines={2}>
                {link.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {QUICK_LINKS.filter((link) => 'fullWidth' in link && link.fullWidth).map((link) => (
          <TouchableOpacity
            key={link.name}
            onPress={() => navigation.navigate(link.route as any)}
            style={[
              dynamicStyles.qaCardFull,
              { backgroundColor: link.color + (isDark ? '20' : '0D') },
            ]}
            activeOpacity={0.7}
          >
            <View style={[dynamicStyles.qaCircle, dynamicStyles.qaCircleInline]}>
              <link.icon size={24} color={link.color} />
            </View>
            <Text style={[dynamicStyles.qaNameFull, { color: link.color, flex: 1 }]}>
              {link.name}
            </Text>
            <ChevronRight size={20} color={link.color} />
          </TouchableOpacity>
        ))}

        <View style={dynamicStyles.sectionHeader}>
          <Text style={dynamicStyles.sectionLabel}>
            {isPpmTab ? "TODAY'S PPM" : "TODAY'S WORK ORDERS"}
          </Text>
          <TouchableOpacity
            onPress={() =>
              isPpmTab ? navigation.navigate('PPM') : navigation.navigate('Maintenance' as any)
            }
          >
            <Text style={dynamicStyles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={dynamicStyles.filterScroll}
          contentContainerStyle={dynamicStyles.filterContent}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[dynamicStyles.filterTab, filter === f && dynamicStyles.activeFilterTab]}
            >
              {filter === f && (
                <LinearGradient
                  colors={gradients.primary as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[dynamicStyles.filterText, filter === f && dynamicStyles.activeFilterText]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={dynamicStyles.workOrders}>
          {isPpmTab ? (
            ppmLoading && todayPpmSchedules.length === 0 ? (
              <View style={dynamicStyles.emptyState}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={dynamicStyles.emptyText}>Loading PPM tasks…</Text>
              </View>
            ) : todayPpmSchedules.length === 0 ? (
              <View style={dynamicStyles.emptyState}>
                <CheckCircle2 size={32} color={colors.mutedForeground} />
                <Text style={dynamicStyles.emptyText}>No PPM tasks for today!</Text>
              </View>
            ) : (
              todayPpmSchedules.map((schedule) => (
                <TouchableOpacity
                  key={`ppm-${schedule.id}`}
                  onPress={() =>
                    navigation.navigate('PpmExecutionDetails', {
                      scheduleId: schedule.id,
                      title: schedule.title,
                    })
                  }
                  style={dynamicStyles.woCard}
                  activeOpacity={0.7}
                >
                  <GradientBracket isDark={isDark} cardColor={colors.card} />
                  <View style={dynamicStyles.woHeader}>
                    <View style={dynamicStyles.woInfo}>
                      <View style={dynamicStyles.woBadges}>
                        <StatusBadge status="PPM" />
                      </View>
                      <Text style={dynamicStyles.woTitle} numberOfLines={2}>
                        {schedule.title}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </View>
                  <View style={dynamicStyles.woFooter}>
                    <View style={dynamicStyles.woFooterMeta}>
                      <Text style={dynamicStyles.woId} numberOfLines={1}>
                        {schedule.ppmCode ?? schedule.id.slice(0, 8)}
                      </Text>
                      <Text style={dynamicStyles.woLocation} numberOfLines={1}>
                        {dueDateKey(schedule.dueDate)}
                      </Text>
                    </View>
                    <View style={dynamicStyles.woFooterBadge}>
                      <StatusBadge status={ppmStatusForBadge(schedule.status)} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : isAllTab && (ppmLoading || woLoading) && todayPpmSchedules.length === 0 && todayFiltered.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={dynamicStyles.emptyText}>Loading today&apos;s work…</Text>
            </View>
          ) : isAllTab && todayPpmSchedules.length === 0 && todayFiltered.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <CheckCircle2 size={32} color={colors.mutedForeground} />
              <Text style={dynamicStyles.emptyText}>No work orders for today!</Text>
            </View>
          ) : !isAllTab && !isPpmTab && todayFiltered.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <CheckCircle2 size={32} color={colors.mutedForeground} />
              <Text style={dynamicStyles.emptyText}>No work orders for today!</Text>
            </View>
          ) : (
            <>
              {isAllTab &&
                todayPpmSchedules.map((schedule) => (
                  <TouchableOpacity
                    key={`ppm-${schedule.id}`}
                    onPress={() =>
                      navigation.navigate('PpmExecutionDetails', {
                        scheduleId: schedule.id,
                        title: schedule.title,
                      })
                    }
                    style={dynamicStyles.woCard}
                    activeOpacity={0.7}
                  >
                    <GradientBracket isDark={isDark} cardColor={colors.card} />
                    <View style={dynamicStyles.woHeader}>
                      <View style={dynamicStyles.woInfo}>
                        <View style={dynamicStyles.woBadges}>
                          <StatusBadge status="PPM" />
                        </View>
                        <Text style={dynamicStyles.woTitle} numberOfLines={2}>
                          {schedule.title}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={dynamicStyles.woFooter}>
                      <View style={dynamicStyles.woFooterMeta}>
                        <Text style={dynamicStyles.woId} numberOfLines={1}>
                          {schedule.ppmCode ?? schedule.id.slice(0, 8)}
                        </Text>
                        <Text style={dynamicStyles.woLocation} numberOfLines={1}>
                          {dueDateKey(schedule.dueDate)}
                        </Text>
                      </View>
                      <View style={dynamicStyles.woFooterBadge}>
                        <StatusBadge status={ppmStatusForBadge(schedule.status)} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              {todayFiltered.map((wo: WorkOrder) => (
                <TouchableOpacity
                  key={wo.id}
                  onPress={() =>
                    navigation.navigate('Maintenance', {
                      screen: 'WorkOrderDetails',
                      params: { id: wo.id },
                    })
                  }
                  style={dynamicStyles.woCard}
                  activeOpacity={0.7}
                >
                  <GradientBracket isDark={isDark} cardColor={colors.card} />
                  <View style={dynamicStyles.woHeader}>
                    <View style={dynamicStyles.woInfo}>
                      <View style={dynamicStyles.woBadges}>
                        <StatusBadge status={workOrderTypeLabel(wo.type)} />
                        <StatusBadge status={wo.priority} />
                      </View>
                      <Text style={dynamicStyles.woTitle} numberOfLines={2}>
                        {wo.title}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </View>
                    <View style={dynamicStyles.woFooter}>
                      <View style={dynamicStyles.woFooterMeta}>
                        <Text style={dynamicStyles.woLocation} numberOfLines={2}>
                          {wo.location}
                        </Text>
                      </View>
                      <View style={dynamicStyles.woFooterBadge}>
                        <StatusBadge status={wo.status} />
                      </View>
                    </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </View>

      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable 
          style={dynamicStyles.modalBackdrop} 
          onPress={() => setShowProfileModal(false)}
        >
          <Animated.View entering={FadeInUp} style={dynamicStyles.profileModalCard}>
            <View style={dynamicStyles.modalAvatarLarge}>
              <Text style={dynamicStyles.modalInitialsLarge}>AR</Text>
            </View>
            <Text style={dynamicStyles.modalUserName}>Ahmed Rashid</Text>
            <View style={dynamicStyles.modalUserMeta}>
              <Text style={dynamicStyles.modalUserRole}>Senior Maintenance Technician</Text>
              <Text style={dynamicStyles.modalUserId}>ID: SZ-2024-089</Text>
            </View>

            <TouchableOpacity 
              onPress={handleSignOutFinal}
              style={dynamicStyles.signOutBtn}
            >
              <LinearGradient
                colors={[colors.destructive, '#B91C1C'] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={dynamicStyles.signOutGradient}
              >
                <LogOut size={18} color="#FFF" />
                <Text style={dynamicStyles.signOutBtnText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowProfileModal(false)}
              style={dynamicStyles.modalCancelBtn}
            >
              <Text style={dynamicStyles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function GradientBracket({ isDark, cardColor }: { isDark: boolean; cardColor: string }) {
  return (
    <View style={staticStyles.bracketWrapper}>
      <LinearGradient
        colors={isDark ? ['#2563EB', '#92D230'] : ['#00D1B2', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={staticStyles.bracketPill}
      >
        <View style={[staticStyles.bracketHole, { backgroundColor: cardColor }]} />
      </LinearGradient>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 12, fontWeight: '600' },
  userName: { fontSize: 20, fontWeight: '700' },
  greetingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    padding: 4,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.destructive,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  profileModalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    ...SHADOWS.elevated,
  },
  modalAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary + '33',
  },
  modalInitialsLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: isDark ? '#FFF' : colors.foreground,
  },
  modalUserName: {
    fontSize: 22,
    fontWeight: '800',
    color: isDark ? '#FFF' : colors.foreground,
    marginBottom: 8,
  },
  modalUserMeta: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 4,
  },
  modalUserRole: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  modalUserId: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  signOutBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 12,
  },
  signOutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalCancelBtn: {
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  shiftCard: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#DBEAFE',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shiftLabelText: { fontSize: 12, fontWeight: '600' },
  activeStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  activeStatusText: { fontSize: 10, fontWeight: '700' },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  shiftActions: { flexDirection: 'row', gap: 12 },
  checkInButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  checkInGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  checkInText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shiftHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 18,
  },
  shiftDonePanel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
  },
  shiftDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  mainContent: { paddingHorizontal: 20 },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#FFF',
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  summarySegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
    includeFontPadding: false,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 9,
    height: 20,
    justifyContent: 'center',
  },
  summaryDivider: {
    width: 1,
    height: '60%',
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
  },
  noticeSection: { marginTop: 12, marginHorizontal: -20 },
  noticeScroll: { paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  noticeCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: width - 40,
    borderRadius: 20,
    backgroundColor: isDark ? colors.card : '#DBEAFE',
    borderWidth: 1,
    borderColor: isDark ? '#E5F5CC' + '20' : '#BFDBFE',
    overflow: 'hidden',
    ...SHADOWS.elevated,
  },
  noticeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noticeTextContent: { flex: 1 },
  noticeType: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  noticeDesc: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  noticeArrow: { opacity: 0.3 },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 4 },
  paginationDot: { height: 4, width: 4, borderRadius: 2, backgroundColor: colors.border },
  paginationDotActive: { backgroundColor: colors.primary, width: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  seeAllText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  qaCard: {
    width: (width - 40 - 20) / 3, // 3 column grid
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  qaCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  qaName: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.1,
    lineHeight: 12,
  },
  qaCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  qaCircleInline: {
    marginBottom: 0,
    marginRight: 4,
  },
  qaNameFull: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  filterScroll: { marginBottom: 14 },
  filterContent: { gap: 8 },
  filterTab: {
    borderRadius: 99,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.muted + '80',
    backgroundColor: colors.card,
  },
  activeFilterTab: {
    borderColor: colors.primary,
  },
  filterText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  activeFilterText: { color: '#FFF', fontWeight: '700' },
  workOrders: { gap: 12 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  woCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    paddingLeft: 24,
    borderWidth: 1,
    borderColor: colors.muted + '4D',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  woInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  woBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  woTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, flexShrink: 1 },
  woFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.muted + '40',
  },
  woFooterMeta: { flex: 1, minWidth: 0, gap: 3 },
  woFooterBadge: { flexShrink: 0, maxWidth: '38%' },
  woId: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  woLocation: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500', lineHeight: 15 },
});

const staticStyles = StyleSheet.create({
  bracketWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 16,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  bracketPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 40,
    borderRadius: 20,
  },
  bracketHole: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    right: -10,
    borderRadius: 18,
  },
});
