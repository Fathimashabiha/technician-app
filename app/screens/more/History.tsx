import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  Clock, 
  Calendar, 
  ChevronRight, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  ClipboardList, 
  Timer,
  CheckCircle2,
  Filter,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Circle
} from 'lucide-react-native';
import { useTheme } from '@/app/constants/theme';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { workOrders, timesheetEntries, TimesheetEntry, WorkOrder } from '@/data/mockData';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type TabType = 'history' | 'timesheet';

export default function HistoryScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, gradients, isDark, shadows } = useTheme();
  
  // Set initial tab from route params if available
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.tab || 'history');
  const [selectedTS, setSelectedTS] = useState<TimesheetEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState('All');

  const filterOptions = ['All', 'PPM', 'Breakdown', 'Corrective', 'Inspection'];

  // Sync tab with route params
  React.useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route.params?.tab]);

  // Filter completed/verified work orders for history tab
  const historyWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const isFinal = wo.status === 'Completed' || wo.status === 'Verified' || wo.status === 'Closed';
      const matchesType = filterType === 'All' || wo.type === filterType;
      return isFinal && matchesType;
    });
  }, [filterType]);

  const handleTSSubmit = () => {
    if (!selectedTS) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSelectedTS(null);
      // In a real app, we'd update the local state too
    }, 1500);
  };

  const styles = getStyles(colors, isDark, shadows);

  const renderHistoryTab = () => (
    <ScrollView 
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recently Completed</Text>
          {filterType !== 'All' && <Text style={styles.filterSubText}>Showing {filterType} only</Text>}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Filter size={16} color={filterType !== 'All' ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.filterText, filterType !== 'All' && { color: colors.primary }]}>
            {filterType === 'All' ? 'Filter' : filterType}
          </Text>
        </TouchableOpacity>
      </View>

      {historyWorkOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <ClipboardList size={32} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>No History Found</Text>
          <Text style={styles.emptyDesc}>
            {filterType === 'All' 
              ? 'Completed work orders will appear here.' 
              : `No completed ${filterType} work orders found.`}
          </Text>
          {filterType !== 'All' && (
            <Button 
              title="Clear Filter" 
              variant="outline" 
              onPress={() => setFilterType('All')}
              style={{ marginTop: 16 }}
            />
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {historyWorkOrders.map((wo, i) => (
            <Animated.View 
              key={wo.id} 
              entering={FadeInUp.delay(i * 50)}
              layout={Layout.springify()}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate('WorkOrderDetails', { id: wo.id })}
                activeOpacity={0.7}
              >
                <Card style={styles.woCard}>
                   <View style={styles.woHeader}>
                    <View style={styles.woInfo}>
                      <Text style={styles.woId}>{wo.id}</Text>
                      <Text style={styles.woTitle}>{wo.title}</Text>
                    </View>
                    <StatusBadge status={wo.status} />
                  </View>
                  
                  <View style={styles.woMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>{wo.dueDate}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Clock size={12} color={colors.mutedForeground} />
                      <Text style={styles.metaText}>{wo.estimatedTime}</Text>
                    </View>
                  </View>

                  <View style={styles.woFooter}>
                    <Text style={styles.woAsset} numberOfLines={1}>
                      {wo.assetName} • {wo.location}
                    </Text>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </View>
                </Card>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderTimesheetTab = () => (
    <ScrollView 
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={(isDark ? gradients.hero : ['#DBEAFE', '#DBEAFE']) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryLabel}>Weekly Overview</Text>
        <View style={styles.summaryMain}>
          <View>
            <Text style={styles.summaryHours}>24.0h</Text>
            <Text style={styles.summaryTarget}>of 40h target</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryShifts}>3 shifts</Text>
            <Text style={styles.summaryJobs}>6 jobs completed</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: '60%' }]} />
        </View>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Performance</Text>
      </View>

      <View style={styles.list}>
        {timesheetEntries.map((entry, i) => (
          <Animated.View
            key={entry.id}
            entering={FadeInUp.delay(i * 30)}
          >
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedTS(entry)}>
              <Card style={styles.tsCard}>
                <View style={styles.tsHeader}>
                  <View>
                    <Text style={styles.tsDate}>{entry.date}</Text>
                    <Text style={styles.tsTimeRange}>{entry.shiftStart} - {entry.shiftEnd}</Text>
                  </View>
                  <StatusBadge status={entry.status} />
                </View>

                <View style={styles.tsMeta}>
                  <Text style={styles.tsMetaItem}>Total: <Text style={styles.tsMetaValue}>{entry.totalHours}</Text></Text>
                  <Text style={styles.tsMetaItem}>Jobs: <Text style={styles.tsMetaValue}>{entry.jobs.length}</Text></Text>
                </View>

                <View style={styles.tsJobsList}>
                  {entry.jobs.map(job => (
                    <View key={job.woId} style={styles.tsJobItem}>
                      <View style={styles.tsJobInfo}>
                        <Clock size={10} color={colors.mutedForeground} />
                        <Text style={styles.tsJobTitle}>{job.title}</Text>
                      </View>
                      <View style={[styles.miniSlaBadge, { backgroundColor: job.slaStatus === 'Met' ? colors.success + '1A' : colors.destructive + '1A' }]}>
                        <Text style={[styles.miniSlaText, { color: job.slaStatus === 'Met' ? colors.success : colors.destructive }]}>
                          {job.slaStatus.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? "light-content" : "dark-content"} />
      <PageHeader 
        title="History" 
        showBack={false}
      />
      
      {/* Tab Switcher */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
            onPress={() => setActiveTab('history')}
          >
            <Calendar size={18} color={activeTab === 'history' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'timesheet' && styles.tabItemActive]}
            onPress={() => setActiveTab('timesheet')}
          >
            <Clock size={18} color={activeTab === 'timesheet' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, activeTab === 'timesheet' && styles.tabTextActive]}>Timesheet</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'history' ? renderHistoryTab() : renderTimesheetTab()}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowFilterModal(false)}
        >
          <Animated.View entering={FadeInDown} style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter History</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptionsGrid}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    filterType === option && styles.filterOptionActive
                  ]}
                  onPress={() => {
                    setFilterType(option);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filterType === option && styles.filterOptionTextActive
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Timesheet Details Modal */}
      <Modal
        visible={!!selectedTS}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTS(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Clock size={24} color={colors.primary} />
              </View>
              <TouchableOpacity onPress={() => setSelectedTS(null)} style={styles.closeModalBtn}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.modalDate}>{selectedTS?.date}</Text>
              <Text style={styles.modalSubtitle}>Daily Performance Breakdown</Text>

              {selectedTS && (
                <>
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.statVal}>{selectedTS.jobs.length}</Text>
                      <Text style={styles.statLab}>Jobs</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.statVal}>{selectedTS.totalHours}</Text>
                      <Text style={styles.statLab}>Hours</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.statVal}>
                        {Math.round((selectedTS.jobs.filter(j => j.slaStatus === 'Met').length / selectedTS.jobs.length) * 100)}%
                      </Text>
                      <Text style={styles.statLab}>SLA</Text>
                    </View>
                  </View>

                  <Text style={styles.breakdownHeader}>COMPLETED TASKS</Text>
                  {selectedTS.jobs.map((job) => {
                    const holdCount = job.timeline.filter(e => e.event === 'On Hold').length;
                    const holdReasons = job.timeline
                       .filter(e => e.event === 'On Hold' && e.note)
                       .map(e => e.note);

                    return (
                      <View key={job.woId} style={styles.modalJobCard}>
                        <View style={styles.modalJobHeader}>
                          <Text style={styles.modalJobId}>{job.woId}</Text>
                          <StatusBadge status={job.slaStatus === 'Met' ? 'Pass' : 'Failed'} />
                        </View>
                        <Text style={styles.modalJobTitle}>{job.title}</Text>

                        {/* Work Schedule Row */}
                        <View style={styles.workScheduleRow}>
                          <View style={styles.scheduleItem}>
                            <PlayCircle size={14} color={colors.primary} />
                            <View>
                              <Text style={styles.scheduleLabel}>Started</Text>
                              <Text style={styles.scheduleValue}>{job.startTime}</Text>
                            </View>
                          </View>
                          <View style={styles.scheduleItem}>
                            <CheckCircle size={14} color={colors.success} />
                            <View>
                              <Text style={styles.scheduleLabel}>Finished</Text>
                              <Text style={styles.scheduleValue}>{job.endTime}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Hold Summary */}
                        {holdCount > 0 && (
                          <View style={styles.holdSummaryContainer}>
                            <View style={styles.holdBadgeHead}>
                              <PauseCircle size={14} color="#F5A623" />
                              <Text style={styles.holdCountText}>{holdCount} {holdCount === 1 ? 'Hold' : 'Holds'} Recorded</Text>
                            </View>
                            {holdReasons.map((reason, ridx) => (
                              <View key={ridx} style={styles.reasonRow}>
                                <AlertCircle size={10} color={colors.mutedForeground} />
                                <Text style={styles.reasonText}>{reason}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* SLA Metrics */}
                        <View style={styles.slaMetricsRow}>
                          <View style={styles.slaMetricItem}>
                            <Text style={styles.slaMetricLabel}>Target SLA:</Text>
                            <Text style={styles.slaMetricValue}>{job.targetSla}</Text>
                          </View>
                          <View style={styles.slaMetricItem}>
                            <Text style={styles.slaMetricLabel}>Actual Duration:</Text>
                            <Text style={[styles.slaMetricValue, { color: job.slaStatus === 'Met' ? colors.success : colors.destructive }]}>{job.duration}</Text>
                          </View>
                        </View>

                        {/* Lifecycle Timeline */}
                        <View style={styles.timelineContainer}>
                          {job.timeline.map((ev, idx) => (
                            <View key={idx} style={styles.timelineItem}>
                              <View style={styles.timelineLeft}>
                                <View style={[styles.timelineDot, ev.event === 'Completed' && { backgroundColor: colors.success }, ev.event === 'On Hold' && { backgroundColor: '#F5A623' }]} />
                                {idx < job.timeline.length - 1 && <View style={styles.timelineLine} />}
                              </View>
                              <View style={styles.timelineRight}>
                                <Text style={styles.timelineEventText}>{ev.event}</Text>
                                <Text style={styles.timelineTimeText}>{ev.time}</Text>
                                {ev.note && <Text style={styles.timelineNoteText}>— {ev.note}</Text>}
                              </View>
                            </View>
                          ))}
                        </View>

                        <View style={styles.modalJobFooter}>
                          <Text style={styles.modalJobDuration}>Total Invested: {job.duration}</Text>
                          <Text style={styles.modalJobTime}>{job.startTime} - {job.endTime}</Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button 
                title={selectedTS?.status === 'Draft' ? (isSubmitting ? "Syncing..." : "Submit Timesheet") : "Close Details"} 
                variant={selectedTS?.status === 'Draft' ? "default" : "outline"}
                onPress={() => selectedTS?.status === 'Draft' ? handleTSSubmit() : setSelectedTS(null)}
                loading={isSubmitting}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBarWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? colors.card : colors.panel,
    borderRadius: 14,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: isDark ? colors.panel : '#FFF',
    ...shadows.card,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  filterSubText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    gap: 12,
  },
  woCard: {
    padding: 16,
    backgroundColor: colors.card,
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  woInfo: {
    flex: 1,
    gap: 4,
  },
  woId: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  woTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  woMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  woFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  woAsset: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '600',
    flex: 1,
  },
  
  // Timesheet Specific
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    ...shadows.card,
  },
  summaryLabel: {
    fontSize: 12,
    color: isDark ? 'rgba(255,255,255,0.7)' : colors.mutedForeground,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  summaryHours: {
    fontSize: 32,
    fontWeight: '800',
    color: isDark ? '#FFF' : colors.foreground,
  },
  summaryTarget: {
    fontSize: 12,
    color: isDark ? 'rgba(255,255,255,0.7)' : colors.mutedForeground,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryShifts: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#FFF' : colors.foreground,
  },
  summaryJobs: {
    fontSize: 12,
    color: isDark ? 'rgba(255,255,255,0.7)' : colors.mutedForeground,
  },
  progressContainer: {
    height: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  tsCard: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'rgba(0,0,0,0.05)',
    ...shadows.card,
  },
  tsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tsDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  tsTimeRange: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  tsMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  tsMetaItem: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  tsMetaValue: {
    color: colors.foreground,
    fontWeight: '700',
  },
  tsJobsList: {
    gap: 6,
  },
  tsJobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tsJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tsJobTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
  miniSlaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniSlaText: {
    fontSize: 8,
    fontWeight: '800',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtn: {
    padding: 8,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDate: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 20,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modalStatBox: {
    flex: 1,
    backgroundColor: colors.panel,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  statLab: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  // Breakdown section
  breakdownHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  modalJobCard: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  modalJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalJobId: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  modalJobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 16,
  },
  workScheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  scheduleValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  holdSummaryContainer: {
    backgroundColor: '#F5A623' + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F5A623',
  },
  holdBadgeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  holdCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F5A623',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  slaMetricsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  slaMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slaMetricLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  slaMetricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  timelineContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border + '40',
    marginVertical: -2,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineEventText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  timelineTimeText: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  timelineNoteText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalJobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  modalJobDuration: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
  },
  modalJobTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  modalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  modalOverlay_Filter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    ...shadows.elevated,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  filterOptionTextActive: {
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
