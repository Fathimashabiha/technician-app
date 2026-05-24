import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  Search, 
  Package, 
  Plus, 
  Minus, 
  CheckCircle2, 
  X,
  PackageCheck,
  Pause
} from 'lucide-react-native';
import { inventoryItems } from '@/data/mockData';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS, SHADOWS, useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

export default function PartsUsageScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [search, setSearch] = useState('');
  const [selections, setSelections] = useState<Record<string, number>>({});

  const vanStock = inventoryItems.filter(item => 
    item.location === 'Van Stock' && 
    (item.name.toLowerCase().includes(search.toLowerCase()) || 
     item.partNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const updateQty = (itemId: string, delta: number) => {
    setSelections(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      
      const newSelections = { ...prev };
      if (next === 0) {
        delete newSelections[itemId];
      } else {
        newSelections[itemId] = next;
      }
      return newSelections;
    });
  };

  const selectedCount = Object.values(selections).reduce((a, b) => a + b, 0);
  const selectedDistinctCount = Object.keys(selections).length;

  const handleConfirm = () => {
    const selectedParts = Object.entries(selections).map(([itemId, qty]) => {
      const item = inventoryItems.find(i => i.id === itemId);
      return {
        id: itemId,
        name: item?.name || 'Unknown Part',
        quantity: qty
      };
    });

    navigation.navigate('WorkOrderDetails', { 
      id, 
      stepCompleted: 'parts',
      selectedParts 
    });
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Parts Usage" 
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

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            placeholder="Search van stock..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>AVAILABLE IN VAN STOCK</Text>
        <View style={styles.list}>
          {vanStock.map((item, i) => {
            const qty = selections[item.id] || 0;
            return (
              <Animated.View key={item.id} entering={FadeInUp.delay(i * 30)}>
                <Card style={[styles.partCard, qty > 0 ? styles.partCardSelected : null]}>
                  <View style={styles.partMain}>
                    <View style={styles.partIconBox}>
                      <Package size={20} color={qty > 0 ? colors.primary : colors.mutedForeground} />
                    </View>
                    <View style={styles.partInfo}>
                      <Text style={styles.partName}>{item.name}</Text>
                      <Text style={styles.partNo}>{item.partNumber}</Text>
                      <Text style={styles.partStock}>Available: {item.quantity} {item.unit}</Text>
                    </View>

                    <View style={styles.qtyControl}>
                      <TouchableOpacity 
                        onPress={() => updateQty(item.id, -1)}
                        style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                        disabled={qty === 0}
                      >
                        <Minus size={16} color={qty === 0 ? colors.border : colors.foreground} />
                      </TouchableOpacity>
                      
                      <View style={styles.qtyValueBox}>
                        <Text style={[styles.qtyText, qty > 0 && styles.qtyTextActive]}>{qty}</Text>
                      </View>

                      <TouchableOpacity 
                        onPress={() => updateQty(item.id, 1)}
                        style={styles.qtyBtn}
                        disabled={qty >= item.quantity}
                      >
                        <Plus size={16} color={qty >= item.quantity ? colors.border : colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </View>
        {selectedCount > 0 && (
          <Animated.View entering={FadeInDown} style={styles.scrollableFooter}>
            <View style={styles.footerContent}>
              <View style={styles.summaryInfo}>
                <View style={styles.selectionBadge}>
                  <PackageCheck size={16} color={colors.primary} />
                  <Text style={styles.selectionText}>{selectedDistinctCount} Items Selected</Text>
                </View>
                <Text style={styles.totalText}>Total Qty: {selectedCount}</Text>
              </View>
              <Button 
                 title="Add to Work Order" 
                 variant="default" 
                 onPress={handleConfirm}
                 style={styles.confirmBtn}
              />
            </View>
          </Animated.View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    ...SHADOWS.card,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, paddingHorizontal: 8 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.mutedForeground, letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  list: { gap: 12 },
  partCard: { padding: 12, borderRadius: 20 },
  partCardSelected: { 
    borderColor: colors.primary, 
    borderWidth: 1, 
    backgroundColor: colors.primary + '1A',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  partMain: { flexDirection: 'row', alignItems: 'center' },
  partIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  partInfo: { flex: 1, gap: 2 },
  partName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  partNo: { fontSize: 10, color: colors.mutedForeground, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  partStock: { fontSize: 10, fontWeight: '600', color: colors.primary, marginTop: 2 },
  
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.muted + '40', borderRadius: 12, padding: 4, gap: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  qtyBtnDisabled: { opacity: 0.5 },
  qtyValueBox: { width: 30, alignItems: 'center' },
  qtyText: { fontSize: 15, fontWeight: '800', color: colors.mutedForeground },
  qtyTextActive: { color: colors.primary },

  scrollableFooter: {
    marginTop: 32,
    backgroundColor: 'transparent',
  },
  footerContent: { gap: 16 },
  summaryInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectionText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  totalText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  confirmBtn: { height: 52, borderRadius: 14 },
  holdButton: {
    padding: 8,
    backgroundColor: colors.muted,
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
