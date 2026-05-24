import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import { ArrowLeft, CheckCircle2, AlertTriangle, RotateCcw, UserPlus, Calendar } from 'lucide-react-native';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import { Button } from '@/components/ui/Button';

export default function WorkOrderResultScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const route = useRoute<RouteProp<MaintenanceStackParamList, 'WorkOrderResult'>>();
  const { id, status } = route.params;

  if (status === 'fail') {
    // FAIL STATE
    return (
      <View style={[styles.containerGrey, { backgroundColor: colors.background }]}>
        <StatusBar backgroundColor={colors.card} barStyle="light-content" />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.muted + '40', paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.woId}>{id}</Text>
            <Text style={styles.woSubtitle}>Corrective Action Required</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Banner */}
          <View style={styles.failBanner}>
            <View style={styles.failIconBox}>
              <AlertTriangle size={24} color={colors.destructive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.failBannerTitle}>Checklist Failed</Text>
              <Text style={styles.failBannerSub}>Mission requirement not met</Text>
              <Text style={styles.failBannerDesc}>Managerial intervention required</Text>
            </View>
          </View>

          {/* Card 1: What Happens Next */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>WHAT HAPPENS NEXT</Text>

            <View style={styles.stepRow}>
              <View style={styles.stepBubble}><Text style={styles.stepText}>1</Text></View>
              <Text style={styles.stepLabel}>Manager will review the incident</Text>
              <Text style={styles.statusBadgePending}>Pending</Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepBubbleWaiting}><Text style={styles.stepTextWaiting}>2</Text></View>
              <Text style={styles.stepLabelWaiting}>Corrective action will be determined</Text>
              <Text style={styles.statusBadgeWaiting}>Waiting</Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepBubbleWaiting}><Text style={styles.stepTextWaiting}>3</Text></View>
              <Text style={styles.stepLabelWaiting}>Work order will be reassigned or rescheduled</Text>
              <Text style={styles.statusBadgeWaiting}>Waiting</Text>
            </View>
          </View>

          {/* Card 2: Manager Decision */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>MANAGER DECISION</Text>

            <TouchableOpacity style={styles.decisionBtnActive}>
              <RotateCcw size={16} color={colors.warning} />
              <Text style={styles.decisionTextActive}>Reassign to Same Technician</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.decisionBtn}>
              <UserPlus size={16} color={colors.mutedForeground} />
              <Text style={styles.decisionText}>Assign New Technician</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.decisionBtn}>
              <Calendar size={16} color={colors.mutedForeground} />
              <Text style={styles.decisionText}>Reschedule Date</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Failed Items */}
          <View style={styles.cardGrey}>
            <Text style={styles.cardTitle}>ASSET STATUS</Text>
            <View style={styles.failedItem}>
              <AlertTriangle size={14} color={colors.destructive} />
              <Text style={styles.failedItemText}>Asset remains in "Failed/Broken" state</Text>
            </View>
            <View style={styles.failedItem}>
              <AlertTriangle size={14} color={colors.destructive} />
              <Text style={styles.failedItemText}>Requires follow-up corrective activity</Text>
            </View>
          </View>

          {/* Scrollable CTA */}
          <View style={styles.scrollableBottomBar}>
            <Button
              title="Back to Dashboard"
              onPress={() => navigation.navigate('DashboardHome' as any)}
              style={{ height: 50, borderRadius: 12 }}
            />
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    );
  }

  // PASS STATE
  return (
    <View style={[styles.containerWhite, { backgroundColor: colors.background }]}>
      <View style={styles.passContent}>
        <View style={[styles.successCircleBg, { backgroundColor: colors.success + '20', borderColor: colors.success + '40', borderWidth: 1 }]}>
          <CheckCircle2 size={48} color={colors.success} />
        </View>
        <Text style={[styles.titlePass, { color: colors.foreground }]}>Work Order Completed!</Text>
        <Text style={styles.subtitlePass}>{id} — {(route.params as any).title || 'Mission Successful'}</Text>
        <Text style={styles.metaTextPass}>Submitted for verification • Time: 01:24:10</Text>

        <View style={{ height: 40 }} />

        <Button
          title="Back to Dashboard"
          onPress={() => navigation.navigate('DashboardHome' as any)}
          style={{ width: '100%', marginBottom: 12, borderRadius: 12, height: 50 }}
        />
        <TouchableOpacity
          style={[styles.secondaryBtnPass, { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.muted + '40' }]}
          onPress={() => navigation.navigate('MaintenanceHome' as any)}
        >
          <Text style={styles.secondaryBtnTextPass}>View All Work Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  // Pass State
  containerWhite: { flex: 1, backgroundColor: '#FFF' },
  passContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successCircleBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  titlePass: { fontSize: 24, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
  subtitlePass: { fontSize: 14, color: colors.mutedForeground, marginBottom: 8 },
  metaTextPass: { fontSize: 13, color: '#6B7280' },
  secondaryBtnPass: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnTextPass: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },

  // Fail State
  containerGrey: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerText: { flex: 1, alignItems: 'center', paddingRight: 40 },
  woId: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  woSubtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32, // Increased for a more spacious feel
    paddingBottom: 40,
  },
  failBanner: {
    flexDirection: 'row',
    backgroundColor: colors.destructive + '15',
    borderWidth: 1,
    borderColor: colors.destructive + '4D',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 24,
  },
  failIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.destructive + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failBannerTitle: { fontSize: 16, fontWeight: '700', color: colors.destructive, marginBottom: 4 },
  failBannerSub: { fontSize: 14, color: colors.destructive, marginBottom: 4 },
  failBannerDesc: { fontSize: 13, color: colors.mutedForeground },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: colors.muted + '20',
  },
  cardGrey: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warning + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  stepText: { fontSize: 12, fontWeight: '800', color: colors.warning },
  stepLabel: { flex: 1, fontSize: 14, color: colors.foreground, fontWeight: '600' },
  statusBadgePending: { fontSize: 11, fontWeight: '800', color: colors.warning, padding: 4 },

  stepBubbleWaiting: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  stepTextWaiting: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  stepLabelWaiting: { flex: 1, fontSize: 14, color: colors.mutedForeground },
  statusBadgeWaiting: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, padding: 4, opacity: 0.6 },

  decisionBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warning + '1A',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  decisionTextActive: { fontSize: 14, fontWeight: '700', color: colors.warning },

  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.muted + '40',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  decisionText: { fontSize: 14, fontWeight: '600', color: colors.foreground },

  failedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  failedItemText: { fontSize: 14, color: colors.foreground, fontWeight: '500' },

  scrollableBottomBar: {
    marginTop: 24,
    backgroundColor: 'transparent',
  },
});
