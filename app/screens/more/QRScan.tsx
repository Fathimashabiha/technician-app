import React, { useState, useCallback } from 'react';
import AssetQrScanner from '@/components/media/AssetQrScanner';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ScanLine, Flashlight, History, Wrench, ClipboardList, FileText,
  CheckSquare, Barcode, MapPin, Calendar, AlertTriangle, ChevronRight,
  Play, Video, BookOpen, Package, ArrowLeft, X, Check, X as XIcon, Timer, 
  ShieldCheck, Clock, Zap, ChevronDown, Camera, CheckCircle2 as CheckCircleIcon
} from 'lucide-react-native';
import { assets, workOrders, checklistItems, manuals, inventoryItems } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS, GRADIENTS, SHADOWS, useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ViewMode = 'scanner' | 'result' | 'work-order' | 'create-issue' | 'manuals' | 'checklist';

export default function QRScanScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [scanned, setScanned] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');
  const [flashOn, setFlashOn] = useState(false);
  const [qrResolving, setQrResolving] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  
  // Checklist state
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, 'pass' | 'fail' | null>>({});
  
  // Create Issue state
  const [issueType, setIssueType] = useState('Breakdown');
  const [issueDesc, setIssueDesc] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const asset = assets[0];
  const assetWOs = workOrders.filter(w => w.assetId === asset.id);
  const assetManuals = manuals.filter(m => m.assetId === asset.id);
  const assetParts = inventoryItems.slice(0, 4);

  const scanHistory = [
    { id: 'AST-001', name: 'AHU-03', time: '10 min ago' },
    { id: 'AST-005', name: 'Pump P-12', time: '1h ago' },
    { id: 'AST-008', name: 'Elevator E-02', time: 'Yesterday' },
  ];

  const handleScanSuccess = useCallback((data: string) => {
    setQrResolving(true);
    setQrError(null);
    const found = assets.find(
      (a) =>
        a.id.toLowerCase() === data.toLowerCase() ||
        data.toLowerCase().includes(a.id.toLowerCase()),
    );
    setTimeout(() => {
      setQrResolving(false);
      if (found || data.trim()) {
        setScanned(true);
        setViewMode('result');
      } else {
        setQrError('Asset not found. Try manual entry or scan another code.');
      }
    }, 600);
  }, []);

  const handleScan = () => {
    handleScanSuccess(asset.id);
  };

  const handleBarcodeSubmit = () => {
    if (barcodeInput.trim()) {
      handleScanSuccess(barcodeInput.trim());
    }
  };

  const goBack = () => {
    if (viewMode === 'result') {
      setScanned(false);
      setViewMode('scanner');
    } else {
      setViewMode('result');
    }
  };

  const getHeaderProps = () => {
    switch (viewMode) {
      case 'result': return { title: 'Asset Details', showBack: true };
      case 'work-order': return { title: 'Work Order History', showBack: true };
      case 'create-issue': return { title: 'Report Issue', showBack: true };
      case 'manuals': return { title: 'Manuals & Documents', showBack: true };
      case 'checklist': return { title: 'Asset Checklist', showBack: true };
      default: return { title: 'QR / Barcode Scanner', showBack: true };
    }
  };

  const headerProps = getHeaderProps();

  const renderManuals = () => (
    <Animated.View entering={FadeInRight} style={styles.subview}>
      <Text style={styles.subviewSubtitle}>{asset.name} — {assetManuals.length} documents</Text>
      <View style={styles.manualsList}>
        {assetManuals.map((manual, i) => (
          <Card key={manual.id} style={styles.manualCard}>
            <View style={styles.manualInfo}>
              <View style={[styles.manualIcon, { backgroundColor: manual.type === 'PDF' ? colors.destructive + '1A' : colors.primary + '1A' }]}>
                {manual.type === 'PDF' ? <FileText size={18} color={colors.destructive} /> : <Video size={18} color={colors.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manualName}>{manual.title}</Text>
                <Text style={styles.manualMeta}>{manual.type} • {manual.size} • {manual.lastUpdated}</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
          </Card>
        ))}
      </View>
    </Animated.View>
  );

  const renderWorkOrders = () => {
    const activeWOs = assetWOs.filter(wo => wo.status !== 'Completed' && wo.status !== 'Closed' && wo.status !== 'Verified');
    const historicalWOs = assetWOs.filter(wo => wo.status === 'Completed' || wo.status === 'Closed' || wo.status === 'Verified');

    return (
      <Animated.View entering={FadeInRight} style={styles.subview}>
        <Text style={styles.subviewSubtitle}>Tasks associated with {asset.name}</Text>
        
        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
          {activeWOs.length > 0 && (
            <>
              <Text style={styles.historySectionTitle}>ACTIVE WORK ORDER</Text>
              {activeWOs.map((wo) => (
                <TouchableOpacity 
                  key={wo.id} 
                  style={[styles.historyCard, { borderLeftColor: colors.secondary }]}
                  onPress={() => (navigation as any).navigate('Maintenance', { screen: 'WorkOrderDetails', params: { id: wo.id } })}
                >
                  <View style={styles.historyCardHeader}>
                    <View style={styles.historyCardInfo}>
                      <Text style={styles.historyCardId}>{wo.id}</Text>
                      <Text style={styles.historyCardTitle}>{wo.title}</Text>
                    </View>
                    <StatusBadge status={wo.status} />
                  </View>
                  <View style={styles.historyCardFooter}>
                    <View style={styles.historyMetaRow}>
                      <Calendar size={12} color={colors.mutedForeground} />
                      <Text style={styles.historyMetaText}>{wo.dueDate}</Text>
                    </View>
                    <View style={styles.historyMetaRow}>
                      <MapPin size={12} color={colors.mutedForeground} />
                      <Text style={styles.historyMetaText}>{wo.location}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={styles.historySectionTitle}>PREVIOUS HISTORIES</Text>
          {historicalWOs.length > 0 ? (
            historicalWOs.map((wo) => (
              <TouchableOpacity 
                key={wo.id} 
                style={styles.historyCard}
                onPress={() => (navigation as any).navigate('Maintenance', { screen: 'WorkOrderDetails', params: { id: wo.id } })}
              >
                <View style={styles.historyCardHeader}>
                  <View style={styles.historyCardInfo}>
                    <Text style={styles.historyCardId}>{wo.id}</Text>
                    <Text style={styles.historyCardTitle}>{wo.title}</Text>
                  </View>
                  <StatusBadge status={wo.status} />
                </View>
                <View style={styles.historyCardFooter}>
                  <View style={styles.historyMetaRow}>
                    <Calendar size={12} color={colors.mutedForeground} />
                    <Text style={styles.historyMetaText}>{wo.dueDate}</Text>
                  </View>
                  <View style={styles.historyMetaRow}>
                    <MapPin size={12} color={colors.mutedForeground} />
                    <Text style={styles.historyMetaText}>{wo.location}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <History size={24} color={colors.mutedForeground + '80'} />
              <Text style={styles.emptyHistoryText}>No previous history found</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderChecklist = () => (
    <Animated.View entering={FadeInRight} style={styles.subview}>
      <View style={styles.subviewHeaderRow}>
        <View>
          <Text style={styles.subviewSubtitle}>{asset.name} — Quick Inspection</Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>{Math.round((Object.keys(checklistAnswers).length / checklistItems.length) * 100)}%</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
        {checklistItems.slice(0, 8).map((item, i) => {
          const ans = checklistAnswers[item.id];
          return (
            <Card key={item.id} style={styles.checkCard}>
              <View style={styles.checkMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkItemText}>{item.item}</Text>
                  <Text style={styles.checkItemType}>{item.section}</Text>
                </View>
                <View style={styles.checkActions}>
                  <TouchableOpacity 
                    onPress={() => setChecklistAnswers(p => ({ ...p, [item.id]: 'pass' }))}
                    style={[styles.miniBtn, ans === 'pass' && { backgroundColor: colors.success }]}
                  >
                    <Check size={14} color={ans === 'pass' ? '#FFF' : colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setChecklistAnswers(p => ({ ...p, [item.id]: 'fail' }))}
                    style={[styles.miniBtn, ans === 'fail' && { backgroundColor: colors.destructive }]}
                  >
                    <XIcon size={14} color={ans === 'fail' ? '#FFF' : colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <Button 
        title="Submit Inspection" 
        style={{ marginTop: 16 }}
        disabled={Object.keys(checklistAnswers).length === 0}
        onPress={() => {
           setScanned(false);
           setViewMode('scanner');
           setChecklistAnswers({});
        }}
      />
    </Animated.View>
  );

  const renderCreateIssue = () => (
    <Animated.View entering={FadeInRight} style={styles.subview}>
      <Text style={styles.subviewSubtitle}>Report a new finding for {asset.name}</Text>
      
      <Card style={styles.formCard}>
        {/* Step 1: Issue Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Issue Type</Text>
          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
          >
            <Text style={styles.dropdownValue}>{issueType}</Text>
            <ChevronDown size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          
          {isTypeDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {['Breakdown', 'Defect', 'Safety', 'Inspection Finding'].map(t => (
                <TouchableOpacity 
                  key={t} 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setIssueType(t);
                    setIsTypeDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, issueType === t && { color: colors.primary, fontWeight: '700' }]}>{t}</Text>
                  {issueType === t && <Check size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {/* Step 2: Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            multiline 
            placeholder="Describe the issue in detail..." 
            style={styles.textArea}
            placeholderTextColor={colors.mutedForeground}
            value={issueDesc}
            onChangeText={setIssueDesc}
          />
        </View>

        {/* Step 3: Photo Capture */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Evidence Photo</Text>
          <TouchableOpacity 
            style={[styles.photoTrigger, hasPhoto && styles.photoCaptured]}
            onPress={() => setHasPhoto(true)}
          >
            {hasPhoto ? (
              <View style={styles.photoOverlay}>
                <CheckCircleIcon size={20} color={colors.success} />
                <Text style={styles.photoStatusText}>Photo Captured</Text>
                <TouchableOpacity onPress={() => setHasPhoto(false)} style={styles.retakeBtn}>
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={24} color={colors.mutedForeground} />
                <Text style={styles.photoPlaceholderText}>Click to Take Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Step 4: Submit */}
        <Button 
          onPress={() => {
            setSubmitting(true);
            setTimeout(() => {
              setSubmitting(false);
              setScanned(false);
              setViewMode('scanner');
              setIssueType('Breakdown');
              setIssueDesc('');
              setHasPhoto(false);
            }, 1000);
          }} 
          title={submitting ? "Reporting..." : "Submit Issue Report"} 
          style={{ backgroundColor: colors.navy, marginTop: 12 }}
          textStyle={{ color: '#FFF' }}
          disabled={!issueDesc || !hasPhoto || submitting}
        />
      </Card>
    </Animated.View>
  );

  const renderResult = () => (
    <Animated.View entering={FadeInUp} style={styles.subview}>
      {/* Asset Info Card */}
      <Card variant="elevated" style={styles.assetCard}>
        <View style={styles.assetHeader}>
          <View>
            <Text style={styles.assetName}>{asset.name}</Text>
            <Text style={styles.assetType}>{asset.type} • {asset.id}</Text>
          </View>
          <StatusBadge status={asset.status} />
        </View>

        {/* Technical Specs Tab-like Grid */}
        <View style={styles.specsGrid}>
          <View style={styles.specItem}>
            <Barcode size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Serial Number</Text>
              <Text style={styles.specValue}>{asset.serialNumber}</Text>
            </View>
          </View>
          <View style={styles.specItem}>
            <MapPin size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Location</Text>
              <Text style={styles.specValue}>{asset.location}</Text>
            </View>
          </View>
          <View style={styles.specItem}>
            <Package size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Manufacturer</Text>
              <Text style={styles.specValue}>{asset.manufacturer}</Text>
            </View>
          </View>
          <View style={styles.specItem}>
            <AlertTriangle size={14} color={colors.mutedForeground} />
            <View>
              <Text style={styles.specLabel}>Criticality</Text>
              <Text style={[styles.specValue, { color: asset.criticality === 'Critical' ? colors.destructive : colors.foreground }]}>
                {asset.criticality}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* SLA Policy Card */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <Card style={styles.slaCard}>
          <LinearGradient
            colors={['#F8FAFC', '#FFF']}
            style={styles.slaGradient}
          >
            <View style={styles.slaHeaderRow}>
              <View style={styles.slaIconCircle}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.slaTitle}>SLA Contract & Policy</Text>
                <Text style={styles.slaTierText}>{asset.slaTier}</Text>
              </View>
            </View>

            <View style={styles.slaPolicyGrid}>
              <View style={styles.slaPolicyItem}>
                <Zap size={14} color="#F5A623" />
                <View>
                  <Text style={styles.slaPolicyLabel}>Target Response</Text>
                  <Text style={styles.slaPolicyValue}>{asset.slaPolicy.response}</Text>
                </View>
              </View>
              <View style={styles.slaPolicyItem}>
                <Clock size={14} color={colors.secondary} />
                <View>
                  <Text style={styles.slaPolicyLabel}>Target Resolution</Text>
                  <Text style={styles.slaPolicyValue}>{asset.slaPolicy.resolution}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Card>
      </Animated.View>

      {/* Lifecycle Details */}
      <View style={styles.lifecycleRow}>
        <View style={styles.lifecycleCard}>
          <Calendar size={14} color={colors.primary} />
          <View>
            <Text style={styles.lifecycleLabel}>Last Service</Text>
            <Text style={styles.lifecycleValue}>{asset.lastService}</Text>
          </View>
        </View>
        <View style={styles.lifecycleCard}>
          <Wrench size={14} color={colors.secondary} />
          <View>
            <Text style={styles.lifecycleLabel}>Next Service</Text>
            <Text style={styles.lifecycleValue}>{asset.nextService}</Text>
          </View>
        </View>
      </View>

      <View style={styles.warrantyBar}>
        <View style={styles.warrantyInfo}>
          <Text style={styles.warrantyLabel}>Warranty Coverage</Text>
          <Text style={styles.warrantyValue}>Expires: {asset.warrantyExpiry}</Text>
        </View>
        <View style={styles.warrantyBadge}>
          <Text style={styles.warrantyBadgeText}>ACTIVE</Text>
        </View>
      </View>

      {/* Grid of Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity onPress={() => setViewMode('work-order')} style={styles.actionBtn}>
          <LinearGradient colors={gradients.primary as any} style={styles.actionGradient}>
            <Wrench size={18} color="#FFF" />
            <Text style={styles.actionLabel}>Work Orders</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('create-issue')} style={styles.actionBtn}>
          <LinearGradient 
            colors={['#3B82F6', '#1E40AF']} 
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ClipboardList size={18} color="#FFF" />
            <Text style={styles.actionLabel}>Create Issue</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('manuals')} style={styles.actionBtnStatic}>
          <FileText size={18} color={colors.primary} />
          <Text style={styles.actionLabelStatic}>Manuals</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('checklist')} style={styles.actionBtnStatic}>
          <CheckSquare size={18} color={colors.primary} />
          <Text style={styles.actionLabelStatic}>Checklist</Text>
        </TouchableOpacity>
      </View>

      <Button onPress={() => { setScanned(false); setViewMode('scanner'); }} title="Scan Another" variant="ghost" />
    </Animated.View>
  );

  const renderScanner = () => (
    <Animated.View entering={FadeIn} style={styles.scannerView}>
      <View style={styles.scanArea}>
        <AssetQrScanner
          onScanSuccess={handleScanSuccess}
          isResolving={qrResolving}
          errorMessage={qrError}
        />
      </View>

      {/* Manual Entry */}
      <Card style={styles.manualEntryCard}>
        <View style={styles.manualEntryHeader}>
          <Barcode size={16} color={colors.primary} />
          <Text style={styles.manualEntryTitle}>Enter Barcode Manually</Text>
        </View>
        <View style={styles.manualInputRow}>
          <TextInput
            placeholder="e.g. BC-78234-AHU03"
            placeholderTextColor={colors.mutedForeground}
            value={barcodeInput}
            onChangeText={setBarcodeInput}
            style={styles.barcodeInput}
          />
          <TouchableOpacity onPress={handleBarcodeSubmit} style={styles.lookupBtn}>
            <Text style={styles.lookupBtnText}>Look Up</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>RECENT SCANS</Text>
        {scanHistory.map((s, i) => (
          <TouchableOpacity key={i} onPress={handleScan} style={styles.historyItem}>
            <View style={styles.historyIcon}>
              <ScanLine size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyName}>{s.name}</Text>
              <Text style={styles.historyId}>{s.id}</Text>
            </View>
            <Text style={styles.historyTime}>{s.time}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
      <PageHeader 
        title={headerProps.title} 
        showBack={headerProps.showBack} 
        onBack={() => {
          if (viewMode === 'scanner') {
            navigation.goBack();
          } else {
            goBack();
          }
        }}
        backgroundColor={colors.navy} 
        textColor="#FFF" 
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'scanner' && renderScanner()}
          {viewMode === 'result' && renderResult()}
          {viewMode === 'manuals' && renderManuals()}
          {viewMode === 'checklist' && renderChecklist()}
          {viewMode === 'create-issue' && renderCreateIssue()}
          {viewMode === 'work-order' && renderWorkOrders()}
        </ScrollView>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  subview: {
    width: '100%',
  },
  subviewSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 20,
  },
  scannerView: {
    gap: 20,
  },
  scanArea: {
    minHeight: 320,
    aspectRatio: 1,
    backgroundColor: '#000',
    borderRadius: 32,
    overflow: 'hidden',
  },
  scanTarget: {
    position: 'absolute',
    inset: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
  },
  scanLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  scanOverlay: {
    alignItems: 'center',
    zIndex: 10,
  },
  scanText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  scanSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 4,
  },
  manualEntryCard: {
    padding: 16,
  },
  manualEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  manualEntryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  barcodeInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.foreground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lookupBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  lookupBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  historySection: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 8,
    ...SHADOWS.card,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  historyId: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  historyTime: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  assetCard: {
    padding: 16,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assetName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
  },
  assetType: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  specItem: {
    width: '46%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  specLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 2,
  },

  // SLA Card Styles
  slaCard: {
    marginTop: 16,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  slaGradient: {
    padding: 16,
  },
  slaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  slaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slaTierText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.foreground,
    marginTop: 2,
  },
  slaPolicyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  slaPolicyItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  slaPolicyLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  slaPolicyValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: 1,
  },

  // Lifecycle & Warranty
  lifecycleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  lifecycleCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOWS.card,
  },
  lifecycleLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  lifecycleValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  warrantyBar: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  warrantyInfo: {
    flex: 1,
  },
  warrantyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
  },
  warrantyValue: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  warrantyBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  warrantyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    width: '48%',
    borderRadius: 16,
    // Note: removed overflow: hidden to allow shadow/crisp edges if needed, 
    // but ensured child gradient has matching border radius.
  },
  actionGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16, // Move radius here for perfect clipping
  },
  actionBtnStatic: {
    width: '48%',
    backgroundColor: colors.muted,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionLabelStatic: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  manualsList: {
    gap: 10,
  },
  manualCard: {
    padding: 12,
  },
  manualInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  manualMeta: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  checkCard: {
    padding: 12,
    marginBottom: 8,
  },
  checkMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  checkItemType: {
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  checkTag: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  formCard: {
    padding: 16,
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 36,
    backgroundColor: colors.muted,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  textArea: {
    height: 100,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.foreground,
    textAlignVertical: 'top',
  },
  
  // Functional enhancements
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyCardInfo: { flex: 1 },
  historyCardId: { fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.5 },
  historyCardTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, marginTop: 2 },
  historyCardFooter: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
    paddingTop: 12,
  },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyMetaText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500' },
  historySectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyHistory: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.muted + '40',
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border + '40',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  
  subviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '1A', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  progressText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  
  checkActions: { flexDirection: 'row', gap: 8 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  
  activeChip: { backgroundColor: colors.accent },
  activeChipText: { color: colors.accentForeground },

  // New form styles
  inputGroup: {
    gap: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.muted,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
  },
  dropdownValue: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border + '40',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.foreground,
  },
  photoTrigger: {
    height: 120,
    backgroundColor: colors.muted,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border + '40',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoCaptured: {
    borderStyle: 'solid',
    borderColor: colors.success + '40',
    backgroundColor: colors.success + '05',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  photoOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  retakeBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
});

