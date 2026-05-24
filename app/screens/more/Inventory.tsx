import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Alert,
  StatusBar,
} from 'react-native';
import { Search, AlertTriangle, X } from 'lucide-react-native';
import { inventoryItems as initialItems } from '@/data/mockData';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import type { InventoryItem } from '@/data/mockData';

type StockFilter = 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock';

export default function InventoryScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const [items] = useState<InventoryItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('All');
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Request form state
  const [reqPartName, setReqPartName] = useState('');
  const [reqPartNumber, setReqPartNumber] = useState('');
  const [reqQuantity, setReqQuantity] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [reqNotes, setReqNotes] = useState('');

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (item.location !== 'Van Stock') return false;
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          item.partNumber.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'Out of Stock':
          return item.quantity === 0;
        case 'Low Stock':
          return item.quantity > 0 && item.quantity <= item.minStock;
        case 'In Stock':
          return item.quantity > item.minStock;
        default:
          return true;
      }
    });
  }, [items, search, activeFilter]);

  const resetForm = () => {
    setReqPartName('');
    setReqPartNumber('');
    setReqQuantity('');
    setReqUrgency('Medium');
    setReqNotes('');
  };

  const handleSubmitRequest = () => {
    if (!reqPartName.trim()) {
      Alert.alert('Required', 'Please enter the part name.');
      return;
    }
    if (!reqQuantity.trim() || isNaN(Number(reqQuantity))) {
      Alert.alert('Required', 'Please enter a valid quantity.');
      return;
    }
    Alert.alert('Success', 'Part request submitted successfully!', [
      {
        text: 'OK',
        onPress: () => {
          resetForm();
          setShowRequestModal(false);
        },
      },
    ]);
  };

  const openRequestWithItem = (item: InventoryItem) => {
    setReqPartName(item.name);
    setReqPartNumber(item.partNumber);
    setReqQuantity(String(Math.max(0, item.minStock - item.quantity)));
    setReqUrgency('High');
    setReqNotes(`Automated request for low stock item.`);
    setShowRequestModal(true);
  };

  const getStockColor = (qty: number, minStock: number) => {
    if (qty === 0) return colors.destructive;
    if (qty <= minStock) return colors.warning;
    return colors.primary;
  };

  const getStockLabel = (qty: number, minStock: number) => {
    if (qty === 0) return 'Out of Stock';
    if (qty <= minStock) return 'Low Stock';
    return 'In Stock';
  };

  const styles = getStyles(colors, shadows, isDark);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={isDark ? colors.navy : colors.background} barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader
        title="Inventory"
        rightElement={
          <TouchableOpacity
            style={styles.requestButtonHeader}
            onPress={() => setShowRequestModal(true)}
          >
            <Text style={styles.requestButtonHeaderText}>Request Parts</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.headerControls}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.mutedForeground} />
            <TextInput
              placeholder="Search parts..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
        >
          <View style={styles.filterRow}>
            {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as StockFilter[]).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[styles.filterChip, activeFilter === f && styles.activeFilterChip]}
              >
                <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Van Stock</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filtered.length} Items</Text>
          </View>
        </View>

        <View style={styles.list}>
          {filtered.length > 0 ? (
            filtered.map((item: InventoryItem, i: number) => {
              const stockColor = getStockColor(item.quantity, item.minStock);
              const isBelowMin = item.quantity <= item.minStock;
              
              return (
                <Animated.View 
                  key={item.id} 
                  entering={FadeInUp.delay(i * 30)}
                  layout={Layout.springify()}
                >
                  <Card
                    style={{
                      padding: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: stockColor,
                      ...(isBelowMin ? { borderColor: stockColor + '33', borderWidth: 1 } : {}),
                    }}
                  >
                    <View style={styles.cardMain}>
                      <View style={styles.infoSide}>
                        <View style={styles.nameRow}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                          {isBelowMin && <AlertTriangle size={14} color={stockColor} />}
                        </View>
                        <Text style={styles.partNumber}>{item.partNumber}</Text>
                        <View style={[styles.badge, { backgroundColor: stockColor + '15' }]}>
                          <Text style={[styles.badgeText, { color: stockColor }]}>
                            {getStockLabel(item.quantity, item.minStock)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.qtySide}>
                        <Text style={[styles.qtyValue, { color: stockColor }]}>
                          {item.quantity}
                        </Text>
                        <Text style={styles.unitText}>{item.unit}</Text>
                      </View>
                    </View>

                    {isBelowMin && (
                      <View style={[styles.lowStockFooter, { borderTopColor: colors.border + '33' }]}>
                        <Text style={[styles.lowStockText, { color: stockColor }]}>
                          Below min stock ({item.minStock})
                        </Text>
                        <TouchableOpacity
                          style={[styles.reqBtnSmall, { backgroundColor: colors.primary + '15' }]}
                          onPress={() => openRequestWithItem(item)}
                        >
                          <Text style={styles.reqBtnText}>Request</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Card>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No parts found for this filter.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Parts</Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowRequestModal(false);
                }}
                style={styles.closeBtn}
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.label}>Part Name *</Text>
              <TextInput
                value={reqPartName}
                onChangeText={setReqPartName}
                placeholder="Enter part name"
                style={styles.input}
              />

              <Text style={styles.label}>Part Number</Text>
              <TextInput
                value={reqPartNumber}
                onChangeText={setReqPartNumber}
                placeholder="e.g. AF-2020-2"
                style={styles.input}
              />

              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                value={reqQuantity}
                onChangeText={setReqQuantity}
                placeholder="Enter quantity"
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.label}>Urgency</Text>
              <View style={styles.urgencyRow}>
                {(['Low', 'Medium', 'High'] as const).map(level => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setReqUrgency(level)}
                    style={[
                      styles.urgencyBtn,
                      reqUrgency === level && { 
                        backgroundColor: level === 'High' ? colors.destructive : 
                                         level === 'Medium' ? colors.warning : colors.primary,
                        borderColor: 'transparent'
                      }
                    ]}
                  >
                    <Text style={[styles.urgencyText, reqUrgency === level && { color: '#fff' }]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                value={reqNotes}
                onChangeText={setReqNotes}
                placeholder="Additional notes..."
                multiline
                numberOfLines={3}
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleSubmitRequest}
              >
                <Text style={styles.submitBtnText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, shadows: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerControls: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 16,
    marginTop: 0,
  },
  requestButtonHeader: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
  },
  requestButtonHeaderText: {
    color: isDark ? '#FFFFFF' : colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: colors.panel,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, paddingHorizontal: 8 },
  filterScroll: { marginTop: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterChip: {
    backgroundColor: '#F7FEE7',
    borderColor: '#92D230',
  },
  filterText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  activeFilterText: { color: colors.primary },
  list: { gap: 12 },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoSide: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.foreground, flexShrink: 1 },
  partNumber: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  qtySide: { alignItems: 'flex-end', minWidth: 40 },
  qtyValue: { fontSize: 22, fontWeight: '800' },
  unitText: { fontSize: 10, color: colors.mutedForeground, fontWeight: '600' },
  lowStockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  lowStockText: { fontSize: 11, fontWeight: '700' },
  reqBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reqBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { color: colors.mutedForeground, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  urgencyRow: { flexDirection: 'row', gap: 10 },
  urgencyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  urgencyText: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  cancelBtnText: { color: colors.mutedForeground, fontWeight: '700' },
  submitBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
