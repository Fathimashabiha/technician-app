import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Check, Flag, X as XIcon, Camera, MessageSquare, Zap, AlertTriangle, BookOpen, Pause } from 'lucide-react-native';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import { Button } from '@/components/ui/Button';

type Category = 'PRE-INSPECTION' | 'FILTER CHECK' | 'COIL INSPECTION' | 'FINAL CHECK';

interface Item {
  id: string;
  category: Category;
  label: string;
  type: 'boolean' | 'numeric';
}

const CHECKLIST_ITEMS: Item[] = [
  { id: '1', category: 'PRE-INSPECTION', label: 'Verify power isolation', type: 'boolean' },
  { id: '2', category: 'PRE-INSPECTION', label: 'Check PPE equipment', type: 'boolean' },
  { id: '3', category: 'PRE-INSPECTION', label: 'Confirm LOTO procedure', type: 'boolean' },
  { id: '4', category: 'FILTER CHECK', label: 'Filter condition rating', type: 'boolean' },
  { id: '5', category: 'FILTER CHECK', label: 'Differential pressure reading (Pa)', type: 'numeric' },
  { id: '6', category: 'FILTER CHECK', label: 'Filter seal integrity', type: 'boolean' },
  { id: '7', category: 'COIL INSPECTION', label: 'Coil fin condition', type: 'boolean' },
  { id: '8', category: 'COIL INSPECTION', label: 'Drain pan clean and clear', type: 'boolean' },
  { id: '9', category: 'FINAL CHECK', label: 'System restored to operation', type: 'boolean' },
  { id: '10', category: 'FINAL CHECK', label: 'Area cleaned and tools secured', type: 'boolean' },
];

export default function ChecklistScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [answers, setAnswers] = useState<Record<string, { status: 'pass' | 'flag' | 'fail' | null; note: string; value: string }>>({});

  const handleStatus = (itemId: string, status: 'pass' | 'flag' | 'fail') => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status, note: prev[itemId]?.note || '', value: prev[itemId]?.value || '' }
    }));
  };

  const completedCount = Object.values(answers).filter(a => a.status || a.value).length;
  const passCount = Object.values(answers).filter(a => a.status === 'pass').length;
  const flagCount = Object.values(answers).filter(a => a.status === 'flag').length;
  const failCount = Object.values(answers).filter(a => a.status === 'fail').length;

  const progress = completedCount / CHECKLIST_ITEMS.length;

  // Group by category
  const grouped = CHECKLIST_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<Category, Item[]>);

  let bottomWarningType: 'none' | 'flag' | 'fail' = 'none';
  if (failCount > 0) bottomWarningType = 'fail';
  else if (flagCount > 0) bottomWarningType = 'flag';

  const isFormComplete = completedCount === CHECKLIST_ITEMS.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerDetails}>
          <Text style={styles.headerTitle}>Checklist</Text>
          <Text style={styles.headerSubtitle}>{id} • {completedCount}/10 completed</Text>
        </View>
        {route.params?.assetId && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Procedure', { assetId: route.params.assetId })}
            style={styles.procedureButton}
          >
            <BookOpen size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => navigation.navigate('WorkOrderDetails', { id, holdWork: true } as any)} 
          style={styles.holdButton}
        >
          <Pause size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Progress & Tallies */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.tallyRow}>
          <Text style={[styles.tallyText, passCount > 0 && { color: colors.success }]}>{passCount} Pass</Text>
          <Text style={[styles.tallyText, flagCount > 0 && { color: colors.warning }]}>{flagCount} Flag</Text>
          <Text style={[styles.tallyText, failCount > 0 && { color: colors.destructive }]}>{failCount} Fail</Text>
        </View>
      </View>

      {/* Checklist List */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {(Object.keys(grouped) as Category[]).map(category => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>

              <View style={styles.itemCardContainer}>
                {grouped[category].map(item => {
                  const ans = answers[item.id] || { status: null, note: '', value: '' };

                  return (
                    <View key={item.id} style={styles.itemWrapper}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>{item.label}</Text>

                        {item.type === 'boolean' ? (
                          <View style={styles.btnGroup}>
                            <TouchableOpacity 
                              style={[styles.statusBtn, ans.status === 'pass' && styles.statusBtnPass]}
                              onPress={() => handleStatus(item.id, 'pass')}
                            >
                              <Check size={16} color={ans.status === 'pass' ? colors.primaryForeground : colors.mutedForeground} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.statusBtn, ans.status === 'flag' && styles.statusBtnFlag]}
                              onPress={() => handleStatus(item.id, 'flag')}
                            >
                              <Flag size={14} color={ans.status === 'flag' ? colors.warningForeground : colors.mutedForeground} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.statusBtn, ans.status === 'fail' && styles.statusBtnFail]}
                              onPress={() => handleStatus(item.id, 'fail')}
                            >
                              <XIcon size={16} color={ans.status === 'fail' ? colors.destructiveForeground : colors.mutedForeground} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.inputWrapper}>
                             <TextInput
                               style={styles.numericInput}
                               placeholder="Enter value"
                               placeholderTextColor={colors.mutedForeground}
                               keyboardType="numeric"
                               value={ans.value}
                               onChangeText={val => setAnswers(p => ({ ...p, [item.id]: { ...p[item.id], value: val } }))}
                             />
                          </View>
                        )}
                      </View>

                      {/* Expansion for Flag/Fail */}
                      {(ans.status === 'flag' || ans.status === 'fail') && item.type === 'boolean' && (
                        <View style={styles.expandedSection}>
                          <View style={styles.expandedHeaderRow}>
                            {ans.status === 'flag' ? (
                              <Zap size={10} color={colors.warning} />
                            ) : (
                              <AlertTriangle size={10} color={colors.destructive} />
                            )}
                            <Text style={[
                              styles.expandedLabel, 
                              ans.status === 'flag' ? { color: colors.warning } : { color: colors.destructive }
                            ]}>
                              {ans.status === 'flag' ? 'FLAG NOTE REQUIRED' : 'FAILURE DETAILS REQUIRED'}
                            </Text>
                          </View>

                          <TextInput
                            style={styles.reasonInput}
                            placeholder="Add reason..."
                            placeholderTextColor={colors.mutedForeground}
                            value={ans.note}
                            onChangeText={val => setAnswers(p => ({ ...p, [item.id]: { ...p[item.id], note: val } }))}
                          />

                          <View style={styles.expandedActions}>
                            <TouchableOpacity style={styles.actionBtnSecondary}>
                              <Camera size={14} color={colors.foreground} />
                              <Text style={styles.actionBtnText}>Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnSecondary}>
                              <MessageSquare size={14} color={colors.foreground} />
                              <Text style={styles.actionBtnText}>Comment</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {/* Scrollable Action Bar */}
          <View style={styles.scrollableBottomBar}>
            {bottomWarningType !== 'none' && (
              <View style={styles.warningRow}>
                {bottomWarningType === 'flag' ? (
                  <>
                    <Zap size={12} color={colors.warning} />
                    <Text style={[styles.warningText, { color: colors.warning }]}>Flagged items will be sent for review</Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} color={colors.destructive} />
                    <Text style={[styles.warningText, { color: colors.destructive }]}>Failed items will be reported for corrective action</Text>
                  </>
                )}
              </View>
            )}
            <Button 
              title={bottomWarningType === 'fail' ? 'Submit with Failures' : 'Submit Checklist'}
              variant={bottomWarningType === 'fail' ? 'destructive' : 'default'}
              disabled={!isFormComplete}
              onPress={() => {
                const woType = route.params?.woType;
                const isBreakdown = woType === 'Breakdown' || woType === 'Corrective';

                if (bottomWarningType === 'fail' && !isBreakdown) {
                  navigation.navigate('WorkOrderResult', { id, status: 'fail' });
                } else {
                  const failedItems = Object.entries(answers)
                    .filter(([_, ans]) => ans.status === 'fail' || ans.status === 'flag')
                    .map(([id, ans]) => {
                      const item = CHECKLIST_ITEMS.find(i => i.id === id);
                      return { 
                        label: item?.label || 'Unknown Item', 
                        status: ans.status, 
                        note: ans.note 
                      };
                    });

                  navigation.navigate('WorkOrderDetails', { 
                    id, 
                    stepCompleted: 'checklist', 
                    checklistResult: bottomWarningType === 'fail' ? 'fail' : 'pass',
                    failedItems
                  });
                }
              }}
              style={{ height: 52, borderRadius: 12 }}
            />
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
    backgroundColor: colors.muted + '40',
    borderRadius: 8,
  },
  headerDetails: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  headerSubtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  procedureButton: {
    padding: 8,
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
  },
  holdButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: colors.muted,
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border + '40',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tallyText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '600',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  itemCardContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 4,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  itemWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
    paddingRight: 16,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  statusBtnPass: { backgroundColor: colors.success, borderColor: colors.success },
  statusBtnFlag: { backgroundColor: colors.warning, borderColor: colors.warning },
  statusBtnFail: { backgroundColor: colors.destructive, borderColor: colors.destructive },
  
  inputWrapper: {
    width: 100,
    height: 36,
    backgroundColor: colors.panel,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  numericInput: {
    fontSize: 14,
    color: colors.foreground,
    textAlign: 'center',
    fontWeight: '700',
  },

  expandedSection: {
    backgroundColor: colors.panel,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.muted + '20',
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  expandedLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reasonInput: {
    height: 40,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.muted + '40',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },

  scrollableBottomBar: {
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
