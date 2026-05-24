import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TextInput, Dimensions, StatusBar
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, 
  Camera, MapPin, History, Info, 
  Zap, Flame, Biohazard, Activity,
  ThumbsUp, ThumbsDown, X, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SAFETY_ALERTS = [
  { id: 'ALT-01', title: 'Mandatory PPE Zone', desc: 'All technicians must wear full heat-resistant gear in Boiler Room 3.', type: 'Critical', date: 'Today' },
  { id: 'ALT-02', title: 'High Voltage Warning', desc: 'Electrical Room A undergoing maintenance. Restricted access.', type: 'Warning', date: 'Yesterday' },
  { id: 'ALT-03', title: 'Slip Hazard - Lobby', desc: 'Recent cleaning. Wet floors near main entrance.', type: 'Info', date: 'Yesterday' },
];

const HSE_HISTORY = [
  { id: 'OBS-102', type: 'Observation', title: 'Blocked Fire Exit', subtype: 'Unsafe', date: '2024-03-14', status: 'Reported' },
  { id: 'INC-204', type: 'Incident', title: 'Minor Spillage', subtype: 'Near Miss', date: '2024-03-12', status: 'Resolved' },
  { id: 'OBS-098', type: 'Observation', title: 'Proper Guarding', subtype: 'Safe', date: '2024-03-10', status: 'Verified' },
];

const INCIDENT_TYPES = [
  { label: 'Accident', icon: AlertTriangle, color: '#EF4444' },
  { label: 'Near Miss', icon: ShieldAlert, color: '#F59E0B' },
  { label: 'First Aid', icon: Activity, color: '#3B82F6' },
  { label: 'Environmental', icon: Biohazard, color: '#10B981' },
];

export default function HSEScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors, gradients, isDark, shadows } = useTheme();
  const fromDashboard = (route.params as any)?.fromDashboard;
  const [view, setView] = useState<'dashboard' | 'incident' | 'observation'>('dashboard');
  const [submitting, setSubmitting] = useState(false);
  
  // Incident Form State
  const [incType, setIncType] = useState('Accident');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Observation State
  const [obsStatus, setObsStatus] = useState<'safe' | 'unsafe'>('unsafe');

  const styles = getStyles(colors, isDark, shadows);

  const renderDashboard = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick Actions */}
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={[styles.actionBtn, { borderColor: colors.destructive + '40' }]}
          onPress={() => setView('incident')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.destructive + '1A' }]}>
            <AlertTriangle color={colors.destructive} size={24} />
          </View>
          <Text style={styles.actionTitle}>Report Incident</Text>
          <Text style={styles.actionDesc}>Capture accidents or near misses</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { borderColor: colors.primary + '40' }]}
          onPress={() => setView('observation')}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + '1A' }]}>
            <Camera color={colors.primary} size={24} />
          </View>
          <Text style={styles.actionTitle}>Submit Observation</Text>
          <Text style={styles.actionDesc}>Report safe / unsafe conditions</Text>
        </TouchableOpacity>
      </View>

      {/* Safety Alerts Feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Safety Alerts</Text>
        <Text style={styles.sectionLink}>View All</Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsList}>
        {SAFETY_ALERTS.map((alert, i) => (
          <Animated.View key={alert.id} entering={FadeInUp.delay(i * 100)}>
            <Card style={styles.alertCard}>
              <View style={[styles.alertBadge, { backgroundColor: alert.type === 'Critical' ? colors.destructive + '1A' : colors.warning + '1A' }]}>
                <Text style={[styles.alertBadgeText, { color: alert.type === 'Critical' ? colors.destructive : colors.warning }]}>
                  {alert.type}
                </Text>
              </View>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDesc} numberOfLines={2}>{alert.desc}</Text>
              <Text style={styles.alertDate}>{alert.date}</Text>
            </Card>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Recent History */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Recent Submissions</Text>
      </View>

      <View style={styles.historyList}>
        {HSE_HISTORY.map((item, i) => (
          <Animated.View key={item.id} entering={FadeInDown.delay(i * 100)}>
            <Card style={styles.historyCard}>
              <View style={styles.historyMain}>
                <View style={[styles.historyIcon, { backgroundColor: item.type === 'Incident' ? colors.destructive + '1A' : (item.subtype === 'Safe' ? colors.success + '1A' : colors.warning + '1A') }]}>
                  {item.type === 'Incident' ? <ShieldAlert size={16} color={colors.destructive} /> : <Camera size={16} color={item.subtype === 'Safe' ? colors.success : colors.warning} />}
                </View>
                <View style={styles.historyText}>
                  <Text style={styles.historyId}>{item.id}</Text>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyMeta}>{item.subtype} • {item.date}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            </Card>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );

  const renderIncidentForm = () => {
    const selectedType = INCIDENT_TYPES.find(t => t.label === incType) || INCIDENT_TYPES[0];

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp} style={styles.formContainer}>
          <Text style={styles.formLabel}>Incident Type</Text>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            style={[styles.dropdownField, isTypeDropdownOpen && styles.dropdownFieldActive]}
          >
            <View style={styles.dropdownValueRow}>
              <View style={[styles.typeIconBox, { backgroundColor: selectedType.color + '1A' }]}>
                <selectedType.icon size={18} color={selectedType.color} />
              </View>
              <Text style={styles.dropdownValueText}>{incType}</Text>
            </View>
            {isTypeDropdownOpen ? <ChevronUp size={18} color={colors.mutedForeground} /> : <ChevronDown size={18} color={colors.mutedForeground} />}
          </TouchableOpacity>

          {isTypeDropdownOpen && (
            <Animated.View entering={FadeInUp} style={styles.dropdownOptions}>
              {INCIDENT_TYPES.map(type => (
                <TouchableOpacity 
                  key={type.label}
                  onPress={() => {
                    setIncType(type.label);
                    setIsTypeDropdownOpen(false);
                  }}
                  style={[styles.optionItem, incType === type.label && styles.optionItemActive]}
                >
                  <type.icon size={16} color={incType === type.label ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.optionText, incType === type.label && styles.optionTextActive]}>{type.label}</Text>
                  {incType === type.label && <CheckCircle2 size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

        <Text style={styles.formLabel}>Description</Text>
        <TextInput 
          placeholder="What happened? Give a detailed account..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.textArea}
          multiline
        />

        <View style={styles.photoArea}>
          <Camera size={32} color={colors.mutedForeground} />
          <Text style={styles.photoText}>Tap to Capture Scene Evidence</Text>
        </View>

        <View style={styles.locationContainer}>
          <MapPin size={16} color={colors.primary} />
          <TextInput
            placeholder="Automatic Location Detected"
            placeholderTextColor={colors.mutedForeground}
            style={styles.locationInput}
            defaultValue="Zone B-42, Maintenance Floor"
          />
        </View>

          <Button 
            title={submitting ? "Submitting..." : "Submit Incident Report"} 
            onPress={() => {
              setSubmitting(true);
              setTimeout(() => {
                setSubmitting(false);
                setView('dashboard');
              }, 1500);
            }} 
            variant={incType === 'Accident' ? 'destructive' : 'default'}
            disabled={submitting}
          />
      </Animated.View>
    </ScrollView>
    );
  };

  const renderObservationForm = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
       <Animated.View entering={FadeInUp} style={styles.formContainer}>
        <View style={styles.obsToggleContainer}>
          <TouchableOpacity 
            onPress={() => setObsStatus('safe')}
            style={[styles.obsToggle, obsStatus === 'safe' && styles.obsToggleSafeActive]}
          >
            <ThumbsUp size={24} color={obsStatus === 'safe' ? '#FFF' : colors.success} />
            <Text style={[styles.obsToggleText, obsStatus === 'safe' && { color: '#FFF' }]}>Safe Act/Condition</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setObsStatus('unsafe')}
            style={[styles.obsToggle, obsStatus === 'unsafe' && styles.obsToggleUnsafeActive]}
          >
            <ThumbsDown size={24} color={obsStatus === 'unsafe' ? '#FFF' : colors.destructive} />
            <Text style={[styles.obsToggleText, obsStatus === 'unsafe' && { color: '#FFF' }]}>Unsafe Act/Condition</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.formLabel}>Observation Details</Text>
        <TextInput 
          placeholder="Describe your observation..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.textArea}
          multiline
        />

        <View style={styles.photoArea}>
          <Camera size={32} color={colors.mutedForeground} />
          <Text style={styles.photoText}>Add a Photo for Evidence</Text>
        </View>

        <Button 
          title={submitting ? "Uploading..." : "Submit Observation"} 
          onPress={() => {
            setSubmitting(true);
            setTimeout(() => {
              setSubmitting(false);
              setView('dashboard');
            }, 1500);
          }} 
          variant="accent"
          disabled={submitting}
        />
       </Animated.View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? "light-content" : "dark-content"} />
      <PageHeader 
        title="HSE Management" 
        showBack 
        onBack={() => {
          if (fromDashboard) {
            (navigation as any).navigate('Dashboard');
          } else {
            navigation.goBack();
          }
        }}
        rightElement={
          view !== 'dashboard' && (
            <TouchableOpacity onPress={() => setView('dashboard')} style={styles.closeBtn}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )
        }
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      {view === 'dashboard' && renderDashboard()}
      {view === 'incident' && renderIncidentForm()}
      {view === 'observation' && renderObservationForm()}
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  
  // Quick Actions
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  actionBtn: { 
    flex: 1, 
    backgroundColor: colors.card, 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1,
    ...shadows.card,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  actionDesc: { fontSize: 11, color: colors.mutedForeground, lineHeight: 14 },
  
  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground },
  sectionLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  
  // Alerts
  alertsList: { marginHorizontal: -20, paddingHorizontal: 20 },
  alertCard: { width: width * 0.7, padding: 16, marginRight: 12, gap: 8, backgroundColor: colors.card },
  alertBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  alertBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  alertDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 16 },
  alertDate: { fontSize: 10, color: colors.mutedForeground + '80', marginTop: 4 },
  
  // History
  historyList: { gap: 12 },
  historyCard: { padding: 16, backgroundColor: colors.card },
  historyMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  historyText: { flex: 1, gap: 2 },
  historyId: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  historyMeta: { fontSize: 11, color: colors.mutedForeground },
  
  // Forms
  formContainer: { gap: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeChip: { 
    flex: 1, 
    minWidth: '45%', 
    height: 52, 
    backgroundColor: colors.card, 
    borderRadius: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  typeLabelText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: { flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border + '20' },
  severityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  severityLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  severityLabelActive: { color: '#FFF' },
  
  textArea: { 
    height: 120, 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 14, 
    color: colors.foreground,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  photoArea: {
    height: 140,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    gap: 8,
  },
  photoText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel, borderRadius: 14, paddingHorizontal: 16, height: 52 },
  locationInput: { flex: 1, fontSize: 13, color: colors.foreground, fontWeight: '600' },
  
  obsToggleContainer: { flexDirection: 'row', gap: 12 },
  obsToggle: { flex: 1, padding: 20, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border + '20' },
  obsToggleSafeActive: { backgroundColor: colors.success, borderColor: colors.success },
  obsToggleUnsafeActive: { backgroundColor: colors.destructive, borderColor: colors.destructive },
  obsToggleText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground, textAlign: 'center' },
  
  // Dropdown Styles
  dropdownField: { 
    height: 56, 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    borderWidth: 1, 
    borderColor: colors.border + '30',
    ...shadows.card,
  },
  dropdownFieldActive: { borderColor: colors.primary },
  dropdownValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dropdownValueText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  
  dropdownOptions: { 
    backgroundColor: colors.card, 
    borderRadius: 16, 
    padding: 8, 
    marginTop: -10,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.elevated,
  },
  optionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionItemActive: { backgroundColor: colors.primary + '10' },
  optionText: { fontSize: 14, color: colors.mutedForeground, fontWeight: '500', flex: 1 },
  optionTextActive: { color: colors.foreground, fontWeight: '700' },
  
  closeBtn: { padding: 4 },
});

