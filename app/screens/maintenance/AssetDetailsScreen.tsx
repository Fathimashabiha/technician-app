import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Barcode, MapPin, Calendar, AlertTriangle, ChevronRight,
  Video, FileText, Package, ArrowLeft, ShieldCheck, Clock, Zap,
  Wrench, Activity, CheckCircle2, UserPlus
} from 'lucide-react-native';
import type { Asset } from '@/lib/types/asset';
import type { AssetManual } from '@/lib/types/assetDocuments';
import { fetchAssetManuals } from '@/lib/assetDocumentsService';
import type { WorkOrder, WorkOrderType } from '@/lib/types/workOrder';
import { fetchExternalAsset } from '@/lib/assetService';
import { fetchWorkOrders } from '@/lib/workOrderService';
import { listAssetPpmSchedules, ppmStatusForBadge, type PpmSchedule } from '@/lib/ppmService';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/Card';
import { COLORS, SHADOWS, GRADIENTS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MaintenanceStackParamList } from '@/app/types/navigation';

type AssetHistoryEntry =
  | { kind: 'workorder'; id: string; date: string; workOrder: WorkOrder }
  | { kind: 'ppm'; id: string; date: string; schedule: PpmSchedule }
  | { kind: 'inspection'; id: string; date: string; workOrder: WorkOrder };

const SERVICE_WORK_ORDER_TYPES = new Set<WorkOrderType>([
  'Breakdown',
  'Reactive',
  'Corrective',
  'Other',
]);

function isServiceWorkOrderType(type: WorkOrderType): boolean {
  return SERVICE_WORK_ORDER_TYPES.has(type);
}

function workOrderHistoryLabel(type: WorkOrderType): string {
  if (type === 'Breakdown') return 'Breakdown';
  if (type === 'Reactive') return 'Reactive';
  return 'Service';
}

function historyDateKey(value: string | undefined): string {
  if (!value?.trim()) return '';
  return value.trim().slice(0, 10);
}

function buildAssetHistoryTimeline(
  serviceWorkOrders: WorkOrder[],
  inspectionWorkOrders: WorkOrder[],
  ppmSchedules: PpmSchedule[],
): AssetHistoryEntry[] {
  const entries: AssetHistoryEntry[] = [
    ...serviceWorkOrders.map((workOrder) => ({
      kind: 'workorder' as const,
      id: `wo-${workOrder.id}`,
      date: historyDateKey(workOrder.completionDate ?? workOrder.dueDate),
      workOrder,
    })),
    ...inspectionWorkOrders.map((workOrder) => ({
      kind: 'inspection' as const,
      id: `insp-${workOrder.id}`,
      date: historyDateKey(workOrder.completionDate ?? workOrder.dueDate),
      workOrder,
    })),
    ...ppmSchedules.map((schedule) => ({
      kind: 'ppm' as const,
      id: `ppm-${schedule.id}`,
      date: historyDateKey(schedule.dueDate),
      schedule,
    })),
  ];

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export default function AssetDetailsScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const route = useRoute<RouteProp<MaintenanceStackParamList, 'AssetDetails'>>();
  const {
    assetId,
    isReviewMode,
    workOrderId,
    scheduleId,
    returnTo,
    initialView,
  } = (route.params as any) || {};

  const [viewMode, setViewMode] = useState<'details' | 'manuals' | 'history'>(
    initialView ?? 'details'
  );
  const [asset, setAsset] = useState<Asset | null>(null);
  const [serviceWorkOrders, setServiceWorkOrders] = useState<WorkOrder[]>([]);
  const [inspectionWorkOrders, setInspectionWorkOrders] = useState<WorkOrder[]>([]);
  const [ppmHistory, setPpmHistory] = useState<PpmSchedule[]>([]);
  const [assetManuals, setAssetManuals] = useState<AssetManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAsset = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [loadedAsset, workOrders, manuals, ppmSchedules] = await Promise.all([
        fetchExternalAsset(String(assetId)),
        fetchWorkOrders().catch(() => [] as WorkOrder[]),
        fetchAssetManuals(String(assetId)).catch(() => [] as AssetManual[]),
        listAssetPpmSchedules(String(assetId)).catch(() => [] as PpmSchedule[]),
      ]);
      const forAsset = workOrders.filter((wo) => wo.assetId === loadedAsset.id);
      setAsset(loadedAsset);
      setServiceWorkOrders(forAsset.filter((wo) => isServiceWorkOrderType(wo.type)));
      setInspectionWorkOrders(forAsset.filter((wo) => wo.type === 'Inspection'));
      setPpmHistory(ppmSchedules);
      setAssetManuals(manuals);
    } catch (err: unknown) {
      setAsset(null);
      setServiceWorkOrders([]);
      setInspectionWorkOrders([]);
      setPpmHistory([]);
      setAssetManuals([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load asset from server.');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    void loadAsset();
  }, [loadAsset]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadError || !asset) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 8 }}>
          Asset not available
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22, marginBottom: 16 }}>
          {loadError ?? 'Unknown error'}
        </Text>
        <TouchableOpacity
          onPress={() => void loadAsset()}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderDetails = () => (
    <Animated.View entering={FadeInUp} style={styles.subview}>
      {/* Asset Info Card */}
      <Card variant="elevated" style={styles.assetCard}>
        <View style={styles.assetHeader}>
          <View style={styles.assetTitleRow}>
            <Text style={styles.assetName} numberOfLines={2}>
              {asset.name}
            </Text>
            <View style={styles.assetStatusWrap}>
              <StatusBadge status={asset.status} />
            </View>
          </View>
          <Text style={styles.assetType} numberOfLines={1}>
            {asset.type} • {asset.id}
          </Text>
        </View>

        {/* Technical Specs Tab-like Grid */}
        <View style={styles.specsGrid}>
          <View style={styles.specItem}>
            <Barcode size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Serial Number</Text>
              <Text style={styles.specValue}>{asset.serialNumber}</Text>
            </View>
          </View>
          <View style={styles.specItem}>
            <MapPin size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Location</Text>
              <Text style={styles.specValue}>{asset.location}</Text>
            </View>
          </View>
          <View style={styles.specItem}>
            <Package size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Manufacturer</Text>
              <Text style={styles.specValue}>{asset.manufacturer}</Text>
            </View>
          </View>
          <View style={styles.specItem}>
            <AlertTriangle size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Criticality</Text>
              <Text style={[styles.specValue, { color: asset.criticality === 'Critical' ? colors.destructive : colors.foreground }]}>
                {asset.criticality}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* SLA Policy Card */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <Card style={styles.slaCard}>
          <LinearGradient
            colors={[colors.card, colors.panel]}
            style={styles.slaGradient}
          >
            <View style={styles.slaHeaderRow}>
              <View style={styles.slaIconCircle}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.slaTitle}>SLA Contract & Policy</Text>
                <Text style={styles.slaTierText}>{asset.slaTier}</Text>
              </View>
            </View>
            <View style={styles.slaPolicyGrid}>
              <View style={styles.slaPolicyItem}>
                <Zap size={14} color={colors.warning} />
                <View>
                  <Text style={styles.slaPolicyLabel}>Target Response</Text>
                  <Text style={styles.slaPolicyValue}>{asset.slaPolicy.response}</Text>
                </View>
              </View>
              <View style={styles.slaPolicyItem}>
                <Clock size={14} color={colors.secondary} />
                <View>
                  <Text style={styles.slaPolicyLabel}>Target Resolution</Text>
                  <Text style={styles.slaPolicyValue}>{asset.slaPolicy.resolution}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Card>
      </Animated.View>

      {/* Lifecycle Details */}
      <View style={styles.lifecycleRow}>
        <View style={styles.lifecycleCard}>
          <Calendar size={14} color={colors.primary} />
          <View>
            <Text style={styles.lifecycleLabel}>Last Service</Text>
            <Text style={styles.lifecycleValue}>{asset.lastService}</Text>
          </View>
        </View>
        <View style={styles.lifecycleCard}>
          <Wrench size={14} color={colors.secondary} />
          <View>
            <Text style={styles.lifecycleLabel}>Next Service</Text>
            <Text style={styles.lifecycleValue}>{asset.nextService}</Text>
          </View>
        </View>
      </View>

      <View style={styles.warrantyBar}>
        <View style={styles.warrantyInfo}>
          <Text style={styles.warrantyLabel}>Warranty Coverage</Text>
          <Text style={[styles.warrantyValue, { color: colors.mutedForeground }]}>Expires: {asset.warrantyExpiry}</Text>
        </View>
        <View style={styles.warrantyBadge}>
          <Text style={styles.warrantyBadgeText}>ACTIVE</Text>
        </View>
      </View>

      {/* Grid of Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity onPress={() => setViewMode('manuals')} style={styles.actionBtn}>
          <LinearGradient colors={gradients.primary as any} style={styles.actionGradient}>
            <FileText size={18} color="#FFF" />
            <Text style={styles.actionLabel}>View Manuals</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => setViewMode('history')}
        >
          <LinearGradient 
            colors={['#3B82F6', '#1E40AF']} 
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Activity size={18} color="#FFF" />
            <Text style={styles.actionLabel}>Full History</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderManuals = () => (
    <Animated.View entering={FadeInRight} style={styles.subview}>
      <Text style={styles.subviewSubtitle}>Documents & Manuals — {assetManuals.length} total</Text>
      <View style={styles.manualsList}>
        {assetManuals.map((manual) => (
          <Card key={manual.id} style={styles.manualCard}>
            <View style={styles.manualInfo}>
              <View style={[styles.manualIcon, { backgroundColor: manual.type === 'PDF' ? colors.destructive + '1A' : colors.primary + '1A' }]}>
                {manual.type === 'PDF' ? <FileText size={18} color={colors.destructive} /> : <Video size={18} color={colors.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manualName}>{manual.title}</Text>
                <Text style={styles.manualMeta}>{manual.type} • {manual.size} • {manual.lastUpdated}</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Card>
        ))}
      </View>
    </Animated.View>
  );

  const renderHistory = () => {
    const breakdownCount = serviceWorkOrders.filter((wo) => wo.type === 'Breakdown').length;
    const servicesCount = serviceWorkOrders.filter(
      (wo) => wo.type === 'Reactive' || wo.type === 'Corrective' || wo.type === 'Other',
    ).length;
    const timeline = buildAssetHistoryTimeline(serviceWorkOrders, inspectionWorkOrders, ppmHistory);

    const dotColor = (entry: AssetHistoryEntry) => {
      if (entry.kind === 'ppm') return colors.primary;
      if (entry.kind === 'inspection') return colors.secondary;
      if (entry.workOrder.type === 'Breakdown') return colors.destructive;
      return colors.primary;
    };

    const openHistoryEntry = (entry: AssetHistoryEntry) => {
      if (entry.kind === 'ppm') {
        navigation.navigate('PpmExecutionDetails' as any, { scheduleId: entry.schedule.id });
        return;
      }
      navigation.navigate('WorkOrderDetails' as any, { id: entry.workOrder.id });
    };

    return (
      <Animated.View entering={FadeInRight} style={styles.subview}>
        <View style={styles.historyStatsRow}>
          <View style={styles.historyStatBox}>
            <Text style={styles.historyStatVal}>{servicesCount}</Text>
            <Text style={styles.historyStatLab}>Services</Text>
          </View>
          <View style={[styles.historyStatBox, { borderLeftWidth: 1, borderLeftColor: colors.border + '20' }]}>
            <Text style={[styles.historyStatVal, { color: colors.destructive }]}>{breakdownCount}</Text>
            <Text style={styles.historyStatLab}>Breakdowns</Text>
          </View>
          <View style={[styles.historyStatBox, { borderLeftWidth: 1, borderLeftColor: colors.border + '20' }]}>
            <Text style={[styles.historyStatVal, { color: colors.primary }]}>{ppmHistory.length}</Text>
            <Text style={styles.historyStatLab}>PPM</Text>
          </View>
          <View style={[styles.historyStatBox, { borderLeftWidth: 1, borderLeftColor: colors.border + '20' }]}>
            <Text style={[styles.historyStatVal, { color: colors.secondary }]}>{inspectionWorkOrders.length}</Text>
            <Text style={styles.historyStatLab}>Inspections</Text>
          </View>
        </View>

        <Text style={styles.subviewSubtitle}>Service Log — Timeline</Text>

        <View style={styles.historyTimeline}>
          {timeline.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Activity size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyHistoryText}>No service history recorded yet.</Text>
            </View>
          ) : (
            timeline.map((entry, index) => {
              const isPpm = entry.kind === 'ppm';
              const isInspection = entry.kind === 'inspection';
              const wo = entry.kind === 'workorder' || entry.kind === 'inspection' ? entry.workOrder : null;
              const label = isPpm
                ? 'PPM'
                : isInspection
                  ? 'Inspection'
                  : workOrderHistoryLabel(wo!.type);
              const title = isPpm ? entry.schedule.title : wo!.title;
              const refId = isPpm ? (entry.schedule.ppmCode ?? entry.schedule.id) : wo!.id;
              const date = isPpm ? entry.schedule.dueDate : wo!.dueDate;
              const status = isPpm ? ppmStatusForBadge(entry.schedule.status) : wo!.status;
              const typeColor = isPpm
                ? colors.primary
                : isInspection
                  ? colors.secondary
                  : wo!.type === 'Breakdown'
                    ? colors.destructive
                    : colors.primary;

              return (
                <View key={entry.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: dotColor(entry) }]} />
                    {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <TouchableOpacity
                    style={styles.timelineRight}
                    activeOpacity={0.7}
                    onPress={() => openHistoryEntry(entry)}
                  >
                    <Card style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <Text style={styles.historyWoId}>{refId}</Text>
                        <Text style={styles.historyDate}>{date}</Text>
                      </View>
                      <Text style={styles.historyTitle}>{title}</Text>
                      {wo?.completedBy ? (
                        <View style={styles.technicianRow}>
                          <UserPlus size={12} color={colors.mutedForeground} />
                          <Text style={styles.technicianName}>
                            Performed by: <Text style={{ color: colors.foreground }}>{wo.completedBy}</Text>
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.historyFooter}>
                        <View style={styles.historyTypeTag}>
                          <Text style={[styles.historyTypeText, { color: typeColor }]}>{label}</Text>
                        </View>
                        <StatusBadge status={status} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.card} barStyle="light-content" />
      <View style={[styles.header, { 
        paddingTop: insets.top + 8,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.muted + '40'
      }]}>
        <TouchableOpacity 
          onPress={() => {
            if (viewMode !== 'details') setViewMode('details');
            else navigation.goBack();
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === 'manuals' ? 'Manuals & Documents' : 
           viewMode === 'history' ? 'Asset Service History' : 
           'Full Asset Details'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'details' ? renderDetails() : 
         viewMode === 'manuals' ? renderManuals() : 
         renderHistory()}

        {isReviewMode && (
          <View style={styles.scrollableFooter}>
            <TouchableOpacity 
              style={styles.confirmBtn}
              onPress={() => {
                if (returnTo === 'PpmExecutionDetails' && (scheduleId || workOrderId)) {
                  navigation.navigate('PpmExecutionDetails' as any, {
                    scheduleId: scheduleId ?? workOrderId,
                    stepCompleted: 'qr_scan',
                  } as any);
                  return;
                }
                navigation.navigate('WorkOrderDetails' as any, { 
                  id: workOrderId, 
                  stepCompleted: 'qr_scan' 
                } as any);
              }}
            >
              <LinearGradient
                colors={gradients.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGradient}
              >
                <CheckCircle2 size={18} color="#FFF" />
                <Text style={styles.confirmText}>Confirm Asset & Proceed</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.muted + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  subview: {
    width: '100%',
  },
  subviewSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 20,
    fontWeight: '600',
  },
  assetCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  assetHeader: {
    marginBottom: 16,
  },
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  assetStatusWrap: {
    flexShrink: 0,
    marginTop: 2,
  },
  assetName: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
  },
  assetType: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  specItem: {
    width: '46%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  specLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 2,
  },
  slaCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  slaGradient: {
    padding: 16,
  },
  slaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  slaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slaTierText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 2,
  },
  slaPolicyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  slaPolicyItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  slaPolicyLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  slaPolicyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 1,
  },
  lifecycleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  lifecycleCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.card,
  },
  lifecycleLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  lifecycleValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  warrantyBar: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted + '20',
  },
  warrantyInfo: {
    flex: 1,
  },
  warrantyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
  },
  warrantyValue: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  warrantyBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  warrantyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
  },
  actionGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  actionLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  manualsList: {
    gap: 10,
  },
  manualCard: {
    padding: 12,
  },
  manualInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  manualMeta: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  scrollableFooter: {
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  
  // History Styles
  historyStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 24,
    ...SHADOWS.card,
  },
  historyStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  historyStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  historyStatLab: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  historyTimeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 12,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 22,
    bottom: -16,
    width: 2,
    backgroundColor: colors.border + '30',
  },
  timelineRight: {
    flex: 1,
  },
  historyCard: {
    padding: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyWoId: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  historyDate: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  technicianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: colors.panel,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  technicianName: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTypeTag: {
    backgroundColor: colors.panel,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyTypeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
});
