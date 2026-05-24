import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { 
  Camera, MapPin, PenLine, Clock, CheckCircle2, 
  AlertCircle, ShieldAlert, Zap, Droplets, Hammer, 
  ArrowRight, Search, Filter, History, Plus, X,
  ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { COLORS, SHADOWS, GRADIENTS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, Layout, SequencedTransition } from 'react-native-reanimated';

const SNAG_CATEGORIES = [
  { id: 'elec', label: 'Electrical', icon: Zap, color: '#F59E0B' },
  { icon: Droplets, label: 'Plumbing', id: 'plum', color: '#3B82F6' },
  { icon: Hammer, label: 'Civil', id: 'civil', color: '#10B981' },
  { icon: ShieldAlert, label: 'Safety', id: 'safe', color: '#EF4444' },
];

const SNAG_ISSUES = [
  { label: 'Water Leakage', icon: Droplets, color: '#3B82F6' },
  { label: 'Broken Glass/Window', icon: AlertTriangle, color: '#EF4444' },
  { label: 'Flickering/Broken Lights', icon: Zap, color: '#F59E0B' },
  { label: 'Wall Cracks/Damage', icon: Hammer, color: '#10B981' },
  { label: 'AC Not Cooling', icon: AlertCircle, color: '#3B82F6' },
  { label: 'Door Lock Malfunction', icon: ShieldAlert, color: '#EF4444' },
];

const snags = [
  { id: 'SNG-001', title: 'Wall crack near stairwell', location: 'Building A - Floor 2', status: 'Assigned', date: '2024-03-12', severity: 'Medium', category: 'Civil', reportedByMe: true },
  { id: 'SNG-002', title: 'Ceiling tile damage', location: 'Building C - Reception', status: 'In Progress', date: '2024-03-11', severity: 'High', category: 'Civil', reportedByMe: false },
  { id: 'SNG-003', title: 'Exposed wiring - AHU room', location: 'Building B - Rooptop', status: 'Assigned', date: '2024-03-10', severity: 'Critical', category: 'Electrical', reportedByMe: true },
];

type Snag = typeof snags[0];

export default function SnaggingScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);

  const SEVERITIES = [
    { label: 'Critical', color: colors.destructive },
    { label: 'High', color: colors.warning },
    { label: 'Medium', color: colors.secondary },
    { label: 'Low', color: colors.primary },
  ];
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Form state
  const [category, setCategory] = useState('Civil');
  const [issue, setIssue] = useState('Wall Cracks/Damage');
  const [description, setDescription] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const stats = {
    myReported: snags.filter(s => s.reportedByMe).length,
    assignedToMe: 2, // Mocked
  };

  const filteredSnags = snags.filter(s => {
    if (filter === 'my' && !s.reportedByMe) return false;
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
      <PageHeader
        title="Snagging"
        showBack
        rightElement={
          <TouchableOpacity 
            onPress={() => setShowNew(!showNew)}
            style={styles.compactNewBtn}
          >
            {showNew ? (
              <X size={16} color={colors.mutedForeground} />
            ) : (
              <LinearGradient
                colors={gradients.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compactGradient}
              >
                <Plus size={14} color="#FFF" />
                <Text style={styles.compactBtnText}>Report</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        }
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Dashboard */}

        {showNew ? (
          <Animated.View entering={FadeInUp} layout={Layout.springify()} style={styles.newForm}>
            <Text style={styles.formSectionTitle}>Issue Details</Text>
            <Card style={styles.formCard}>
              <View style={styles.photoUploadArea}>
                <Camera size={32} color={colors.mutedForeground} />
                <Text style={styles.photoUploadText}>Tap to Capture Evidence</Text>
              </View>
              
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                style={[styles.dropdownField, isCategoryDropdownOpen && styles.dropdownFieldActive]}
              >
                <View style={styles.dropdownValueRow}>
                  {(() => {
                    const selectedCat = SNAG_CATEGORIES.find(c => c.label === category) || SNAG_CATEGORIES[0];
                    return (
                      <>
                        <View style={[styles.typeIconBox, { backgroundColor: selectedCat.color + '1A' }]}>
                          <selectedCat.icon size={16} color={selectedCat.color} />
                        </View>
                        <Text style={styles.dropdownValueText}>{category}</Text>
                      </>
                    );
                  })()}
                </View>
                {isCategoryDropdownOpen ? <ChevronUp size={18} color={colors.mutedForeground} /> : <ChevronDown size={18} color={colors.mutedForeground} />}
              </TouchableOpacity>

              {isCategoryDropdownOpen && (
                <View style={styles.dropdownOptions}>
                  {SNAG_CATEGORIES.map(cat => (
                    <TouchableOpacity 
                      key={cat.id}
                      onPress={() => {
                        setCategory(cat.label);
                        setIsCategoryDropdownOpen(false);
                      }}
                      style={[styles.optionItem, category === cat.label && styles.optionItemActive]}
                    >
                      <cat.icon size={16} color={category === cat.label ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.optionText, category === cat.label && styles.optionTextActive]}>{cat.label}</Text>
                      {category === cat.label && <CheckCircle2 size={14} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Issue</Text>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setIsIssueDropdownOpen(!isIssueDropdownOpen)}
                style={[styles.dropdownField, isIssueDropdownOpen && styles.dropdownFieldActive]}
              >
                <View style={styles.dropdownValueRow}>
                  {(() => {
                    const selectedIssue = SNAG_ISSUES.find(i => i.label === issue) || SNAG_ISSUES[0];
                    return (
                      <>
                        <View style={[styles.typeIconBox, { backgroundColor: selectedIssue.color + '1A' }]}>
                          <selectedIssue.icon size={16} color={selectedIssue.color} />
                        </View>
                        <Text style={styles.dropdownValueText}>{issue}</Text>
                      </>
                    );
                  })()}
                </View>
                {isIssueDropdownOpen ? <ChevronUp size={18} color={colors.mutedForeground} /> : <ChevronDown size={18} color={colors.mutedForeground} />}
              </TouchableOpacity>

              {isIssueDropdownOpen && (
                <View style={styles.dropdownOptions}>
                  {SNAG_ISSUES.map(i => (
                    <TouchableOpacity 
                      key={i.label}
                      onPress={() => {
                        setIssue(i.label);
                        setIsIssueDropdownOpen(false);
                      }}
                      style={[styles.optionItem, issue === i.label && styles.optionItemActive]}
                    >
                      <i.icon size={16} color={issue === i.label ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.optionText, issue === i.label && styles.optionTextActive]}>{i.label}</Text>
                      {issue === i.label && <CheckCircle2 size={14} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                placeholder="Give a detailed account of the snag..."
                placeholderTextColor={colors.mutedForeground}
                style={styles.textArea}
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <View style={styles.locationContainer}>
                <MapPin size={16} color={colors.primary} />
                <TextInput
                  placeholder="Specify location / Scan QR"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.locationInput}
                  defaultValue="Building A - Floor 3"
                />
              </View>
              
              <Button 
                title={submitting ? "Syncing..." : "Submit Snag Report"} 
                onPress={() => {
                  setSubmitting(true);
                  setTimeout(() => {
                    setSubmitting(false);
                    setShowNew(false);
                  }, 1500);
                }} 
                disabled={submitting}
                variant="default"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Animated.View>
        ) : (
          <>
            {/* View Filter Toggle */}
            <View style={styles.filterArea}>
              <View style={styles.viewToggle}>
                {['all', 'my'].map(v => (
                  <TouchableOpacity 
                    key={v}
                    onPress={() => setFilter(v as any)}
                    style={[styles.toggleBtn, filter === v && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, filter === v && styles.toggleTextActive]}>
                      {v === 'all' ? 'All Snags' : 'My Snags'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
                {['All', 'Assigned', 'In Progress', 'Completed', 'Verified'].map(s => (
                  <TouchableOpacity 
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    style={[styles.statusChip, statusFilter === s && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, statusFilter === s && styles.statusChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.list}>
              {filteredSnags.map((snag, i) => (
                <Animated.View 
                  key={snag.id} 
                  entering={FadeInDown.delay(i * 100)} 
                  layout={Layout.springify()}
                >
                  <Card style={styles.snagCard}>
                    <View style={styles.cardMain}>
                      <View style={styles.cardHeader}>
                        <View style={styles.titleArea}>
                          <Text style={styles.idText}>{snag.id}</Text>
                          <Text style={styles.snagTitle}>{snag.title}</Text>
                        </View>
                        <View style={[styles.severityBadge, { backgroundColor: SEVERITIES.find(s => s.label === snag.severity)?.color + '1A' }]}>
                          <Text style={[styles.severityBadgeText, { color: SEVERITIES.find(s => s.label === snag.severity)?.color }]}>
                            {snag.severity}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <MapPin size={12} color={colors.mutedForeground} />
                          <Text style={styles.metaText}>{snag.location}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <History size={12} color={colors.mutedForeground} />
                          <Text style={styles.metaText}>{snag.date}</Text>
                        </View>
                      </View>

                      <View style={styles.cardFooter}>
                        <View style={styles.catIndicator}>
                          {React.createElement(SNAG_CATEGORIES.find(c => c.label === snag.category)?.icon || Hammer, { size: 14, color: colors.mutedForeground })}
                          <Text style={styles.catIndicatorText}>{snag.category}</Text>
                        </View>
                        <StatusBadge status={snag.status} />
                      </View>
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  
  // Dashboard Stats
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.card,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  statLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },

  // Filters
  filterArea: { marginBottom: 24, gap: 16 },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.muted + '40',
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: { backgroundColor: '#FFF', ...SHADOWS.card },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  toggleTextActive: { color: colors.primary },
  
  statusFilters: { marginHorizontal: -20, paddingHorizontal: 20 },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  statusChipTextActive: { color: '#FFF' },

  // New Form
  newForm: { marginBottom: 20 },
  formSectionTitle: { fontSize: 16, fontWeight: '800', color: colors.foreground, marginBottom: 12 },
  formCard: { padding: 20, gap: 16 },
  photoUploadArea: {
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted + '1A',
    gap: 8,
  },
  photoUploadText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground, marginBottom: -4 },
  input: {
    height: 52,
    backgroundColor: colors.muted + '40',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.foreground,
  },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border + '40',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityDot: { width: 6, height: 6, borderRadius: 3 },
  severityLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.muted + '40',
    borderRadius: 10,
  },
  catChipActive: { backgroundColor: colors.primary },
  catLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.muted + '40',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  locationInput: { flex: 1, fontSize: 14, color: colors.foreground, fontWeight: '600' },

  // List Items
  list: { gap: 16 },
  snagCard: { padding: 0, overflow: 'hidden' },
  cardMain: { padding: 16, gap: 12 },
  idText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  titleArea: { flex: 1, gap: 2 },
  snagTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  severityBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '500' },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  catIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIndicatorText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },

  // Compact Header Button
  // Compact Header Button
  compactNewBtn: {
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    gap: 4,
  },
  compactBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Dropdown Styles
  dropdownField: { 
    height: 52, 
    backgroundColor: colors.muted + '40', 
    borderRadius: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    borderWidth: 1, 
    borderColor: colors.border + '15',
  },
  dropdownFieldActive: { borderColor: colors.primary, backgroundColor: colors.primary + '05' },
  dropdownValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dropdownValueText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  
  dropdownOptions: { 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    padding: 8, 
    marginTop: -8,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...SHADOWS.elevated,
  },
  optionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 10, 
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionItemActive: { backgroundColor: colors.primary + '10' },
  optionText: { fontSize: 13, color: colors.mutedForeground, fontWeight: '500', flex: 1 },
  optionTextActive: { color: colors.foreground, fontWeight: '700' },

  textArea: {
    height: 100,
    backgroundColor: colors.muted + '40',
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    color: colors.foreground,
    textAlignVertical: 'top',
  },
});