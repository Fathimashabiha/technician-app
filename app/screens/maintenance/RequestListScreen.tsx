import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Clock, ChevronRight, ClipboardList, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, GRADIENTS, useTheme } from '@/app/constants/theme';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Mock data for requests
const pendingRequests = [
  {
    id: 'REQ-901',
    title: 'AC Unit Noise Leakage',
    category: 'HVAC',
    submittedAt: 'Today, 10:20 AM',
    status: 'Pending Approval',
    type: 'Reactive',
  },
  {
    id: 'REQ-884',
    title: 'Corridor Light Flickering',
    category: 'Electrical',
    submittedAt: 'Yesterday',
    status: 'Under Review',
    type: 'Corrective',
  },
];

export default function RequestListScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <PageHeader 
        title="My Requests" 
        showBack={true} 
        onBack={() => navigation.goBack()}
      />

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Info size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            These work order requests are currently awaiting manager approval before they become active tasks.
          </Text>
        </View>

        {pendingRequests.map((req, idx) => (
          <Animated.View key={req.id} entering={FadeInUp.delay(idx * 100)}>
            <Card style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{req.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.dateText}>{req.submittedAt}</Text>
              </View>

              <Text style={styles.cardTitle}>{req.title}</Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.categoryRow}>
                   <ClipboardList size={14} color={colors.mutedForeground} />
                   <Text style={styles.categoryText}>{req.category}</Text>
                </View>
                <View style={styles.statusBox}>
                   <Clock size={12} color="#F59E0B" />
                   <Text style={styles.statusText}>{req.status}</Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        ))}

        {pendingRequests.length === 0 && (
          <View style={styles.emptyState}>
             <ClipboardList size={48} color="rgba(255,255,255,0.1)" />
             <Text style={styles.emptyTitle}>No Pending Requests</Text>
             <Text style={styles.emptyDesc}>All your submitted requests have been processed.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: isDark ? isDark ? "rgba(59, 130, 246, 0.1)" : colors.primary + "1A" : colors.primary + '10',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary + '20',
  },
  infoText: { flex: 1, fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : colors.foreground, lineHeight: 18, fontWeight: '500' },
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
    backgroundColor: isDark ? "rgba(146, 210, 48, 0.15)" : colors.success + "1A",
    borderRadius: 6,
  },
  typeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  dateText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
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
  
  emptyState: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: isDark ? 'rgba(255,255,255,0.3)' : colors.mutedForeground },
  emptyDesc: { fontSize: 14, color: isDark ? colors.border : colors.mutedForeground, textAlign: 'center', paddingHorizontal: 40 },
});
