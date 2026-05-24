import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from '@/app/types/navigation';
import type { WorkOrder } from '@/data/mockData';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, CalendarClock } from 'lucide-react-native';
import { workOrders } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp } from 'react-native-reanimated';

type NavigationProp = CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>;

const ppmOrders = workOrders.filter((w: WorkOrder) => w.type === 'PPM');

// Helper to format date uniformly as YYYY-MM-DD
const formatDateStr = (year: number, month: number, day: number) => {
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export default function PPMScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Use March 2024 as default to match the mock data, or default to now if you prefer.
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1)); 
  const [selectedDate, setSelectedDate] = useState(formatDateStr(now.getFullYear(), now.getMonth(), now.getDate()));
  const [pendingReschedules, setPendingReschedules] = useState<Set<string>>(new Set());
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [targetWoId, setTargetWoId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'selected' | 'today' | 'weekly' | 'monthly'>('selected');

  // Month Math
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Prev / Next Month
  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Determine if a day has a PPM order
  const hasOrders = (dateStr: string) => ppmOrders.some(wo => wo.dueDate === dateStr);

  const handleRescheduleClick = (woId: string) => {
    setTargetWoId(woId);
    setRescheduleModalVisible(true);
  };

  const confirmReschedule = () => {
    if (targetWoId) {
      setPendingReschedules(prev => {
        const newSet = new Set(prev);
        newSet.add(targetWoId);
        return newSet;
      });
    }
    setRescheduleModalVisible(false);
    setTargetWoId(null);
  };

  const todayRef = formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Calculate Summary metrics
  const todayCount = ppmOrders.filter(wo => wo.dueDate === todayRef).length;
  
  // Real Weekly count (7 days from now)
  const weeklyCount = ppmOrders.filter(wo => {
    const woDate = new Date(wo.dueDate);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return woDate >= startOfWeek && woDate <= endOfWeek;
  }).length;

  // Real Monthly count (Current Month)
  const monthlyCount = ppmOrders.filter(wo => {
    const woDate = new Date(wo.dueDate);
    return woDate.getMonth() === now.getMonth() && woDate.getFullYear() === now.getFullYear();
  }).length;

  // Filter the list based on filterMode
  const getFilteredOrders = () => {
    if (filterMode === 'selected') return ppmOrders.filter(wo => wo.dueDate === selectedDate);
    if (filterMode === 'today') return ppmOrders.filter(wo => wo.dueDate === todayRef);
    if (filterMode === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return ppmOrders.filter(wo => {
        const woDate = new Date(wo.dueDate);
        return woDate >= startOfWeek && woDate <= endOfWeek;
      });
    }
    if (filterMode === 'monthly') return ppmOrders.filter(wo => {
      const woDate = new Date(wo.dueDate);
      return woDate.getMonth() === now.getMonth() && woDate.getFullYear() === now.getFullYear();
    });
    return [];
  };

  const filteredOrders = getFilteredOrders();

  const getSectionTitle = () => {
    if (filterMode === 'today') return 'TASKS FOR TODAY';
    if (filterMode === 'weekly') return 'TASKS FOR THIS WEEK';
    if (filterMode === 'monthly') return 'TASKS FOR THIS MONTH';
    return `TASKS FOR ${selectedDate === formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) ? 'TODAY' : selectedDate}`;
  };

  // Generate Calendar Grid
  const renderCalendar = () => {
    const days = [];
    // Empty prefix days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calDayBox} />);
    }
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      const isSelected = selectedDate === dateStr;
      const hasDot = hasOrders(dateStr);

      days.push(
        <TouchableOpacity 
          key={day} 
          style={[styles.calDayBox, isSelected && filterMode === 'selected' && styles.calDayBoxActive]}
          onPress={() => {
            setSelectedDate(dateStr);
            setFilterMode('selected');
          }}
        >
          <Text style={[styles.calDayText, isSelected && filterMode === 'selected' && styles.calDayTextActive]}>{day}</Text>
          {hasDot && <View style={[styles.calDot, isSelected && filterMode === 'selected' && styles.calDotActive]} />}
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.calContainer}>
        {/* Header */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
            <ChevronLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.calMonthText}>{monthNames[month]} {year}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
            <ChevronRight size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        
        {/* Week Days */}
        <View style={styles.calWeekRow}>
          {dayNames.map(d => (
            <Text key={d} style={styles.calWeekText}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.calGrid}>
          {days}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="PPM Schedule" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryBar}>
          <TouchableOpacity 
            onPress={() => setFilterMode('today')}
            style={[
              styles.summaryItem, 
              { backgroundColor: colors.primary + '15' },
              filterMode === 'today' && { borderColor: colors.primary, borderWidth: 1 }
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>TODAY</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{todayCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilterMode('weekly')}
            style={[
              styles.summaryItem, 
              { backgroundColor: colors.secondary + '15' },
              filterMode === 'weekly' && { borderColor: colors.secondary, borderWidth: 1 }
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.secondary }]}>WEEKLY</Text>
            <Text style={[styles.summaryValue, { color: colors.secondary }]}>{weeklyCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilterMode('monthly')}
            style={[
              styles.summaryItem, 
              { backgroundColor: '#F59E0B15' },
              filterMode === 'monthly' && { borderColor: '#F59E0B', borderWidth: 1 }
            ]}
          >
            <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>MONTHLY</Text>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{monthlyCount}</Text>
          </TouchableOpacity>
        </View>

        {renderCalendar()}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {getSectionTitle()}
          </Text>
        </View>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarClock size={48} color={colors.border} />
            <Text style={styles.emptyStateText}>No PPM tasks scheduled.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredOrders.map((wo: WorkOrder, i: number) => {
              const isPendingReschedule = pendingReschedules.has(wo.id);

              return (
                <Animated.View key={wo.id} entering={FadeInUp.delay(i * 30)}>
                  <Card style={styles.ppmCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobTitle}>{wo.title}</Text>
                        <Text style={styles.jobSub}>{wo.assetName} • {wo.location}</Text>
                      </View>
                      <StatusBadge status={wo.status} />
                    </View>
                    
                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={12} color={colors.mutedForeground} />
                        <Text style={styles.metaText}>{wo.dueDate}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={12} color={colors.mutedForeground} />
                        <Text style={styles.metaText}>{wo.estimatedTime}</Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity 
                        style={styles.executeBtn}
                        onPress={() => navigation.navigate('Maintenance', { screen: 'WorkOrderDetails', params: { id: wo.id } })}
                      >
                        <Text style={styles.executeBtnText}>Execute</Text>
                      </TouchableOpacity>
                      
                      {isPendingReschedule ? (
                        <View style={styles.pendingBtn}>
                          <AlertCircle size={14} color={colors.warning} />
                          <Text style={styles.pendingBtnText} numberOfLines={2}>Pending Manager Review</Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.rescheduleBtn}
                          onPress={() => handleRescheduleClick(wo.id)}
                        >
                          <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <CalendarClock size={24} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Reschedule Request</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to request a reschedule from your manager for this Work Order?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setRescheduleModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={confirmReschedule}
              >
                <Text style={styles.modalConfirmText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  summaryBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  calContainer: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    ...SHADOWS.card,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calNavBtn: { padding: 8, backgroundColor: colors.panel, borderRadius: 12 },
  calMonthText: { fontSize: 16, fontWeight: '800', color: colors.foreground },
  calWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  calWeekText: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.mutedForeground },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayBox: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDayBoxActive: { backgroundColor: colors.primary, borderRadius: 16 },
  calDayText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  calDayTextActive: { color: '#FFF' },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 },
  calDotActive: { backgroundColor: '#FFF' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.mutedForeground, letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginTop: 40 },
  emptyStateText: { marginTop: 12, fontSize: 14, color: colors.mutedForeground, fontWeight: '500' },
  list: { gap: 12 },
  ppmCard: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border + '40', backgroundColor: colors.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 2 },
  jobSub: { fontSize: 11, color: colors.mutedForeground },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground },
  cardActions: { flexDirection: 'row', gap: 10 },
  executeBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  executeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  rescheduleBtn: { flex: 1, backgroundColor: colors.warning + '20', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.warning + '40' },
  rescheduleBtnText: { fontSize: 13, fontWeight: '700', color: colors.warning },
  pendingBtn: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: colors.destructive + '10', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.destructive + '30' },
  pendingBtnText: { flexShrink: 1, fontSize: 10, fontWeight: '700', color: colors.destructive, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: colors.border + '40', ...SHADOWS.elevated },
  modalIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
  modalBody: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.panel, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
