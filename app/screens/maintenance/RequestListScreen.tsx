import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import { Clock, ClipboardList, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/app/constants/theme';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { fetchMyIntakeRequests, type IntakeRequestItem } from '@/lib/intakeService';

export default function RequestListScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<IntakeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const rows = await fetchMyIntakeRequests();
      setRequests(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="My Requests" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        <View style={styles.infoBox}>
          <Info size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            Submitted work orders appear here until a manager approves them in the work order
            webapp. After approval, they move to your Tasks list.
          </Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Could not load requests</Text>
            <Text style={styles.emptyDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyDesc}>
              Create a work order from Tasks. It will show here until FM approves it.
            </Text>
          </View>
        ) : (
          requests.map((req, idx) => (
            <Animated.View key={req.id} entering={FadeInUp.delay(idx * 80)}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('WorkOrderDetails', { id: req.id, pendingApproval: true })
                }
              >
                <Card style={styles.requestCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{req.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.dateText}>{req.submittedAt}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{req.title}</Text>
                  <Text style={styles.cardId}>{req.id}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.categoryRow}>
                      <ClipboardList size={14} color={colors.mutedForeground} />
                      <Text style={styles.categoryText} numberOfLines={1}>
                        {req.category}
                      </Text>
                    </View>
                    <View style={styles.statusBox}>
                      <Clock size={12} color="#F59E0B" />
                      <Text style={styles.statusText}>{req.status}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20 },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : colors.primary + '10',
      padding: 16,
      borderRadius: 16,
      gap: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary + '20',
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? 'rgba(255,255,255,0.6)' : colors.foreground,
      lineHeight: 18,
      fontWeight: '500',
    },
    requestCard: {
      marginBottom: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 24,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: isDark ? 'rgba(146, 210, 48, 0.15)' : colors.success + '1A',
      borderRadius: 6,
    },
    typeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
    dateText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
    cardId: { fontSize: 11, color: colors.mutedForeground, marginBottom: 16, fontWeight: '600' },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    categoryText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600', flex: 1 },
    statusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#F59E0B1A',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
    emptyState: { alignItems: 'center', marginTop: 80, gap: 16, paddingHorizontal: 24 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? 'rgba(255,255,255,0.3)' : colors.mutedForeground,
    },
    emptyDesc: {
      fontSize: 14,
      color: isDark ? colors.border : colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    retryText: { color: '#FFF', fontWeight: '700' },
  });
