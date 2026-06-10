import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import type { InventoryCatalogItem } from '@/lib/inventoryService';

type Props = {
  label: string;
  placeholder?: string;
  items: InventoryCatalogItem[];
  value: InventoryCatalogItem | null;
  onChange: (item: InventoryCatalogItem | null) => void;
  disabled?: boolean;
  showStock?: boolean;
};

export default function PartSelectField({
  label,
  placeholder = 'Select a part',
  items,
  value,
  onChange,
  disabled,
  showStock = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.partNumber.toLowerCase().includes(q)
    );
  }, [items, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? `${value.name} (${value.partNumber})` : placeholder}
        </Text>
        <ChevronDown size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={close} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or part number"
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
            </View>

            {items.length === 0 ? (
              <Text style={styles.empty}>No parts available. Check inventory service is running.</Text>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                ListEmptyComponent={
                  <Text style={styles.empty}>No parts match your search.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.option, value?.id === item.id && styles.optionSelected]}
                    onPress={() => {
                      onChange(item);
                      close();
                    }}
                  >
                    <Text style={styles.optionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.optionMeta}>
                      {item.partNumber}
                      {showStock
                        ? ` · ${item.availableStock} ${item.unit} ${
                            item.source === 'van' ? 'on van' : 'in stock'
                          }`
                        : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  placeholder: { color: '#94a3b8', fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  list: { paddingHorizontal: 12 },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionSelected: { borderColor: '#0d9488', backgroundColor: '#f0fdfa' },
  optionName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  optionMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    padding: 24,
    fontStyle: 'italic',
  },
});
