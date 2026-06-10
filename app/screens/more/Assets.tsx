import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from '@/app/types/navigation';
import { Search, ChevronRight, QrCode, Box } from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { useTheme } from '@/app/constants/theme';
import { useAssets } from '@/lib/hooks/useAssets';
import type { Asset } from '@/lib/types/asset';
import Animated, { FadeInUp } from 'react-native-reanimated';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const STATUS_FILTERS = ['All', 'Active', 'Under Repair', 'Inactive'] as const;

export default function AssetsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, shadows, isDark } = useTheme();
  const { assets, loading, error, reload } = useAssets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('All');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.id.toLowerCase().includes(q) ||
        asset.serialNumber.toLowerCase().includes(q) ||
        asset.location.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'All' || asset.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [assets, search, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const openAsset = (asset: Asset) => {
    navigation.navigate('Maintenance', {
      screen: 'AssetDetails',
      params: { assetId: asset.id },
    } as never);
  };

  const styles = getStyles(colors, shadows, isDark);

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={isDark ? colors.navy : colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <PageHeader
        title="Assets"
        flat
        rightElement={
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('Scan' as never)}
          >
            <QrCode size={16} color={colors.primary} />
            <Text style={styles.scanBtnText}>Scan</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            placeholder="Search assets..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity
              key={status}
              activeOpacity={0.8}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && assets.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              Set UPSTREAM_ASSET_MODE=http on technician-service and run sz-asset-service
              (port 4007).
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void reload()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.countRow}>
              <Text style={styles.countText}>{filtered.length} assets</Text>
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Box size={40} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle}>No assets found</Text>
                <Text style={styles.emptyHint}>
                  Create assets in sz-asset-webapp or adjust your search filters.
                </Text>
              </View>
            ) : (
              filtered.map((asset, i) => (
                <Animated.View key={asset.id} entering={FadeInUp.delay(i * 25)}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => openAsset(asset)}>
                    <Card style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.assetName} numberOfLines={1}>
                            {asset.name}
                          </Text>
                          <Text style={styles.assetId}>{asset.id}</Text>
                        </View>
                        <StatusBadge status={asset.status} />
                        <ChevronRight size={18} color={colors.mutedForeground} />
                      </View>
                      <Text style={styles.assetMeta} numberOfLines={1}>
                        {asset.type} · {asset.location}
                      </Text>
                      <Text style={styles.assetSerial}>
                        SN: {asset.serialNumber}
                        {asset.openWOs > 0 ? ` · ${asset.openWOs} open WO` : ''}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: any, shadows: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
    },
    scanBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 44,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, paddingVertical: 0 },
    filterScroll: {
      flexGrow: 0,
      flexShrink: 0,
      maxHeight: 40,
      marginBottom: 12,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      minHeight: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignSelf: 'center',
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
    filterChipTextActive: { color: '#fff' },
    listScroll: { flex: 1 },
    listContent: { paddingBottom: 100 },
    countRow: { marginBottom: 8 },
    countText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: { padding: 16, marginBottom: 10 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    assetName: { fontSize: 16, fontWeight: '800', color: colors.foreground },
    assetId: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
      fontFamily: 'monospace',
    },
    assetMeta: { fontSize: 13, color: colors.mutedForeground, marginBottom: 4 },
    assetSerial: { fontSize: 11, color: colors.mutedForeground },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    emptyHint: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: 24,
      lineHeight: 20,
    },
    errorText: { fontSize: 14, fontWeight: '700', color: colors.destructive, textAlign: 'center' },
    errorHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginTop: 4,
    },
    retryBtn: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    retryText: { color: '#fff', fontWeight: '700' },
  });
