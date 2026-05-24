import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Eraser, PenLine, Pause, User, ShieldCheck, FileText } from 'lucide-react-native';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import { Button } from '@/components/ui/Button';
import { SignaturePad, type SignaturePadRef } from '@/components/ui/SignaturePad';
import { saveWorkOrderSignatures } from '@/lib/signatureStorage';

export default function SignatureScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [techSigned, setTechSigned] = useState(false);
  const [custSigned, setCustSigned] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [techNote, setTechNote] = useState('');
  
  // Use keys to force-clear pads
  const [techKey, setTechKey] = useState(0);
  const [custKey, setCustKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const techPadRef = useRef<SignaturePadRef>(null);
  const custPadRef = useRef<SignaturePadRef>(null);
  const padWidth = Dimensions.get('window').width - 64;
  const padHeight = 160;

  const canSubmit = techSigned && custSigned;

  const handleClearTech = () => {
    techPadRef.current?.clear();
    setTechKey(k => k + 1);
    setTechSigned(false);
  };

  const handleClearCust = () => {
    custPadRef.current?.clear();
    setCustKey(k => k + 1);
    setCustSigned(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;

    setSaving(true);
    try {
      const techPaths = techPadRef.current?.getPaths() ?? [];
      const custPaths = custPadRef.current?.getPaths() ?? [];

      if (techPaths.length === 0 || custPaths.length === 0) {
        Alert.alert('Signatures Required', 'Please sign in both fields before submitting.');
        return;
      }

      await saveWorkOrderSignatures(id, techPaths, custPaths, padWidth, padHeight);
      navigation.navigate('WorkOrderDetails', { id, stepCompleted: 'signature' });
    } catch (err) {
      console.error('Signature save error:', err);
      Alert.alert('Save Failed', 'Could not save signatures. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>Digital Sign-off</Text>
          <Text style={styles.subtitle}>Work Order: {id}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('WorkOrderDetails', { id, holdWork: true } as any)} 
          style={styles.holdButton}
        >
          <Pause size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructions}>
          Please provide a brief note and both technician and customer signatures to finalize the work order completion.
        </Text>

        {/* Technician Note Section */}
        <View style={styles.sectionHeader}>
           <FileText size={16} color={colors.primary} />
           <Text style={styles.sectionTitle}>Technician Notes</Text>
        </View>
        <View style={styles.noteInputContainer}>
           <TextInput 
              style={styles.noteInput}
              placeholder="Enter any final remarks or observations..."
              placeholderTextColor={colors.mutedForeground}
              value={techNote}
              onChangeText={setTechNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
           />
        </View>

        <View style={styles.divider} />

        {/* Technician Signature Section */}
        <View style={styles.sectionHeader}>
           <ShieldCheck size={16} color={colors.primary} />
           <Text style={styles.sectionTitle}>Technician Signature</Text>
        </View>
        <View style={styles.canvasWrapper}>
          <View style={[styles.canvas, techSigned && styles.canvasSigned]}>
            <SignaturePad 
              ref={techPadRef}
              key={`tech-${techKey}`}
              onSignatureChange={setTechSigned}
              height={padHeight}
              width={padWidth}
            />
          </View>
          
          {techSigned && (
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={handleClearTech} style={styles.clearBtn}>
                <Eraser size={14} color={colors.destructive} />
                <Text style={styles.clearText}>Clear Signature</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Customer Signature Section */}
        <View style={styles.sectionHeader}>
           <User size={16} color={colors.primary} />
           <Text style={styles.sectionTitle}>Customer Signature</Text>
        </View>

        <View style={styles.nameInputContainer}>
           <Text style={styles.inputLabel}>Customer Name</Text>
           <TextInput 
              style={styles.nameInput}
              placeholder="Enter customer name..."
              placeholderTextColor={colors.mutedForeground}
              value={customerName}
              onChangeText={setCustomerName}
           />
        </View>

        <View style={styles.canvasWrapper}>
          <View style={[styles.canvas, custSigned && styles.canvasSigned]}>
            <SignaturePad 
              ref={custPadRef}
              key={`cust-${custKey}`}
              onSignatureChange={setCustSigned}
              height={padHeight}
              width={padWidth}
            />
          </View>
          
          {custSigned && (
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={handleClearCust} style={styles.clearBtn}>
                <Eraser size={14} color={colors.destructive} />
                <Text style={styles.clearText}>Clear Signature</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.scrollableFooter}>
          <Button 
            title={saving ? 'Saving...' : 'Sign & Complete'} 
            disabled={!canSubmit || saving}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
          {saving && <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: { alignItems: 'center' },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  instructions: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  canvasWrapper: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: colors.muted + '20',
  },
  canvas: {
    height: 160,
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.muted + '30',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasSigned: {
    borderStyle: 'solid',
    borderColor: colors.primary + '30',
    backgroundColor: colors.primary + '08',
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholder: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  mockSignature: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cursive: {
    fontSize: 28,
    color: colors.foreground,
    transform: [{ rotate: '-4deg' }],
    marginTop: -15,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.destructive + '15',
  },
  clearText: {
    color: colors.destructive,
    fontSize: 11,
    fontWeight: '700',
  },
  nameInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: colors.card,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteInputContainer: {
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: colors.card,
    minHeight: 120,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 32,
    opacity: 0.5,
  },
  scrollableFooter: {
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
  },
});

