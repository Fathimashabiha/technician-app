import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TextInput, Platform,
  Alert, Dimensions, Animated as RNAnimated, StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, 
  ChevronRight, Camera, Info, 
  ArrowLeft, ListChecks, PlusCircle,
  Check, X, Flag, Hammer,
  ClipboardList, Clock, PenTool,
  RotateCcw, ShieldCheck, FileText, User
} from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import { SignaturePad } from '@/components/ui/SignaturePad';
import Animated, { FadeInUp, FadeInRight, Layout, FadeInDown } from 'react-native-reanimated';
import { workOrders, checklistItems as initialChecklist } from '@/data/mockData';

type Inspection = typeof workOrders[0];
type InspectionState = 'list' | 'form' | 'summary' | 'signature';

const { width } = Dimensions.get('window');

export default function InspectionsScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const [viewState, setViewState] = useState<InspectionState>(route?.params?.woId ? 'form' : 'list');
  const [activeIns, setActiveIns] = useState<Inspection | null>(
    route?.params?.woId ? workOrders.find(w => w.id === route.params.woId) || null : null
  );
  const [checklist, setChecklist] = useState(initialChecklist);
  const [isFinishing, setIsFinishing] = useState(false);
  const [techSigned, setTechSigned] = useState(false);
  const [custSigned, setCustSigned] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [techNote, setTechNote] = useState('');
  const [techKey, setTechKey] = useState(0);
  const [custKey, setCustKey] = useState(0);

  const inspectionsList = workOrders.filter(w => w.type === 'Inspection');

  // Template Filtering Logic
  const getCategorizedChecklist = (title: string) => {
    if (title.includes('Fire')) return initialChecklist.filter(i => i.section.includes('Safety') || i.section.includes('Pre-Inspection'));
    if (title.includes('HVAC')) return initialChecklist.filter(i => i.section.includes('Coil') || i.section.includes('Filter'));
    return initialChecklist;
  };

  const currentChecklist = activeIns ? getCategorizedChecklist(activeIns.title) : [];
  const completedCount = checklist.filter(i => i.status && currentChecklist.some(c => c.id === i.id)).length;
  const progress = currentChecklist.length > 0 ? completedCount / currentChecklist.length : 0;
  
  const results = {
    pass: checklist.filter(i => i.status === 'pass' && currentChecklist.some(c => c.id === i.id)).length,
    fail: checklist.filter(i => i.status === 'fail' && currentChecklist.some(c => c.id === i.id)).length,
    flag: checklist.filter(i => i.status === 'flag' && currentChecklist.some(c => c.id === i.id)).length,
  };

  const handleStatusChange = (id: string, status: 'pass' | 'flag' | 'fail') => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
  };

  const handleFinish = () => {
    setIsFinishing(true);
    setTimeout(() => {
      setIsFinishing(false);
      if (route?.params?.woId) {
        handleComplete();
      } else {
        setViewState('summary');
      }
    }, 1000);
  };

  const handleComplete = () => {
    if (route?.params?.woId) {
      // Return to WorkOrder workflow
      navigation.navigate('Maintenance', { 
        screen: 'WorkOrderDetails', 
        params: { 
          id: route.params.woId,
          stepCompleted: 'checklist',
          checklistResult: (results.fail > 0 || results.flag > 0) ? 'fail' : 'pass'
        } 
      });
    } else {
      setViewState('list');
      setActiveIns(null);
      setChecklist(initialChecklist); // Reset for next time
      Alert.alert('Finalized', 'Inspection report and Corrective WOs have been synchronized.');
    }
  };

  const sections = Array.from(new Set(currentChecklist.map(i => i.section)));

  if (activeIns && viewState === 'form') {
    return (
      <View style={[styles.container, { backgroundColor: colors.navy }]}>
        <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
        <View style={[styles.detailHeader, { paddingTop: insets.top + 8 }]}>
           <TouchableOpacity onPress={() => setViewState('list')} style={styles.backBtn}>
              <ArrowLeft size={20} color="#FFF" />
           </TouchableOpacity>
           <View style={styles.headerTitleArea}>
              <Text style={styles.headerTitleDark}>{activeIns.title}</Text>
              <Text style={styles.headerSubDark}>{activeIns.location}</Text>
           </View>
           <View style={styles.progressCircle}>
              <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
           </View>
        </View>

        <View style={styles.progressBarContainer}>
           <View style={[styles.progressBarFull, { width: `${progress * 100}%` }]} />
        </View>
        <View style={{ flex: 1, backgroundColor: colors.background }}>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {sections.map(section => (
            <View key={section} style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{section}</Text>
              {currentChecklist.filter(i => i.section === section).map(item => {
                 const currentItem = checklist.find(c => c.id === item.id) || item;
                 return (
                  <Animated.View key={item.id} layout={Layout.springify()}>
                    <Card style={[styles.itemCard, currentItem.status === 'fail' && styles.itemCardFail] as any}>
                      <Text style={styles.itemTitle}>{item.item}</Text>
                      
                      <View style={styles.controlsRow}>
                        <TouchableOpacity 
                          onPress={() => handleStatusChange(item.id, 'pass')}
                          style={[styles.controlBtn, currentItem.status === 'pass' && styles.passActive]}
                        >
                          <Check size={16} color={currentItem.status === 'pass' ? '#FFF' : colors.mutedForeground} />
                          <Text style={[styles.controlBtnText, currentItem.status === 'pass' && styles.whiteText]}>Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                           onPress={() => handleStatusChange(item.id, 'flag')}
                           style={[styles.controlBtn, currentItem.status === 'flag' && styles.flagActive]}
                        >
                          <Flag size={14} color={currentItem.status === 'flag' ? '#FFF' : colors.mutedForeground} />
                          <Text style={[styles.controlBtnText, currentItem.status === 'flag' && styles.whiteText]}>Flag</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                           onPress={() => handleStatusChange(item.id, 'fail')}
                           style={[styles.controlBtn, currentItem.status === 'fail' && styles.failActive]}
                        >
                          <X size={16} color={currentItem.status === 'fail' ? '#FFF' : colors.mutedForeground} />
                          <Text style={[styles.controlBtnText, currentItem.status === 'fail' && styles.whiteText]}>Fail</Text>
                        </TouchableOpacity>
                      </View>

                      {(currentItem.status === 'fail' || currentItem.status === 'flag') && (
                        <Animated.View entering={FadeInUp} style={styles.findingsArea}>
                           <View style={styles.findingsHeader}>
                              <Info size={12} color={currentItem.status === 'fail' ? colors.destructive : colors.warning} />
                              <Text style={styles.findingsLabel}>Record Findings</Text>
                           </View>
                           <TextInput
                              placeholder="Add observation details..."
                              style={styles.findingsInput}
                              multiline
                           />
                           <View style={styles.findingsActions}>
                              <TouchableOpacity style={styles.photoBtnSmall}>
                                 <Camera size={14} color={colors.primary} />
                                 <Text style={styles.photoBtnText}>Evidence</Text>
                              </TouchableOpacity>
                              {currentItem.status === 'fail' && (
                                 <View style={styles.autoWOBadge}>
                                    <Hammer size={12} color={colors.destructive} />
                                    <Text style={styles.autoWOText}>Auto-WO Triggered</Text>
                                 </View>
                              )}
                           </View>
                        </Animated.View>
                      )}
                    </Card>
                  </Animated.View>
                );
              })}
            </View>
          ))}

          <Button 
            title={isFinishing ? "Syncing..." : ((results.fail > 0 || results.flag > 0) ? "Submit Failure" : "Finish Inspection")} 
            variant={(results.fail > 0 || results.flag > 0) ? "destructive" : "default"} 
            onPress={handleFinish}
            loading={isFinishing}
            style={styles.finishBtn}
            disabled={completedCount < currentChecklist.length}
          />
        </ScrollView>
        </View>
      </View>
    );
  }

  if (activeIns && viewState === 'summary') {
    return (
      <View style={styles.container}>
         <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
         <PageHeader title="Inspection Summary" showBack onBack={() => setViewState('form')} backgroundColor={colors.navy} textColor="#FFF" />
         <View style={{ flex: 1, backgroundColor: colors.background }}>
         <ScrollView contentContainerStyle={styles.scrollContent}>
            <Card style={styles.statSummaryCard}>
               <View style={styles.statMainRow}>
                  <View style={styles.statBox}>
                     <Text style={styles.statNum}>{results.pass}</Text>
                     <Text style={styles.statLab}>Passed</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statBox}>
                     <Text style={[styles.statNum, { color: colors.warning }]}>{results.flag}</Text>
                     <Text style={styles.statLab}>Flagged</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statBox}>
                     <Text style={[styles.statNum, { color: colors.destructive }]}>{results.fail}</Text>
                     <Text style={styles.statLab}>Failed</Text>
                  </View>
               </View>
            </Card>

            <Text style={styles.summaryTitle}>Corrective Actions Required</Text>
            {results.fail > 0 ? (
               <View style={styles.failList}>
                  {checklist.filter(i => i.status === 'fail' && currentChecklist.some(c => c.id === i.id)).map(item => (
                     <Card key={item.id} style={styles.failCard}>
                        <View style={styles.failIndicator} />
                        <View style={styles.failContent}>
                           <Text style={styles.failItemTitle}>{item.item}</Text>
                           <View style={styles.woDraftBadge}>
                              <FileText size={12} color={colors.primary} />
                              <Text style={styles.woDraftText}>New Work Order Drafted</Text>
                           </View>
                        </View>
                     </Card>
                  ))}
               </View>
            ) : (
               <View style={styles.allClearCard}>
                  <ShieldCheck size={40} color={colors.success} />
                  <Text style={styles.allClearText}>All items passed inspection.</Text>
               </View>
            )}

            <Button 
               title="Proceed to Sign-off" 
               variant="accent" 
               onPress={() => setViewState('signature')}
               style={styles.summaryBtn}
            />
         </ScrollView>
         </View>
      </View>
    );
  }

  if (activeIns && viewState === 'signature') {
    return (
      <View style={styles.container}>
         <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
         <PageHeader title="Final Sign-off" showBack onBack={() => setViewState('summary')} backgroundColor={colors.navy} textColor="#FFF" />
         
         <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.instructionsText}>
               Please provide any final remarks and sign off below to finalize this inspection.
            </Text>

            {/* Technician Note Section */}
            <View style={styles.signSectionHeader}>
               <FileText size={18} color={colors.primary} />
               <Text style={styles.signSectionTitle}>Technician Notes</Text>
            </View>
            <View style={styles.customerInputArea}>
               <TextInput 
                  style={styles.customerTextInput}
                  placeholder="Enter inspection remarks/notes..."
                  placeholderTextColor={colors.mutedForeground}
                  value={techNote}
                  onChangeText={setTechNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
               />
            </View>

            <View style={styles.signDivider} />

            {/* Technician Section */}
            <View style={styles.signSectionHeader}>
               <ShieldCheck size={18} color={colors.primary} />
               <Text style={styles.signSectionTitle}>Technician Sign-off</Text>
            </View>
            <View style={[styles.signPad, techSigned && styles.signPadSigned]}>
               <SignaturePad 
                  key={`ins-tech-${techKey}`}
                  onSignatureChange={setTechSigned}
                  height={150}
               />
               {techSigned && (
                  <TouchableOpacity style={styles.clearSignBtn} onPress={() => { setTechKey(k => k + 1); setTechSigned(false); }}>
                     <RotateCcw size={12} color={colors.destructive} />
                     <Text style={styles.clearSignText}>Clear</Text>
                  </TouchableOpacity>
               )}
            </View>

            <View style={styles.signDivider} />

            {/* Customer Section */}
            <View style={styles.signSectionHeader}>
               <User size={18} color={colors.primary} />
               <Text style={styles.signSectionTitle}>Customer Sign-off</Text>
            </View>
            
            <View style={styles.customerInputArea}>
               <Text style={styles.customerInputLabel}>Customer Name</Text>
               <TextInput 
                  style={styles.customerTextInput}
                  placeholder="Enter name..."
                  placeholderTextColor={colors.mutedForeground}
                  value={customerName}
                  onChangeText={setCustomerName}
               />
            </View>

            <View style={[styles.signPad, custSigned && styles.signPadSigned]}>
               <SignaturePad 
                  key={`ins-cust-${custKey}`}
                  onSignatureChange={setCustSigned}
                  height={150}
               />
               {custSigned && (
                  <TouchableOpacity style={styles.clearSignBtn} onPress={() => { setCustKey(k => k + 1); setCustSigned(false); }}>
                     <RotateCcw size={12} color={colors.destructive} />
                     <Text style={styles.clearSignText}>Clear</Text>
                  </TouchableOpacity>
               )}
            </View>

            <View style={{ height: 40 }} />

            <Button 
               title="Certify & Complete" 
               variant="accent" 
               onPress={handleComplete}
               disabled={!techSigned || !custSigned}
               style={styles.finalSubmitBtn}
            />
            <View style={{ height: 20 }} />
         </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
      <PageHeader 
        title="Inspections" 
        showBack
        rightElement={
           <TouchableOpacity style={styles.historyBtn}>
              <ClipboardList size={20} color="#FFF" />
           </TouchableOpacity>
        }
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {inspectionsList.map((ins: Inspection, i: number) => (
            <Animated.View key={ins.id} entering={FadeInUp.delay(i * 30)}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Maintenance', { screen: 'WorkOrderDetails', params: { id: ins.id } })}
                style={styles.woCard}
                activeOpacity={0.7}
              >
                <View style={styles.woHeader}>
                  <View style={styles.woBadges}>
                    <StatusBadge status={ins.type} />
                    <StatusBadge status={ins.priority} />
                  </View>
                  <Text style={styles.dueDate}>{ins.dueDate}</Text>
                </View>

                <Text style={styles.woTitle}>{ins.title}</Text>
                <Text style={styles.woDesc} numberOfLines={1}>{ins.description}</Text>

                <View style={styles.woFooter}>
                  <Text style={styles.woDetails}>
                    {ins.assetName} • {ins.location}
                  </Text>
                  <View style={styles.woFooterRight}>
                    <StatusBadge status={ins.status} />
                    <ChevronRight size={14} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  list: { gap: 12 },
  woCard: { backgroundColor: colors.card, borderRadius: 24, padding: 16, ...SHADOWS.card },
  woHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  woBadges: { flexDirection: 'row', gap: 6 },
  dueDate: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },
  woTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  woDesc: { fontSize: 12, color: colors.mutedForeground, marginBottom: 12 },
  woFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border + '26', paddingTop: 12 },
  woDetails: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500' },
  woFooterRight: { flexDirection: 'row', alignItems: 'center' },
  historyBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, backgroundColor: colors.navy, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitleArea: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  headerSub: { fontSize: 12, color: colors.mutedForeground },
  headerTitleDark: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerSubDark: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  progressCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  progressBarContainer: { height: 4, backgroundColor: colors.panel, width: '100%' },
  progressBarFull: { height: '100%', backgroundColor: colors.primary },
  sectionBlock: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  itemCard: { padding: 16, marginBottom: 12, borderRadius: 18 },
  itemCardFail: { borderColor: colors.destructive + '40', borderWidth: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 16, lineHeight: 20 },
  controlsRow: { flexDirection: 'row', gap: 8 },
  controlBtn: { flex: 1, height: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.panel },
  controlBtnText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  passActive: { backgroundColor: '#10B981' },
  flagActive: { backgroundColor: '#F59E0B' },
  failActive: { backgroundColor: '#EF4444' },
  whiteText: { color: '#FFF' },
  findingsArea: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border + '26' },
  findingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  findingsLabel: { fontSize: 11, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase' },
  findingsInput: { backgroundColor: colors.background, borderRadius: 12, padding: 12, fontSize: 13, minHeight: 60, color: colors.foreground, textAlignVertical: 'top' },
  findingsActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  photoBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  photoBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  autoWOBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.destructive + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  autoWOText: { fontSize: 10, fontWeight: '700', color: colors.destructive },
  finishBtn: { marginTop: 12, marginBottom: 40, height: 56, borderRadius: 16 },
  statSummaryCard: { padding: 24, borderRadius: 24, marginBottom: 24 },
  statMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 28, fontWeight: '800', color: colors.primary },
  statLab: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase', marginTop: 4 },
  divider: { width: 1, height: 30, backgroundColor: colors.border + '30' },
  summaryTitle: { fontSize: 12, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  failList: { gap: 12, marginBottom: 32 },
  failCard: { flexDirection: 'row', padding: 16, borderRadius: 16, overflow: 'hidden' },
  failIndicator: { width: 4, backgroundColor: colors.destructive, borderRadius: 2, marginRight: 16 },
  failContent: { flex: 1, gap: 6 },
  failItemTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  woDraftBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '10', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  woDraftText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  allClearCard: { padding: 40, alignItems: 'center', gap: 16, backgroundColor: colors.card, borderRadius: 24, marginBottom: 32 },
  allClearText: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
  summaryBtn: { height: 56, borderRadius: 16, marginBottom: 40 },
  signatureContainer: { flex: 1, padding: 24 },
  signLabel: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
  signPad: { height: 200, backgroundColor: colors.card, borderRadius: 24, borderWidth: 2, borderColor: colors.border + '20', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12 },
  signHint: { fontSize: 14, color: colors.mutedForeground, opacity: 0.5 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', padding: 16 },
  clearText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  technicianBox: { marginTop: 'auto', backgroundColor: colors.card, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20' },
  techName: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  techId: { fontSize: 11, color: colors.mutedForeground },
  finalSubmitBtn: { height: 56, borderRadius: 16, marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  instructionsText: { fontSize: 14, color: colors.mutedForeground, lineHeight: 22, marginBottom: 24 },
  signSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  signSectionTitle: { fontSize: 14, fontWeight: '800', color: colors.foreground, textTransform: 'uppercase', letterSpacing: 0.5 },
  signPadSigned: { borderStyle: 'solid', borderColor: colors.primary + '30', backgroundColor: colors.primary + '08' },
  signTouchArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  mockSignContent: { alignItems: 'center', justifyContent: 'center' },
  cursiveText: { fontSize: 28, color: colors.foreground, transform: [{ rotate: '-4deg' }], marginTop: -15, fontWeight: '300', fontStyle: 'italic' },
  signHintRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signHintText: { fontSize: 14, color: colors.mutedForeground, fontWeight: '500' },
  clearSignBtn: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.destructive + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  clearSignText: { color: colors.destructive, fontSize: 10, fontWeight: '700' },
  signDivider: { height: 1, backgroundColor: colors.border, marginVertical: 32, opacity: 0.5 },
  customerInputArea: { marginBottom: 16 },
  customerInputLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground, marginBottom: 8, textTransform: 'uppercase' },
  customerTextInput: { backgroundColor: colors.card, height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: colors.foreground, borderWidth: 1, borderColor: colors.border },
  subviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  checkCard: { padding: 16, marginBottom: 8 },
  checkMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkItemText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  checkItemType: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  checkActions: { flexDirection: 'row', gap: 8 },
  miniBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
});