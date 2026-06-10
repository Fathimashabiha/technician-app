import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from '@/app/types/navigation';
import type { WorkOrder } from '@/lib/types/workOrder';
import { Search, SlidersHorizontal, ChevronRight, Plus, Activity } from 'lucide-react-native';
import { useWorkOrders } from '@/lib/hooks/useWorkOrders';
import { workOrderTypeLabel } from '@/lib/workOrderService';
import { fetchMyIntakeRequests } from '@/lib/intakeService';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

type NavigationProp = CompositeNavigationProp<BottomTabNavigationProp<TabParamList>, NativeStackNavigationProp<RootStackParamList>>;

export default function WorkOrdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, gradients, isDark, shadows } = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const { workOrders, loading, error, reload } = useWorkOrders();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchMyIntakeRequests()
        .then((rows) => setPendingRequestCount(rows.length))
        .catch(() => setPendingRequestCount(0));
    }, [])
  );

  const statuses = ['All', 'Assigned', 'In Progress'];
  const types = ['All', 'Breakdown', 'Reactive'];

  const filtered = useMemo(() => workOrders.filter((wo: WorkOrder) => {
    const matchSearch =
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      wo.id.toLowerCase().includes(search.toLowerCase());

    // PPM and Inspection live on their own screens (dashboard / More), not Tasks
    if (wo.type === 'PPM' || wo.type === 'Inspection') return false;

    // Final statuses go to History; pending approval goes to My Requests
    const isFinalStatus = ['Completed', 'Verified', 'Closed'].includes(wo.status);
    const isPendingApproval = wo.status === 'Pending Approval';
    const matchStatus = statusFilter === 'All'
      ? !isFinalStatus && !isPendingApproval
      : wo.status === statusFilter && !isFinalStatus && !isPendingApproval;

    const matchType =
      typeFilter === 'All' ||
      wo.type === typeFilter ||
      (typeFilter === 'Reactive' && wo.type === 'Corrective');
    return matchSearch && matchStatus && matchType;
  }), [workOrders, search, statusFilter, typeFilter]);

  const styles = getStyles(colors, isDark, shadows);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? "light-content" : "dark-content"} />
      <PageHeader 
        title="Tasks" 
        rightElement={
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={() => navigation.navigate('Maintenance', { screen: 'RequestList' } as any)}
          >
            <Activity size={20} color={isDark ? "#FFF" : colors.primary} />
            {pendingRequestCount > 0 ? <View style={styles.requestBadge} /> : null}
          </TouchableOpacity>
        }
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.mutedForeground} />
            <TextInput
              placeholder="Search work orders..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <SlidersHorizontal size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Type Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filterScroll, { marginBottom: 10 }]}
          contentContainerStyle={styles.filterContent}
        >
          {types.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTypeFilter(t)}
              style={[styles.statusTab, typeFilter === t && styles.activeStatusTab]}
            >
              <Text style={[styles.statusText, typeFilter === t && styles.activeStatusText]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {statuses.map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.statusTab, statusFilter === s && styles.activeStatusTab]}
            >
              <Text style={[styles.statusText, statusFilter === s && styles.activeStatusText]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        <View style={styles.list}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <TouchableOpacity onPress={() => void reload()} style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.destructive, textAlign: 'center' }}>{error}</Text>
              <Text style={{ color: colors.primary, marginTop: 8 }}>Tap to retry</Text>
            </TouchableOpacity>
          ) : null}
          {!loading && !error && filtered.map((wo: WorkOrder, i: number) => (
            <View key={wo.id}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Maintenance', { screen: 'WorkOrderDetails', params: { id: wo.id } })}
                style={styles.woCard}
                activeOpacity={0.7}
              >
                <View style={styles.woHeader}>
                  <View style={styles.woBadges}>
                    <StatusBadge status={workOrderTypeLabel(wo.type)} />
                    <StatusBadge status={wo.priority} />
                  </View>
                  <Text style={styles.dueDate}>{wo.dueDate}</Text>
                </View>

                <Text style={styles.woTitle}>{wo.title}</Text>
                <Text style={styles.woDesc} numberOfLines={1}>{wo.description}</Text>

                <View style={styles.woFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.woDetails} numberOfLines={1}>
                      {wo.assetName} • {wo.location}
                    </Text>
                  </View>
                  <View style={styles.woFooterRight}>
                    <StatusBadge status={wo.status} />
                    <ChevronRight size={14} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
      </View>
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => navigation.navigate('Maintenance', { screen: 'CreateWorkOrder' } as any)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 160, // Increased to account for higher FAB position
  },
  headerAction: {
    padding: 4,
    position: 'relative',
  },
  requestBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: isDark ? colors.navy : '#FFF',
  },
  searchContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    ...shadows.card,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, paddingHorizontal: 8 },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  filterScroll: { marginBottom: 20 },
  filterContent: { gap: 8 },
  statusTab: { backgroundColor: colors.panel, borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: colors.muted + '40' },
  activeStatusTab: { backgroundColor: colors.primary + '15', borderColor: colors.primary + '60' },
  statusGradient: { paddingHorizontal: 16, paddingVertical: 8 },
  statusText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  activeStatusText: { color: colors.primary },
  list: { gap: 12 },
  woCard: { backgroundColor: colors.card, borderRadius: 24, padding: 16, ...shadows.card },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  woBadges: { flexDirection: 'row', gap: 6 },
  dueDate: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },
  woTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  woDesc: { fontSize: 12, color: colors.mutedForeground, marginBottom: 12 },
  woFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.muted + '60',
    paddingTop: 12,
  },
  woDetails: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500', marginRight: 12 },
  woFooterRight: { flexDirection: 'row', alignItems: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    ...shadows.card,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
