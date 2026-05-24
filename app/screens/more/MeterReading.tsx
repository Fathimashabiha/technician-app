import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, StatusBar
} from 'react-native';
import { 
  Zap, Droplets, Flame, Activity, 
  Camera, History, CheckCircle2, 
  ChevronRight, Search, MapPin, 
  AlertCircle, ArrowUpRight, ArrowDownRight,
  Plus
} from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

const METERS = [
  { id: 'MTR-001', name: 'Main DB - Floor 3', type: 'Electric', unit: 'KWh', lastValue: 12450.5, location: 'Building A - Electrical Room 3' },
  { id: 'MTR-002', name: 'Chiller-01 Water', type: 'Water', unit: 'm³', lastValue: 842.2, location: 'Rooftop - Plant Room' },
  { id: 'MTR-003', name: 'Kitchen Gas Main', type: 'Gas', unit: 'L', lastValue: 3120.0, location: 'Ground Floor - Service Area' },
];

const PREVIOUS_READINGS = [
  { id: 'R-102', date: '2024-03-10', value: 12445.2, status: 'Verified' },
  { id: 'R-101', date: '2024-03-05', value: 12438.8, status: 'Verified' },
  { id: 'R-100', date: '2024-03-01', value: 12430.1, status: 'Verified' },
];

export default function MeterReadingScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const [selectedMeter, setSelectedMeter] = useState(METERS[0]);
  const [reading, setReading] = useState('');
  const [condition, setCondition] = useState<'Good' | 'Faulty' | 'Tampered'>('Good');
  const [notes, setNotes] = useState('');
  const [isPhotoCaptured, setIsPhotoCaptured] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const consumption = parseFloat(reading) - selectedMeter.lastValue;

  const handleCapture = () => {
    setIsPhotoCaptured(true);
    setIsScanning(true);
    
    // Simulate OCR delay
    setTimeout(() => {
      const nextVal = (selectedMeter.lastValue + Math.random() * 5 + 1).toFixed(1);
      setReading(nextVal);
      setIsScanning(false);
    }, 1800);
  };

  const handleSubmit = () => {
    if (!reading) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setReading('');
        setCondition('Good');
        setNotes('');
        setIsPhotoCaptured(false);
      }, 2000);
    }, 1500);
  };

  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'Electric': return <Zap size={20} color="#F59E0B" />;
      case 'Water': return <Droplets size={20} color="#3B82F6" />;
      case 'Gas': return <Flame size={20} color="#EF4444" />;
      default: return <Activity size={20} color={colors.primary} />;
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <Animated.View entering={FadeInUp} style={styles.successCard}>
          <View style={styles.successIconWrapper}>
            <CheckCircle2 size={48} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Reading Uploaded!</Text>
          <Text style={styles.successDesc}>The meter reading for {selectedMeter.name} has been successfully synced.</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Meter Readings" showBack />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Meter Selector */}
          <TouchableOpacity 
            onPress={() => setShowPicker(!showPicker)}
            style={styles.meterSelector}
          >
            <View style={styles.meterInfoMain}>
              <View style={[styles.typeIcon, { backgroundColor: selectedMeter.type === 'Electric' ? '#F59E0B1A' : (selectedMeter.type === 'Water' ? '#3B82F61A' : '#EF44441A') }]}>
                {getMeterIcon(selectedMeter.type)}
              </View>
              <View style={styles.meterNameCol}>
                <View style={styles.labelRow}>
                  <Text style={styles.meterLabel}>Active Meter</Text>
                  <View style={styles.locationBadge}>
                    <MapPin size={10} color={colors.success} />
                    <Text style={styles.locationBadgeText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.meterName}>{selectedMeter.name}</Text>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} style={{ transform: [{ rotate: showPicker ? '90deg' : '0deg' }]}} />
            </View>
          </TouchableOpacity>

          {showPicker && (
            <Animated.View entering={FadeInDown} style={styles.pickerDropdown}>
              {METERS.filter(m => m.id !== selectedMeter.id).map(meter => (
                <TouchableOpacity 
                  key={meter.id} 
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedMeter(meter);
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{meter.name}</Text>
                  <Text style={styles.pickerItemId}>{meter.id}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {/* Core Form Card */}
          <Card style={styles.formCard}>
            <View style={styles.readingHeader}>
              <View style={styles.prevSection}>
                <History size={14} color={colors.mutedForeground} />
                <Text style={styles.prevLabel}>Previous Reading</Text>
                <Text style={styles.prevValue}>{selectedMeter.lastValue} {selectedMeter.unit}</Text>
              </View>
              <View style={styles.unitBadge}>
                <Text style={styles.unitText}>{selectedMeter.type}</Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Current Reading</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.mainInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground + '40'}
                  keyboardType="numeric"
                  value={reading}
                  onChangeText={setReading}
                />
                <Text style={styles.inputUnit}>{selectedMeter.unit}</Text>
              </View>
              {!isNaN(parseFloat(reading)) && (
                <View style={[styles.summaryBox, { marginTop: 16 }]}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Previous Reading</Text>
                    <Text style={styles.summaryValue}>{selectedMeter.lastValue.toLocaleString()} {selectedMeter.unit}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Current Reading</Text>
                    <Text style={styles.summaryValue}>{parseFloat(reading).toLocaleString() || '0'} {selectedMeter.unit}</Text>
                  </View>
                  <View style={[styles.summaryDivider, { marginVertical: 8 }]} />
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { fontWeight: '800', color: colors.foreground }]}>Total Consumption</Text>
                    <View style={[styles.deltaBadge, { backgroundColor: consumption >= 0 ? colors.success + '15' : colors.destructive + '15' }]}>
                      <Text style={[styles.deltaText, { color: consumption >= 0 ? colors.success : colors.destructive }]}>
                        {consumption >= 0 ? '+' : ''}{consumption.toFixed(2)} {selectedMeter.unit}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Meter Condition */}
            <View style={styles.conditionSection}>
              <Text style={styles.inputLabel}>Meter Condition</Text>
              <View style={styles.conditionChips}>
                {(['Good', 'Faulty', 'Tampered'] as const).map(c => (
                  <TouchableOpacity 
                    key={c}
                    onPress={() => setCondition(c)}
                    style={[styles.conditionChip, condition === c && styles.conditionChipActive]}
                  >
                    <Text style={[styles.conditionChipText, condition === c && styles.conditionChipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Additional Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.inputLabel}>Technician Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Observation or comments..."
                placeholderTextColor={colors.mutedForeground + '50'}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Photo Capture */}
            <TouchableOpacity 
              onPress={handleCapture}
              disabled={isScanning}
              style={[
                styles.photoArea, 
                isPhotoCaptured && styles.photoAreaActive,
                isScanning && styles.photoAreaScanning
              ]}
            >
              {isScanning ? (
                <View style={styles.scanningLayer}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.scanningText}>Analyzing Meter Face...</Text>
                  <Animated.View 
                    entering={FadeInUp}
                    style={styles.scanLine} 
                  />
                </View>
              ) : isPhotoCaptured ? (
                <View style={styles.photoPreview}>
                  <View style={styles.successBadge}>
                    <CheckCircle2 size={24} color="#FFF" />
                  </View>
                  <View style={styles.extractedInfo}>
                    <Text style={styles.extractedLabel}>DATA EXTRACTED</Text>
                    <Text style={styles.extractedValue}>{reading} {selectedMeter.unit}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCapture();
                    }}
                    style={styles.rescanBtn}
                  >
                    <Text style={styles.rescanText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Camera size={32} color={colors.mutedForeground} />
                  <Text style={styles.photoText}>Capture Meter Photo</Text>
                  <Text style={styles.photoSubtext}>Auto-extraction enabled</Text>
                </>
              )}
            </TouchableOpacity>

            <Button 
              title={isSubmitting ? "Uploading..." : "Upload Reading"}
              onPress={handleSubmit}
              variant="default"
              disabled={isSubmitting || !reading}
              loading={isSubmitting}
              style={styles.submitBtn}
            />
          </Card>

          {/* Recent History */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Activity</Text>
              <History size={16} color={colors.mutedForeground} />
            </View>
            
            {PREVIOUS_READINGS.map((item, i) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(i * 100)}>
                <View style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyStatIcon}>
                      {i === 0 ? <ArrowUpRight size={14} color={colors.destructive} /> : <ArrowDownRight size={14} color={colors.success} />}
                    </View>
                    <View>
                      <Text style={styles.historyDate}>{item.date}</Text>
                      <Text style={styles.historyId}>{item.id} • {item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyValue}>{item.value} {selectedMeter.unit}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 100 },
  meterSelector: { backgroundColor: colors.card, borderRadius: 20, padding: 16, ...SHADOWS.card, marginBottom: 8, borderWidth: 1, borderColor: colors.border + '20' },
  meterInfoMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  meterNameCol: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '10', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  locationBadgeText: { fontSize: 9, fontWeight: '700', color: colors.success, textTransform: 'uppercase' },
  meterLabel: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase' },
  meterName: { fontSize: 16, fontWeight: '800', color: colors.foreground },
  pickerDropdown: { backgroundColor: colors.card, borderRadius: 16, padding: 8, marginBottom: 20, ...SHADOWS.card, borderWidth: 1, borderColor: colors.primary + '20' },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '10' },
  pickerItemText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  pickerItemId: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  formCard: { padding: 24, gap: 24 },
  readingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  prevSection: { gap: 4 },
  prevLabel: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  prevValue: { fontSize: 15, fontWeight: '800', color: colors.foreground },
  unitBadge: { backgroundColor: colors.panel, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  unitText: { fontSize: 11, fontWeight: '700', color: colors.mutedForeground },
  inputSection: { gap: 12 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 8 },
  mainInput: { flex: 1, fontSize: 42, fontWeight: '800', color: colors.foreground, padding: 0 },
  inputUnit: { fontSize: 18, fontWeight: '700', color: colors.mutedForeground, marginBottom: 12, marginLeft: 8 },
  consumptionBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: colors.primary + '08', padding: 10, borderRadius: 10 },
  consumptionLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  consumptionValue: { fontSize: 13, fontWeight: '800', color: colors.primary },
  summaryBox: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border + '30', backgroundColor: colors.panel },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  summaryValue: { fontSize: 13, color: colors.foreground, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: colors.border + '20' },
  deltaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deltaText: { fontSize: 13, fontWeight: '800' },
  conditionSection: { gap: 12, marginTop: 24 },
  conditionChips: { flexDirection: 'row', gap: 10 },
  conditionChip: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border + '40', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  conditionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  conditionChipText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  conditionChipTextActive: { color: '#FFF' },
  notesSection: { gap: 12, marginTop: 24 },
  notesInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border + '40', borderRadius: 12, padding: 12, fontSize: 14, color: colors.foreground, textAlignVertical: 'top', minHeight: 100 },
  photoArea: { height: 160, borderRadius: 24, borderWidth: 2, borderColor: colors.border + '40', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel, gap: 8, overflow: 'hidden' },
  photoAreaActive: { borderColor: colors.success, borderStyle: 'solid', backgroundColor: colors.success + '05' },
  photoAreaScanning: { borderColor: colors.primary, borderStyle: 'solid', backgroundColor: colors.primary + '05' },
  photoPreview: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', paddingHorizontal: 20 },
  successBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  extractedInfo: { flex: 1 },
  extractedLabel: { fontSize: 10, fontWeight: '800', color: colors.mutedForeground, letterSpacing: 1 },
  extractedValue: { fontSize: 20, fontWeight: '800', color: colors.foreground },
  rescanBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.panel },
  rescanText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  scanningLayer: { alignItems: 'center', gap: 12 },
  scanningText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  scanLine: { position: 'absolute', top: -50, left: -100, right: -100, height: 2, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  photoText: { fontSize: 14, color: colors.mutedForeground, fontWeight: '700' },
  photoSubtext: { fontSize: 11, color: colors.mutedForeground + '80', fontWeight: '500' },
  submitBtn: { height: 56, borderRadius: 16 },
  historySection: { marginTop: 32 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  historyTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border + '20' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyStatIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  historyDate: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  historyId: { fontSize: 11, color: colors.mutedForeground },
  historyValue: { fontSize: 15, fontWeight: '800', color: colors.foreground },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  successCard: { alignItems: 'center', gap: 16 },
  successIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.foreground },
  successDesc: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center', lineHeight: 22 }});

