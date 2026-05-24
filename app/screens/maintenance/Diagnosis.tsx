import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Zap,
  Droplets,
  Settings,
  ChevronRight,
  Mic,
  Plus,
  Pause,
  ThumbsUp,
  ThumbsDown,
  ChevronDown
} from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

const COMMON_CONDITIONS = [
  { id: 'worn', label: 'Worn Component', Icon: Settings },
  { id: 'electrical', label: 'Electrical Fault', Icon: Zap },
  { id: 'leak', label: 'Leakage', Icon: Droplets },
  { id: 'blockage', label: 'Blockage', Icon: AlertCircle },
  { id: 'calibration', label: 'Out of Calibration', Icon: Activity },
];

export default function DiagnosisScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [faultDesc, setFaultDesc] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [rectified, setRectified] = useState<boolean>(true);

  const toggleCondition = (label: string) => {
    setSelectedConditions(prev => 
      prev.includes(label) 
        ? prev.filter(c => c !== label) 
        : [...prev, label]
    );
  };

  const isRectification = route.params?.failedItems && route.params.failedItems.length > 0;
  const isFormValid = isRectification || (faultDesc.trim().length > 0 && rootCause.trim().length > 0);

  const handleConfirm = () => {
    navigation.navigate('WorkOrderDetails', { 
      id, 
      stepCompleted: 'diagnostics',
      rectified,
      diagnosisData: {
        faultDesc,
        rootCause,
        conditions: selectedConditions,
        rectified
      }
    });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <PageHeader 
        title="Diagnostic Notes" 
        showBack 
        rightElement={
          <TouchableOpacity 
            onPress={() => navigation.navigate('WorkOrderDetails', { id, holdWork: true } as any)}
            style={styles.holdButton}
          >
            <Pause size={20} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Failed Checklist Items (Rectification) */}
        {route.params?.failedItems && route.params.failedItems.length > 0 && (
          <Animated.View entering={FadeInUp} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.destructive }]}>RECTIFICATION REQUIRED</Text>
            <View style={styles.rectificationCard}>
              {route.params.failedItems.map((item: any, idx: number) => (
                <View key={idx} style={[styles.failedItemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: '#FED7D7' }]}>
                  <View style={styles.failedItemHeader}>
                    {item.status === 'fail' ? (
                      <AlertCircle size={16} color={colors.destructive} />
                    ) : (
                      <Zap size={16} color="#F5A623" />
                    )}
                    <Text style={styles.failedItemLabel}>{item.label}</Text>
                    <View style={[styles.statusBadge, item.status === 'fail' ? styles.badgeFail : styles.badgeFlag]}>
                      <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  {item.note && (
                    <Text style={styles.failedItemNote}>“{item.note}”</Text>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Conditions Quick-Select */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>OBSERVED CONDITIONS</Text>
          <View style={styles.conditionsGrid}>
            {COMMON_CONDITIONS.map((c) => {
              const isSelected = selectedConditions.includes(c.label);
              return (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.conditionChip, isSelected && styles.conditionChipActive]}
                  onPress={() => toggleCondition(c.label)}
                >
                  <c.Icon size={14} color={isSelected ? '#FFF' : colors.mutedForeground} />
                  <Text style={[styles.conditionText, isSelected && styles.conditionTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Fault Identification */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>FAULT IDENTIFICATION</Text>
            <TouchableOpacity><Mic size={16} color={colors.primary} /></TouchableOpacity>
          </View>
          <Card style={styles.inputCard}>
            <TextInput
              placeholder="Describe the fault you found..."
              placeholderTextColor={colors.mutedForeground}
              value={faultDesc}
              onChangeText={setFaultDesc}
              style={styles.textArea}
              multiline
              numberOfLines={4}
            />
          </Card>
        </Animated.View>

        {/* Root Cause Analysis */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionTitle}>ROOT CAUSE ANALYSIS</Text>
            <TouchableOpacity><Mic size={16} color={colors.primary} /></TouchableOpacity>
          </View>
          <Card style={styles.inputCard}>
            <TextInput
              placeholder="What was the reason for this failure?"
              placeholderTextColor={colors.mutedForeground}
              value={rootCause}
              onChangeText={setRootCause}
              style={styles.textArea}
              multiline
              numberOfLines={4}
            />
          </Card>
        </Animated.View>

        {/* Rectification Check */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>HAS THE FAULT BEEN RECTIFIED?</Text>
          <View style={styles.rectifyToggle}>
            <TouchableOpacity 
              style={[styles.rectifyBtn, rectified && styles.rectifyBtnYes]} 
              onPress={() => setRectified(true)}
            >
              <ThumbsUp size={18} color={rectified ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.rectifyText, rectified && styles.rectifyTextActive]}>Yes, Fixed</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.rectifyBtn, !rectified && styles.rectifyBtnNo]} 
              onPress={() => setRectified(false)}
            >
              <ThumbsDown size={18} color={!rectified ? colors.destructiveForeground : colors.mutedForeground} />
              <Text style={[styles.rectifyText, !rectified && styles.rectifyTextActive]}>No, Still Broken</Text>
            </TouchableOpacity>
          </View>
          {!rectified && (
             <View style={styles.failureHint}>
                <AlertCircle size={14} color={colors.destructive} />
                <Text style={styles.failureHintText}>This will submit the work order as FAILED for manager review.</Text>
             </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <Button 
            title={rectified ? "Update Diagnosis & Continue" : "Submit Failure for Manager"}
            variant={rectified ? "default" : "destructive"} 
            onPress={handleConfirm}
            disabled={!isFormValid}
            style={styles.confirmBtn}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.mutedForeground, letterSpacing: 1.2, marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  conditionChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 99, 
    backgroundColor: colors.muted,
  },
  conditionChipActive: { backgroundColor: colors.primary },
  conditionText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  conditionTextActive: { color: '#FFF' },

  inputCard: { padding: 0, overflow: 'hidden' },
  textArea: { 
    padding: 16, 
    fontSize: 15, 
    color: colors.foreground, 
    minHeight: 100, 
    textAlignVertical: 'top' 
  },
  
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border + '26',
  },
  confirmBtn: { height: 52, borderRadius: 14 },
  
  rectifyToggle: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rectifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
  rectifyBtnYes: { backgroundColor: colors.primary },
  rectifyBtnNo: { backgroundColor: colors.destructive },
  rectifyText: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  rectifyTextActive: { color: '#FFF' },
  
  failureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  failureHintText: {
    fontSize: 12,
    color: colors.destructive,
    fontWeight: '600',
    opacity: 0.8,
  },

  holdButton: {
    padding: 8,
    backgroundColor: colors.muted,
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rectification Styles
  rectificationCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.destructive + '40',
    paddingVertical: 4,
    ...SHADOWS.card,
  },
  failedItemRow: {
    padding: 16,
  },
  failedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  failedItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeFail: {
    backgroundColor: colors.destructive + '20',
  },
  badgeFlag: {
    backgroundColor: colors.warning + '20',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  failedItemNote: {
    marginTop: 8,
    marginLeft: 26,
    fontSize: 13,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
