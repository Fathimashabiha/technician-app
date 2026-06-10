import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  AlertTriangle,
  X,
  RotateCcw,
  Package,
  ClipboardList,
} from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import ReturnPartsModal from '@/components/inventory/ReturnPartsModal';
import PartSelectField from '@/components/inventory/PartSelectField';
import { ApiError } from '@/lib/api';
import {
  fetchVanStock,
  fetchInventoryCatalog,
  fetchPartReturns,
  fetchPartRequests,
  submitPartRequest,
  submitPartReturn,
  type InventoryCatalogItem,
  type InventoryItem,
  type PartReturnRecord,
  type PartRequestRecord,
} from '@/lib/inventoryService';

type StockFilter = 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock';
type InventoryView = 'stock' | 'requests' | 'returns';

function normalizeRequestStatus(status: string): string {
  const value = status.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (value === 'approved' || value === 'fullyissued') return 'Fully Issued';
  if (value === 'partiallyissued') return 'Partially Issued';
  if (value === 'rejected') return 'Rejected';
  if (value === 'submitted' || value === 'submittedtoinventory') return 'SubmittedToInventory';
  if (value === 'pending') return 'Pending';
  return status.trim();
}

function formatRequestStatus(req: PartRequestRecord): string {
  switch (normalizeRequestStatus(req.status)) {
    case 'Fully Issued':
    case 'Approved':
      return 'Approved';
    case 'Partially Issued':
      return 'Partially issued';
    case 'Rejected':
      return 'Rejected';
    case 'SubmittedToInventory':
      return 'Submitted';
    default:
      return 'Pending';
  }
}

function formatRequestLine(line: PartRequestRecord['lines'][number]): string {
  const requested = line.requestedQuantity ?? line.quantity;
  const issued = line.issuedQuantity ?? 0;
  if (issued > 0 && issued < requested) return `${issued}/${requested}× ${line.name}`;
  return `${requested}× ${line.name}`;
}

function formatReturnStatus(status: PartReturnRecord['status']): string {
  return status;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColor(
  colors: { primary: string; warning: string; destructive: string; mutedForeground: string },
  label: string
): string {
  const normalized = label.toLowerCase();
  if (normalized.includes('partial')) return colors.warning;
  if (normalized.includes('approv') || normalized.includes('received')) return colors.primary;
  if (normalized.includes('reject')) return colors.destructive;
  if (normalized.includes('submit') || normalized.includes('pending')) return colors.warning;
  return colors.mutedForeground;
}

export default function InventoryScreen() {
  const { colors, gradients, shadows, isDark } = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StockFilter>('All');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [partReturns, setPartReturns] = useState<PartReturnRecord[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequestRecord[]>([]);
  const [activeView, setActiveView] = useState<InventoryView>('stock');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Request form state
  const [requestCatalog, setRequestCatalog] = useState<InventoryCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedRequestPart, setSelectedRequestPart] = useState<InventoryCatalogItem | null>(null);
  const [reqQuantity, setReqQuantity] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [reqNotes, setReqNotes] = useState('');

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const rows = await fetchVanStock(undefined, {
        search: search || undefined,
        stockHealth: activeFilter,
      });
      setItems(rows);
      const [returns, requests] = await Promise.all([
        fetchPartReturns(),
        fetchPartRequests(),
      ]);
      setPartReturns(returns);
      setPartRequests(requests);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not load inventory';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadInventory();
    }, [loadInventory]),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadInventory();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, activeFilter, loadInventory]);

  const filtered = useMemo(() => {
    return items.filter((item) => item.location === 'Van Stock');
  }, [items]);

  const loadRequestCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const rows = await fetchInventoryCatalog({ purpose: 'request' });
      setRequestCatalog(rows);
    } catch {
      setRequestCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showRequestModal) {
      void loadRequestCatalog();
    }
  }, [showRequestModal, loadRequestCatalog]);

  const resetForm = () => {
    setSelectedRequestPart(null);
    setReqQuantity('');
    setReqUrgency('Medium');
    setReqNotes('');
  };

  const openRequestModal = () => {
    resetForm();
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedRequestPart) {
      Alert.alert('Required', 'Please select a part from the list.');
      return;
    }
    if (!reqQuantity.trim() || isNaN(Number(reqQuantity))) {
      Alert.alert('Required', 'Please enter a valid quantity.');
      return;
    }

    try {
      setSubmitting(true);
      await submitPartRequest({
        urgency: reqUrgency,
        notes: reqNotes.trim() || undefined,
        lines: [
          {
            partRef: selectedRequestPart.id,
            name: selectedRequestPart.name,
            partNumber: selectedRequestPart.partNumber,
            quantity: Number(reqQuantity),
          },
        ],
      });
      Alert.alert('Success', 'Part request submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            setShowRequestModal(false);
            setActiveView('requests');
            void loadInventory();
          },
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to submit request';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const openRequestWithItem = (item: InventoryItem) => {
    const catalogItem: InventoryCatalogItem = {
      id: item.id,
      name: item.name,
      partNumber: item.partNumber,
      unit: item.unit,
      availableStock: item.quantity,
      source: 'van',
    };
    setSelectedRequestPart(catalogItem);
    setReqQuantity(String(Math.max(1, item.minStock - item.quantity)));
    setReqUrgency('High');
    setReqNotes('Automated request for low stock item.');
    setShowRequestModal(true);
  };

  const handleSubmitReturn = async (payload: {
    lines: { itemId: string; quantity: number }[];
    reason: PartReturnRecord['reason'];
    destination: string;
    workOrderId?: string;
    notes?: string;
  }) => {
    try {
      setSubmitting(true);
      const record = await submitPartReturn({
        reason: payload.reason,
        destination: payload.destination,
        workOrderRef: payload.workOrderId,
        notes: payload.notes,
        lines: payload.lines,
      });

      setPartReturns((prev) => [record, ...prev]);
      setActiveView('returns');
      setShowReturnModal(false);
      await loadInventory();

      const totalQty = record.lines.reduce((s, l) => s + l.quantity, 0);
      Alert.alert(
        'Return submitted',
        `${totalQty} unit(s) queued for return to ${payload.destination}. Van stock updates when the warehouse marks it received.`,
      );
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to submit return';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerActionBtn, styles.returnHeaderBtn]}
              onPress={() => setShowReturnModal(true)}
            >
              <RotateCcw size={14} color={isDark ? '#99f6e4' : '#0d9488'} />
              <Text style={[styles.headerActionText, styles.returnHeaderText]}>Return</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={openRequestModal}
            >
              <Text style={styles.headerActionText}>Request</Text>
            </TouchableOpacity>
          </View>
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
            {(
              [
                { key: 'stock' as const, label: 'Van Stock', icon: Package },
                { key: 'requests' as const, label: 'Requests', icon: ClipboardList },
                { key: 'returns' as const, label: 'Returns', icon: RotateCcw },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveView(key)}
                style={[styles.filterChip, activeView === key && styles.activeFilterChip]}
              >
                <Icon
                  size={14}
                  color={activeView === key ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.filterText, activeView === key && styles.activeFilterText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {activeView === 'stock' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <View style={styles.filterRow}>
              {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as StockFilter[]).map((f) => (
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
        ) : null}
      </View>

      {loading && !loadError ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.reqBtnSmall} onPress={() => void loadInventory()}>
            <Text style={styles.reqBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeView === 'requests' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My requests</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{partRequests.length}</Text>
              </View>
            </View>
            <View style={styles.list}>
              {partRequests.length > 0 ? (
                partRequests.map((req, i) => {
                  const statusLabel = formatRequestStatus(req);
                  const badgeColor = statusColor(colors, statusLabel);
                  return (
                    <Animated.View key={req.id} entering={FadeInUp.delay(i * 30)} layout={Layout.springify()}>
                      <Card style={styles.historyCard}>
                        <View style={styles.historyCardTop}>
                          <Text style={styles.historyCardId}>{req.id.slice(0, 8).toUpperCase()}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: badgeColor + '18' }]}>
                            <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{statusLabel}</Text>
                          </View>
                        </View>
                        <Text style={styles.historyCardMeta}>
                          {req.urgency} urgency · {formatShortDate(req.createdAt)}
                        </Text>
                        <Text style={styles.historyCardLines} numberOfLines={3}>
                          {req.lines.map((l) => formatRequestLine(l)).join(', ')}
                        </Text>
                        {req.workOrderRef ? (
                          <Text style={styles.historyCardWo}>WO: {req.workOrderRef}</Text>
                        ) : null}
                        {req.notes ? (
                          <Text style={styles.historyCardNotes} numberOfLines={2}>
                            {req.notes}
                          </Text>
                        ) : null}
                        {req.rejectionReason ? (
                          <Text style={styles.historyCardReject}>{req.rejectionReason}</Text>
                        ) : null}
                      </Card>
                    </Animated.View>
                  );
                })
              ) : loading ? null : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No part requests yet.</Text>
                  <TouchableOpacity style={styles.reqBtnSmall} onPress={openRequestModal}>
                    <Text style={styles.reqBtnText}>Request parts</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        ) : null}

        {activeView === 'returns' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My returns</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{partReturns.length}</Text>
              </View>
            </View>
            <View style={styles.list}>
              {partReturns.length > 0 ? (
                partReturns.map((ret, i) => {
                  const statusLabel = formatReturnStatus(ret.status);
                  const badgeColor = statusColor(colors, statusLabel);
                  return (
                    <Animated.View key={ret.id} entering={FadeInUp.delay(i * 30)} layout={Layout.springify()}>
                      <Card style={styles.historyCard}>
                        <View style={styles.historyCardTop}>
                          <Text style={styles.historyCardId}>{ret.id.slice(0, 8).toUpperCase()}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: badgeColor + '18' }]}>
                            <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{statusLabel}</Text>
                          </View>
                        </View>
                        <Text style={styles.historyCardMeta}>
                          {ret.reason} · → {ret.destination} · {formatShortDate(ret.createdAt)}
                        </Text>
                        <Text style={styles.historyCardLines} numberOfLines={3}>
                          {ret.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}
                        </Text>
                        {ret.workOrderId ? (
                          <Text style={styles.historyCardWo}>WO: {ret.workOrderId}</Text>
                        ) : null}
                        {ret.notes ? (
                          <Text style={styles.historyCardNotes} numberOfLines={2}>
                            {ret.notes}
                          </Text>
                        ) : null}
                      </Card>
                    </Animated.View>
                  );
                })
              ) : loading ? null : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No returns submitted yet.</Text>
                  <TouchableOpacity style={styles.reqBtnSmall} onPress={() => setShowReturnModal(true)}>
                    <Text style={[styles.reqBtnText, { color: '#0d9488' }]}>Return parts</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        ) : null}

        {activeView === 'stock' ? (
          <>
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

                    {(isBelowMin || item.quantity > 0) && (
                      <View style={[styles.lowStockFooter, { borderTopColor: colors.border + '33' }]}>
                        {isBelowMin ? (
                          <Text style={[styles.lowStockText, { color: stockColor }]}>
                            Below min ({item.minStock})
                          </Text>
                        ) : (
                          <View style={{ flex: 1 }} />
                        )}
                        <View style={styles.cardActions}>
                          {item.quantity > 0 && (
                            <TouchableOpacity
                              style={[styles.reqBtnSmall, { backgroundColor: '#0d948815' }]}
                              onPress={() => setShowReturnModal(true)}
                            >
                              <Text style={[styles.reqBtnText, { color: '#0d9488' }]}>Return</Text>
                            </TouchableOpacity>
                          )}
                          {isBelowMin && (
                            <TouchableOpacity
                              style={[styles.reqBtnSmall, { backgroundColor: colors.primary + '15' }]}
                              onPress={() => openRequestWithItem(item)}
                            >
                              <Text style={styles.reqBtnText}>Request</Text>
                            </TouchableOpacity>
                          )}
                        </View>
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
          </>
        ) : null}
      </ScrollView>

      <ReturnPartsModal
        visible={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSubmit={handleSubmitReturn}
      />

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
              <PartSelectField
                label="Part *"
                placeholder={catalogLoading ? 'Loading parts...' : 'Select part to request'}
                items={requestCatalog}
                value={selectedRequestPart}
                onChange={setSelectedRequestPart}
                disabled={catalogLoading}
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
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={() => void handleSubmitRequest()}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Text>
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
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionBtn: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
  },
  returnHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: isDark ? 'rgba(153,246,228,0.4)' : '#99f6e4',
  },
  headerActionText: {
    color: isDark ? '#FFFFFF' : colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  returnHeaderText: { color: isDark ? '#99f6e4' : '#0d9488' },
  historyCard: { padding: 14, marginBottom: 8, backgroundColor: colors.card },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyCardId: { fontSize: 11, fontWeight: '800', color: colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  historyCardMeta: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6 },
  historyCardLines: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  historyCardWo: { fontSize: 11, color: colors.mutedForeground, marginTop: 6, fontWeight: '600' },
  historyCardNotes: { fontSize: 12, color: colors.mutedForeground, marginTop: 6, fontStyle: 'italic' },
  historyCardReject: { fontSize: 12, color: colors.destructive, marginTop: 6, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { color: colors.destructive, textAlign: 'center', fontSize: 14 },
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
