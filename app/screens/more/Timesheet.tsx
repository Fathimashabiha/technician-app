import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { 
  Clock, Send, ChevronRight, 
  X, AlertCircle, CheckCircle2, ShieldCheck, Zap, ClipboardList, Timer, Circle, PlayCircle, PauseCircle, CheckCircle 
} from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { COLORS, GRADIENTS, SHADOWS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  getTimesheetSummary,
  listTimesheets,
  submitTimesheet,
  syncTimesheetsFromWorkOrders,
  isTimesheetHoldEvent,
  isTimesheetResumeEvent,
  type TimesheetEntry,
  type TimesheetSummary,
} from '@/lib/timesheetService';

export default function TimesheetScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute();
  const navigation = useNavigation();
  const fromDashboard = (route.params as any)?.fromDashboard;
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [summary, setSummary] = useState<TimesheetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      try {
        await syncTimesheetsFromWorkOrders();
      } catch {
        // best-effort
      }
      const [summaryData, entriesData] = await Promise.all([
        getTimesheetSummary(),
        listTimesheets(),
      ]);
      setSummary(summaryData);
      setEntries(entriesData);
    } catch {
      // keep empty state if backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTimesheets();
    }, [loadTimesheets])
  );

  const handleSubmit = async () => {
    if (!selectedEntry) return;
    setIsSubmitting(true);
    try {
      const updated = await submitTimesheet(selectedEntry.id);
      setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      await loadTimesheets();
    } finally {
      setIsSubmitting(false);
      setSelectedEntry(null);
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
      <PageHeader 
        title="Timesheet" 
        showBack
        onBack={() => {
          if (fromDashboard) {
            (navigation as any).navigate('Dashboard');
          } else {
            navigation.goBack();
          }
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <LinearGradient
          colors={gradients.hero as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryLabel}>This Week</Text>
          <View style={styles.summaryMain}>
            <View>
              <Text style={styles.summaryHours}>{summary?.totalHoursLabel ?? '0.0h'}</Text>
              <Text style={styles.summaryTarget}>of {summary?.targetHoursLabel ?? '40h'} target</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryShifts}>{summary?.shiftCount ?? 0} shifts</Text>
              <Text style={styles.summaryJobs}>{summary?.jobsCompleted ?? 0} jobs completed</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(summary?.progressPercent ?? 0, 100)}%` }]} />
          </View>
        </LinearGradient>

        {/* Entries List */}
        <View style={styles.list}>
          {loading ? (
            <Text style={styles.entryTimeRange}>Loading timesheets...</Text>
          ) : entries.length === 0 ? (
            <Text style={styles.entryTimeRange}>
              No timesheet entries yet. Complete a task from Tasks to add today&apos;s draft automatically.
            </Text>
          ) : entries.map((entry, i) => (
            <Animated.View
              key={entry.id}
              entering={FadeInUp.delay(i * 30)}
            >
              <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedEntry(entry)}>
                <Card style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View>
                      <Text style={styles.entryDate}>{entry.date}</Text>
                      <Text style={styles.entryTimeRange}>{entry.shiftStart} - {entry.shiftEnd}</Text>
                    </View>
                    <StatusBadge status={entry.status} />
                  </View>

                  <View style={styles.entryMeta}>
                    <Text style={styles.metaItem}>Total: <Text style={styles.metaValue}>{entry.totalHours}</Text></Text>
                    <Text style={styles.metaItem}>Jobs: <Text style={styles.metaValue}>{entry.jobs.length}</Text></Text>
                  </View>

                  <View style={styles.jobsList}>
                  {entry.jobs.map(job => (
                      <View key={job.woId} style={styles.jobItem}>
                        <View style={styles.jobInfo}>
                          <Clock size={10} color={colors.mutedForeground} />
                          <Text style={styles.jobTitle}>{job.title}</Text>
                        </View>
                        <View style={[styles.miniSla, { backgroundColor: job.slaStatus === 'Met' ? colors.success + '1A' : colors.destructive + '1A' }]}>
                           <Text style={[styles.miniSlaText, { color: job.slaStatus === 'Met' ? colors.success : colors.destructive }]}>
                             {job.slaStatus === 'Met' ? 'MET' : 'BREACH'}
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

      {/* Submission Modal */}
      <Modal
        visible={!!selectedEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrapper}>
                <AlertCircle size={24} color={colors.primary} />
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>Daily Timesheet Details</Text>
              <Text style={styles.modalDesc}>
                {selectedEntry ? `Performance breakdown for ${selectedEntry.date}` : ''}
              </Text>

              {selectedEntry && (
                <>
                  <View style={styles.modalSummaryGrid}>
                    <View style={styles.summaryBox}>
                      <ClipboardList size={16} color={colors.primary} />
                      <Text style={styles.summaryValue}>{selectedEntry.jobs.length}</Text>
                      <Text style={styles.summaryLabelBox}>Jobs done</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Timer size={16} color={colors.secondary} />
                      <Text style={styles.summaryValue}>{selectedEntry.totalHours}</Text>
                      <Text style={styles.summaryLabelBox}>Work hours</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: selectedEntry.jobs.every(j => j.slaStatus === 'Met') ? colors.success + '10' : '#FFFBEB' }]}>
                      <ShieldCheck size={16} color={selectedEntry.jobs.every(j => j.slaStatus === 'Met') ? colors.success : '#D97706'} />
                      <Text style={[styles.summaryValue, { color: selectedEntry.jobs.every(j => j.slaStatus === 'Met') ? colors.success : '#D97706' }]}>
                        {Math.round((selectedEntry.jobs.filter(j => j.slaStatus === 'Met').length / selectedEntry.jobs.length) * 100)}%
                      </Text>
                      <Text style={styles.summaryLabelBox}>SLA Score</Text>
                    </View>
                  </View>

                  <Text style={styles.breakdownTitle}>JOB PERFORMANCE & LIFECYCLE</Text>
                  <ScrollView style={styles.jobScroll} showsVerticalScrollIndicator={false}>
                    {selectedEntry.jobs.map((job) => {
                      const holdCount = job.timeline.filter((e) => isTimesheetHoldEvent(e.event)).length;
                      const holdReasons = job.timeline
                        .filter((e) => isTimesheetHoldEvent(e.event) && e.note)
                        .map(e => e.note);

                      return (
                        <View key={job.woId} style={styles.jobDetailItem}>
                          <View style={styles.jobDetailHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.jobIdText}>{job.woId}</Text>
                              <Text style={styles.jobTitleText}>{job.title}</Text>
                            </View>
                            <View style={[styles.slaBadgeDetail, { backgroundColor: job.slaStatus === 'Met' ? colors.success + '1A' : colors.destructive + '1A' }]}>
                              <Text style={[styles.slaBadgeDetailText, { color: job.slaStatus === 'Met' ? colors.success : colors.destructive }]}>
                                SLA {job.slaStatus.toUpperCase()}
                              </Text>
                            </View>
                          </View>

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

                          {/* SLA Comparison Bar */}
                          <View style={styles.slaComparisonContainer}>
                            <View style={styles.slaComparisonHeader}>
                                <Text style={styles.slaComparisonLabel}>Target SLA: <Text style={{ color: colors.foreground }}>{job.targetSla}</Text></Text>
                                <Text style={styles.slaComparisonLabel}>Actual: <Text style={{ color: job.slaStatus === 'Met' ? colors.success : colors.destructive }}>{job.duration}</Text></Text>
                            </View>
                            <View style={styles.slaProgressBarBG}>
                                <View 
                                  style={[
                                    styles.slaProgressBarFill, 
                                    { 
                                      width: job.slaStatus === 'Met' ? '70%' : '100%', 
                                      backgroundColor: job.slaStatus === 'Met' ? colors.success : colors.destructive 
                                    }
                                  ]} 
                                />
                            </View>
                          </View>

                          {/* lifecycle Timeline */}
                          <View style={styles.timelineContainer}>
                            {job.timeline.map((ev, idx) => (
                              <View key={idx} style={styles.timelineItem}>
                                <View style={styles.timelineLeft}>
                                  <View style={[styles.timelineDot, ev.event === 'Completed' && { backgroundColor: colors.success }, isTimesheetHoldEvent(ev.event) && { backgroundColor: '#F5A623' }, isTimesheetResumeEvent(ev.event) && { backgroundColor: colors.primary }]} />
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
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              {selectedEntry?.status === 'Draft' ? (
                <>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setSelectedEntry(null)}
                    style={styles.modalBtn}
                  />
                  <Button
                    title={isSubmitting ? "Submitting..." : "Confirm & Submit"}
                    variant="default"
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    style={[styles.modalBtn, { flex: 2 }]}
                  />
                </>
              ) : (
                <Button
                  title="Close Details"
                  variant="default"
                  onPress={() => setSelectedEntry(null)}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
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
    color: '#FFF',
  },
  summaryTarget: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryShifts: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  summaryJobs: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  progressContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  list: {
    gap: 12,
  },
  entryCard: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  entryTimeRange: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  metaValue: {
    color: colors.foreground,
    fontWeight: '700',
  },
  jobsList: {
    gap: 6,
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
  miniSla: {
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
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalSummaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.muted + '40',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 2,
  },
  summaryLabelBox: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: 12,
  },
  jobScroll: {
    maxHeight: 280,
  },
  jobDetailItem: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border + '40',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  jobDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  jobTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 2,
  },
  slaBadgeDetail: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slaBadgeDetailText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Work Schedule & Hold Styles
  workScheduleRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
    backgroundColor: colors.muted + '15',
    padding: 12,
    borderRadius: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  scheduleValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
  },
  holdSummaryContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.2)',
  },
  holdBadgeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  holdCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 2,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // SLA Comparison Bar Styles
  slaComparisonContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.muted + '20',
    borderRadius: 12,
  },
  slaComparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slaComparisonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  slaProgressBarBG: {
    height: 6,
    backgroundColor: colors.border + '40',
    borderRadius: 3,
    overflow: 'hidden',
  },
  slaProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Timeline Styles
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 40,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border + '40',
    marginVertical: 2,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineEventText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  timelineTimeText: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  timelineNoteText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
    fontStyle: 'italic',
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
  },
});
