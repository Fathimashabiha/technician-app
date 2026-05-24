import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  ArrowLeft, Scan, MapPin, Camera, Mic, Check, X, 
  ArrowRight, Building2, Info, LayoutList, ClipboardList,
  ChevronRight, Building, Layers
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, useTheme } from '@/app/constants/theme';
import { Card } from '@/components/ui/Card';
import Animated, { 
  FadeInUp, 
  FadeInDown,
  Layout,
  FadeIn
} from 'react-native-reanimated';

export default function CreateWorkOrderScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors, shadows, isDark);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Scope Selection
  const [scope, setScope] = useState<'asset' | 'location'>('asset');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState('Reactive');
  const [issueCategory, setIssueCategory] = useState('Mechanical');
  
  // Location Mode Specifics
  const [selectedProperty, setSelectedProperty] = useState('Select Property');
  const [selectedBuilding, setSelectedBuilding] = useState('Select Building');
  const [selectedFloor, setSelectedFloor] = useState('Select Floor/Area');
  
  // Dropdown UI state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Asset Mode Specifics (Simulated)
  const [isScanned, setIsScanned] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [property, setProperty] = useState('');
  const [location, setLocation] = useState('');

  // Attachments
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);

  const simulateScan = () => {
    setIsScanned(true);
    setAssetName('CHILLER-ROOM-CH01');
    setProperty('Burj Khalifa Tower');
    setLocation('Basement 2, Zone C');
  };

  const handleSubmit = () => {
    navigation.goBack();
  };

  const renderDropdownModal = () => {
    if (!activeDropdown) return null;

    let modalTitle = "";
    let options: string[] = [];
    let currentVal = "";
    let setter: (val: string) => void = () => {};
    let iconColor = colors.primary;

    switch(activeDropdown) {
      case 'type':
        modalTitle = "Work Order Type";
        options = ['Reactive', 'Breakdown', 'Service Request'];
        currentVal = workType;
        setter = setWorkType;
        break;
      case 'category':
        modalTitle = "Issue Category";
        options = ['Mechanical', 'Electrical', 'Plumbing', 'HVAC', 'General', 'Civil', 'Security'];
        currentVal = issueCategory;
        setter = setIssueCategory;
        iconColor = colors.secondary;
        break;
      case 'property':
        modalTitle = "Select Property";
        options = ['Burj Khalifa', 'Dubai Mall', 'Marina Heights', 'Palm Jumeirah'];
        currentVal = selectedProperty;
        setter = setSelectedProperty;
        break;
      case 'building':
        modalTitle = "Select Building";
        options = ['Tower A', 'Tower B', 'Annex 1', 'Main Hall'];
        currentVal = selectedBuilding;
        setter = setSelectedBuilding;
        break;
      case 'floor':
        modalTitle = "Select Floor / Area";
        options = ['Basement 1', 'Ground Floor', 'Level 10', 'Rooftop', 'Parking Z2'];
        currentVal = selectedFloor;
        setter = setSelectedFloor;
        break;
    }

    return (
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setActiveDropdown(null)} />
        <Animated.View entering={FadeInDown} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={() => setActiveDropdown(null)}><X size={20} color={colors.foreground} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.5 }}>
            {options.map(opt => (
              <TouchableOpacity 
                key={opt} 
                style={styles.modalItem}
                onPress={() => { setter(opt); setActiveDropdown(null); }}
              >
                <Text style={[styles.modalItemText, currentVal === opt && { color: iconColor }]}>{opt}</Text>
                {currentVal === opt && <Check size={18} color={iconColor} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header (Fixed) */}
      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={18} color={isDark ? "#FFF" : colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>New Work Order</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} // Extra padding to clear tab bar
        >
          
          {/* 1. Scope Selection Toggle */}
          <View style={styles.scopeToggleContainer}>
             <TouchableOpacity 
              style={[styles.scopeBtn, scope === 'asset' && styles.scopeBtnActive]} 
              onPress={() => setScope('asset')}
             >
               <Scan size={16} color={scope === 'asset' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
               <Text style={[styles.scopeBtnText, scope === 'asset' && { color: colors.foreground }]}>Asset</Text>
             </TouchableOpacity>
             <TouchableOpacity 
              style={[styles.scopeBtn, scope === 'location' && styles.scopeBtnActive]}
              onPress={() => setScope('location')}
             >
               <MapPin size={16} color={scope === 'location' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
               <Text style={[styles.scopeBtnText, scope === 'location' && { color: colors.foreground }]}>Location</Text>
             </TouchableOpacity>
          </View>

          {/* 2. Title Section */}
          <Animated.View entering={FadeInUp.delay(50)} style={styles.section}>
             <Card style={styles.fieldCard}>
                <Text style={styles.innerLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Brief title..."
                  placeholderTextColor={colors.mutedForeground}
                  value={title}
                  onChangeText={setTitle}
                />
             </Card>
          </Animated.View>

          {/* 3. Description Section */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
             <Card style={styles.fieldCard}>
                <Text style={styles.innerLabel}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  placeholder="Details..."
                  placeholderTextColor={colors.mutedForeground}
                  value={description}
                  onChangeText={setDescription}
                />
             </Card>
          </Animated.View>

          {/* 4. Type & Category Dropdowns */}
          <View style={[styles.row, { marginBottom: 16 }]}>
             <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Type</Text>
                <TouchableOpacity style={styles.dropdownField} onPress={() => setActiveDropdown('type')}>
                  <Text style={styles.dropdownValue} numberOfLines={1}>{workType}</Text>
                  <ChevronRight size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Category</Text>
                <TouchableOpacity style={styles.dropdownField} onPress={() => setActiveDropdown('category')}>
                  <Text style={[styles.dropdownValue, { color: colors.secondary }]} numberOfLines={1}>{issueCategory}</Text>
                  <ChevronRight size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
             </View>
          </View>

          {/* 5. Scope-Dependent Section */}
          {scope === 'asset' ? (
            <Animated.View entering={FadeIn} key="asset-scope" style={styles.scopeSection}>
               <View style={styles.sectionHeader}>
                 <Scan size={16} color={colors.primary} />
                 <Text style={styles.sectionLabel}>Scan Asset Reference</Text>
               </View>
               <TouchableOpacity 
                 style={[styles.scanTrigger, isScanned && styles.scanTriggerSuccess]}
                 onPress={simulateScan}
               >
                  <LinearGradient
                    colors={isScanned ? ['#10B981', '#059669'] : ['rgba(59, 130, 246, 0.2)', isDark ? "rgba(59, 130, 246, 0.1)" : colors.primary + "1A"]}
                    style={styles.scanGradient}
                  >
                     <Scan size={20} color={isScanned ? '#FFF' : colors.primary} />
                     <Text style={[styles.scanText, isScanned && { color: colors.foreground }]}>
                       {isScanned ? 'Asset Identified' : 'Tap to Scan'}
                     </Text>
                  </LinearGradient>
               </TouchableOpacity>

               {isScanned && (
                 <Animated.View entering={FadeInUp} style={styles.autoDataGrid}>
                    <View style={styles.dataNode}>
                       <Text style={styles.dataLabel}>Asset</Text>
                       <Text style={styles.dataValue} numberOfLines={1}>{assetName}</Text>
                    </View>
                    <View style={styles.dataNode}>
                       <Text style={styles.dataLabel}>Loc</Text>
                       <Text style={styles.dataValue} numberOfLines={1}>{location}</Text>
                    </View>
                 </Animated.View>
               )}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} key="location-scope" style={styles.scopeSection}>
               <View style={styles.manualLocationGrid}>
                  <TouchableOpacity style={styles.manualField} onPress={() => setActiveDropdown('property')}>
                     <Building2 size={16} color={colors.primary} />
                     <Text style={styles.manualText} numberOfLines={1}>{selectedProperty}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.manualField} onPress={() => setActiveDropdown('building')}>
                     <Building size={16} color={colors.secondary} />
                     <Text style={styles.manualText} numberOfLines={1}>{selectedBuilding}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.manualField, { flexBasis: '100%' }]} onPress={() => setActiveDropdown('floor')}>
                     <Layers size={16} color="#EF4444" />
                     <Text style={styles.manualText} numberOfLines={1}>{selectedFloor}</Text>
                  </TouchableOpacity>
               </View>
            </Animated.View>
          )}

          {/* 6. Attachments */}
          <View style={[styles.section, { marginBottom: 32 }]}>
             <View style={styles.mediaRow}>
                <TouchableOpacity 
                  style={[styles.mediaSlot, hasPhoto && styles.mediaSlotActive]}
                  onPress={() => setHasPhoto(!hasPhoto)}
                >
                   <Camera size={18} color={hasPhoto ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                   <Text style={[styles.mediaText, hasPhoto && { color: colors.foreground }]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mediaSlot, hasVoice && styles.mediaSlotActive]}
                  onPress={() => setHasVoice(!hasVoice)}
                >
                   <Mic size={18} color={hasVoice ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                   <Text style={[styles.mediaText, hasVoice && { color: colors.foreground }]}>Voice</Text>
                </TouchableOpacity>
             </View>
          </View>

          {/* Footer - Now part of the ScrollView to guarantee reachability */}
          <View style={styles.footerInner}>
            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.9}
            >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                   <Check size={20} color="#FFF" />
                   <Text style={styles.submitText}>Submit for Approval</Text>
                </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {renderDropdownModal()}
    </View>
  );
}

const getStyles = (colors: any, shadows: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  content: { flex: 1, paddingHorizontal: 16 },
  
  // Scope Toggle
  scopeToggleContainer: {
     flexDirection: 'row',
     backgroundColor: colors.panel,
     padding: 3,
     borderRadius: 12,
     marginBottom: 16,
  },
  scopeBtn: {
     flex: 1,
     flexDirection: 'row',
     height: 36,
     alignItems: 'center',
     justifyContent: 'center',
     borderRadius: 10,
     gap: 6,
  },
  scopeBtnActive: {
     backgroundColor: colors.primary,
     ...shadows.card,
  },
  scopeBtnText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },

  // Sections
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  
  // Field Cards
  fieldCard: {
     backgroundColor: colors.panel,
     borderRadius: 16,
     padding: 12,
     borderWidth: 1,
     borderColor: colors.border,
  },
  innerLabel: { fontSize: 9, fontWeight: '800', color: colors.primary, marginBottom: 4, textTransform: 'uppercase' },
  textInput: { color: colors.foreground, fontSize: 15, fontWeight: '600', paddingVertical: 2 },
  textArea: { color: colors.foreground, fontSize: 14, fontWeight: '500', height: 60, textAlignVertical: 'top', paddingVertical: 2 },

  // Dropdowns
  dropdownField: {
    height: 44,
    backgroundColor: colors.panel,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownValue: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '700' },

  // Scope Specific
  scopeSection: {
     backgroundColor: colors.primary + "05",
     padding: 12,
     borderRadius: 20,
     marginBottom: 16,
     borderWidth: 1,
     borderColor: isDark ? "rgba(59, 130, 246, 0.1)" : colors.primary + "1A",
  },
  scanTrigger: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
  },
  scanTriggerSuccess: { borderStyle: 'solid', borderColor: '#10B981' },
  scanGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  scanText: { fontSize: 13, fontWeight: '800', color: colors.primary },

  autoDataGrid: {
     marginTop: 12,
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 6,
  },
  dataNode: {
     flex: 1,
     minWidth: '45%',
     backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : colors.primary + "1A",
     padding: 10,
     borderRadius: 10,
  },
  dataLabel: { fontSize: 8, fontWeight: '800', color: colors.primary, marginBottom: 2, textTransform: 'uppercase' },
  dataValue: { fontSize: 11, fontWeight: '700', color: colors.foreground },

  manualLocationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  manualField: {
     flex: 1,
     minWidth: '45%',
     height: 44,
     backgroundColor: colors.panel,
     borderRadius: 12,
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 10,
     gap: 8,
     borderWidth: 1,
     borderColor: colors.border,
  },
  manualText: { flex: 1, fontSize: 11, color: colors.foreground, fontWeight: '600' },

  // Media
  mediaRow: { flexDirection: 'row', gap: 10 },
  mediaSlot: {
     flex: 1,
     height: 52,
     borderRadius: 14,
     backgroundColor: colors.panel,
     alignItems: 'center',
     justifyContent: 'center',
     gap: 2,
     borderWidth: 1,
     borderColor: colors.border,
  },
  mediaSlotActive: { backgroundColor: colors.border, borderColor: colors.border },
  mediaText: { fontSize: 9, fontWeight: '700', color: colors.mutedForeground },

  // Modals
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 2000 },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.panel },
  modalItemText: { fontSize: 15, fontWeight: '600', color: colors.mutedForeground },

  // Footer (Inner)
  footerInner: {
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtn: { borderRadius: 20, overflow: 'hidden', ...shadows.card },
  submitGradient: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { color: "#FFF", fontSize: 17, fontWeight: '800' },
});
