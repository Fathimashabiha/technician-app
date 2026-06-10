import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Phone,
  User,
  Barcode,
  CheckCircle2,
  FileText,
} from 'lucide-react-native';
import type { Location } from '@/lib/types/location';
import { fetchExternalLocation } from '@/lib/locationService';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MaintenanceStackParamList } from '@/app/types/navigation';

export default function LocationDetailsScreen() {
  const { colors, gradients } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const route = useRoute<RouteProp<MaintenanceStackParamList, 'LocationDetails'>>();
  const {
    locationId,
    isReviewMode,
    workOrderId,
    scheduleId,
    returnTo,
  } = (route.params as any) || {};

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLocation = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const loaded = await fetchExternalLocation(String(locationId));
      setLocation(loaded);
    } catch (err: unknown) {
      setLocation(null);
      setLoadError(err instanceof Error ? err.message : 'Could not load location from server.');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadError || !location) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 8 }}>
          Location not available
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 22, marginBottom: 16 }}>
          {loadError ?? 'Unknown error'}
        </Text>
        <TouchableOpacity
          onPress={() => void loadLocation()}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const confirmAndProceed = () => {
    if (returnTo === 'PpmExecutionDetails' && (scheduleId || workOrderId)) {
      navigation.navigate('PpmExecutionDetails' as any, {
        scheduleId: scheduleId ?? workOrderId,
        stepCompleted: 'qr_scan',
      } as any);
      return;
    }
    navigation.navigate('WorkOrderDetails' as any, {
      id: workOrderId,
      stepCompleted: 'qr_scan',
    } as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp}>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{location.name}</Text>
                <Text style={styles.subtitle}>{location.locationId}</Text>
              </View>
              <StatusBadge status={location.status} />
            </View>

            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <MapPin size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.specLabel}>Address</Text>
                  <Text style={styles.specValue}>{location.address}</Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <Building2 size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.specLabel}>Portfolio</Text>
                  <Text style={styles.specValue}>{location.portfolio}</Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <Barcode size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.specLabel}>QR Code</Text>
                  <Text style={styles.specValue}>{location.qrCode || '—'}</Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <FileText size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.specLabel}>Property Type</Text>
                  <Text style={styles.specValue}>{location.propertyType}</Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <User size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.specLabel}>Site Contact</Text>
                  <Text style={styles.specValue}>{location.responsibleName}</Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <Phone size={14} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.specLabel}>Contact Number</Text>
                  <Text style={styles.specValue}>{location.responsibleContact}</Text>
                </View>
              </View>
            </View>

            {location.logisticsNotes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Access / Logistics Notes</Text>
                <Text style={styles.notesValue}>{location.logisticsNotes}</Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {isReviewMode && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmAndProceed}>
              <LinearGradient
                colors={gradients.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGradient}
              >
                <CheckCircle2 size={18} color="#FFF" />
                <Text style={styles.confirmText}>Confirm Location & Proceed</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.foreground },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    card: { padding: 20, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
    name: { fontSize: 20, fontWeight: '800', color: colors.foreground, marginBottom: 4 },
    subtitle: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
    specsGrid: { gap: 14 },
    specItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    specLabel: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase' },
    specValue: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 2 },
    notesBox: {
      marginTop: 18,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.muted + '33',
    },
    notesLabel: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground, marginBottom: 6, textTransform: 'uppercase' },
    notesValue: { fontSize: 13, color: colors.foreground, lineHeight: 20 },
    footer: { marginTop: 8 },
    confirmBtn: { borderRadius: 16, overflow: 'hidden' },
    confirmGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
    },
    confirmText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  });
