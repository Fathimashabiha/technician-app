import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Package, RotateCcw, Plus, Trash2 } from 'lucide-react-native';
import PartSelectField from '@/components/inventory/PartSelectField';
import {
  fetchInventoryCatalog,
  type InventoryCatalogItem,
  type PartReturnReason,
} from '@/lib/inventoryService';

export type ReturnLineDraft = {
  itemId: string;
  quantity: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    lines: ReturnLineDraft[];
    reason: PartReturnReason;
    destination: string;
    workOrderId?: string;
    notes?: string;
  }) => void;
};

const REASONS: PartReturnReason[] = [
  'Unused',
  'Defective',
  'Wrong Part',
  'Job Cancelled',
  'Other',
];

const DESTINATIONS = ['Main Store', 'Warehouse', 'Site Store'];

type LineDraft = {
  itemId: string;
  name: string;
  partNumber: string;
  unit: string;
  maxQty: number;
  quantity: number;
};

export default function ReturnPartsModal({ visible, onClose, onSubmit }: Props) {
  const [catalog, setCatalog] = useState<InventoryCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<InventoryCatalogItem | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [reason, setReason] = useState<PartReturnReason>('Unused');
  const [destination, setDestination] = useState('Main Store');
  const [workOrderId, setWorkOrderId] = useState('');
  const [notes, setNotes] = useState('');

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const rows = await fetchInventoryCatalog({ purpose: 'return' });
      setCatalog(rows);
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void loadCatalog();
    }
  }, [visible, loadCatalog]);

  const totalUnits = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  const reset = () => {
    setSelectedPart(null);
    setQtyInput('');
    setLines([]);
    setReason('Unused');
    setDestination('Main Store');
    setWorkOrderId('');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addLine = () => {
    if (!selectedPart) {
      Alert.alert('Select a part', 'Choose a part from the dropdown first.');
      return;
    }
    const qty = parseInt(qtyInput, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Quantity', 'Enter a valid return quantity.');
      return;
    }
    if (qty > selectedPart.availableStock) {
      Alert.alert(
        'Invalid quantity',
        `You only have ${selectedPart.availableStock} ${selectedPart.unit} on the van.`
      );
      return;
    }

    const existing = lines.find((l) => l.itemId === selectedPart.id);
    const existingQty = existing?.quantity ?? 0;
    if (existingQty + qty > selectedPart.availableStock) {
      Alert.alert('Invalid quantity', `Cannot return more than on hand for ${selectedPart.name}.`);
      return;
    }

    if (existing) {
      setLines((prev) =>
        prev.map((l) =>
          l.itemId === selectedPart.id ? { ...l, quantity: l.quantity + qty } : l
        )
      );
    } else {
      setLines((prev) => [
        ...prev,
        {
          itemId: selectedPart.id,
          name: selectedPart.name,
          partNumber: selectedPart.partNumber,
          unit: selectedPart.unit,
          maxQty: selectedPart.availableStock,
          quantity: qty,
        },
      ]);
    }

    setSelectedPart(null);
    setQtyInput('');
  };

  const removeLine = (itemId: string) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const handleSubmit = () => {
    if (lines.length === 0) {
      Alert.alert('Select parts', 'Add at least one part to return.');
      return;
    }

    onSubmit({
      lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      reason,
      destination,
      workOrderId: workOrderId.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <RotateCcw size={20} color="#0f766e" />
              <Text style={styles.title}>Return Parts</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select parts from your van stock, then submit the return.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {catalogLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color="#0d9488" />
            ) : null}

            <PartSelectField
              label="Part"
              placeholder="Select part to return"
              items={catalog}
              value={selectedPart}
              onChange={setSelectedPart}
              disabled={catalogLoading}
            />

            <Text style={styles.sectionLabel}>Quantity</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.qtyInput}
                placeholder="Qty"
                value={qtyInput}
                onChangeText={(t) => setQtyInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addLine}>
                <Plus size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {lines.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Return list</Text>
                {lines.map((line) => (
                  <View key={line.itemId} style={styles.lineRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineName}>{line.name}</Text>
                      <Text style={styles.lineMeta}>
                        {line.quantity} {line.unit} · {line.partNumber}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeLine(line.itemId)}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyHint}>No parts added yet.</Text>
            )}

            <Text style={styles.sectionLabel}>Return reason</Text>
            <View style={styles.chipRow}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, reason === r && styles.chipActive]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.chipText, reason === r && styles.chipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Return to</Text>
            <View style={styles.chipRow}>
              {DESTINATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, destination === d && styles.chipActive]}
                  onPress={() => setDestination(d)}
                >
                  <Text style={[styles.chipText, destination === d && styles.chipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Work order (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. WO-2024-002"
              value={workOrderId}
              onChangeText={setWorkOrderId}
              autoCapitalize="characters"
            />

            <Text style={styles.sectionLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Condition, packaging, etc."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.summaryBar}>
            <Package size={18} color="#0f766e" />
            <Text style={styles.summaryText}>
              {lines.length} part type{lines.length !== 1 ? 's' : ''} · {totalUnits} unit
              {totalUnits !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, lines.length === 0 && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={lines.length === 0}
            >
              <Text style={styles.submitText}>Submit Return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 20,
    marginBottom: 12,
    lineHeight: 18,
  },
  scroll: { paddingHorizontal: 20, maxHeight: 420 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
  emptyHint: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  qtyInput: {
    width: 88,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 8,
  },
  lineName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  lineMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  chipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  notesInput: { minHeight: 72 },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
  },
  summaryText: { fontSize: 13, fontWeight: '700', color: '#0f766e', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelText: { fontWeight: '700', color: '#64748b' },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d9488',
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { fontWeight: '700', color: '#fff' },
});
