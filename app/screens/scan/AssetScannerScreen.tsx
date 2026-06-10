import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Barcode, CheckCircle2 as CheckCircleIcon } from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AssetQrScanner from '@/components/media/AssetQrScanner';
import { lookupAssetByScan } from '@/lib/assetService';
import { lookupLocationByScan } from '@/lib/locationService';
import { normalizeLocationScanCode } from '@/lib/normalizeLocationScanCode';
import { verifyWorkOrderAsset } from '@/lib/workOrderService';

type VerifyAssetResponse = {
  matched: boolean;
  message?: string;
};

function locationMatchesTarget(
  location: { id: string; locationId: string; qrCode: string; name: string },
  targetLocationRef?: string | null,
  targetLocationLabel?: string
): boolean {
  const expected = (targetLocationRef ?? targetLocationLabel ?? '').trim().toLowerCase();
  if (!expected) return true;

  const candidates = [location.id, location.locationId, location.qrCode, location.name]
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some(
    (candidate) =>
      candidate === expected ||
      candidate.includes(expected) ||
      expected.includes(candidate)
  );
}

export default function AssetScannerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<any, any>>();
  const { colors, shadows } = useTheme();

  const {
    id: woId,
    assetId: targetAssetId,
    scope = 'asset',
    location,
    locationRef,
    returnTo,
    scheduleId,
  } = route.params || {};

  const isPpmFlow = returnTo === 'PpmExecutionDetails';
  const ppmScheduleId = scheduleId ?? woId;
  const isLocationScope = scope === 'location';
  const isLocationVerify = isLocationScope && !!woId;
  const isQuickScan = !woId;

  const [barcodeInput, setBarcodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successKind, setSuccessKind] = useState<'asset' | 'location'>('asset');
  const [error, setError] = useState<string | null>(null);

  const looksLikeLocationScan = (value: string): boolean => {
    const v = normalizeLocationScanCode(value);
    return /^LQR-/i.test(v) || /\/locations\/scan\//i.test(value) || /^LOC[-_]/i.test(v);
  };

  const navigateToLocationDetails = (foundLocationId: string, reviewMode: boolean) => {
    navigation.navigate('LocationDetails', {
      locationId: foundLocationId,
      isReviewMode: reviewMode,
      workOrderId: woId ?? ppmScheduleId,
      scheduleId: ppmScheduleId,
      returnTo: isPpmFlow ? 'PpmExecutionDetails' : undefined,
    } as never);
  };

  const handleLocationVerificationSuccess = (foundLocationId?: string) => {
    setSuccess(true);
    setVerifying(false);
    setTimeout(() => {
      if (foundLocationId) {
        navigateToLocationDetails(foundLocationId, true);
      } else if (isPpmFlow && ppmScheduleId) {
        navigation.navigate('PpmExecutionDetails', {
          scheduleId: ppmScheduleId,
          stepCompleted: 'qr_scan',
        } as never);
      } else {
        navigation.navigate('Maintenance', {
          screen: 'WorkOrderDetails',
          params: { id: woId, stepCompleted: 'qr_scan' },
        } as never);
      }
      setTimeout(() => {
        setSuccess(false);
        setVerifying(false);
      }, 500);
    }, 1200);
  };

  const verifyLocationForWorkOrder = async (scannedValue: string) => {
    if (!woId) return;
    setVerifying(true);
    setError(null);

    try {
      const result = (await verifyWorkOrderAsset(
        woId,
        scannedValue
      )) as VerifyAssetResponse;

      if (!result.matched) {
        setVerifying(false);
        setError(result.message ?? 'Incorrect location. Scan the QR for this work order site.');
        return;
      }

      const resolved = await lookupLocationByScan(scannedValue);
      handleLocationVerificationSuccess(resolved?.id);
    } catch (err: unknown) {
      setVerifying(false);
      setError(err instanceof Error ? err.message : 'Location verification failed.');
    }
  };

  const resolveLocation = async (scannedValue: string) => {
    setVerifying(true);
    setError(null);

    try {
      const resolved = await lookupLocationByScan(scannedValue);
      if (!resolved?.id) {
        setVerifying(false);
        setError(
          'Location not found. Check sz-contract-service is running and UPSTREAM_CONTRACT_MODE=http on technician-service.'
        );
        return;
      }

      if (
        isLocationVerify &&
        !locationMatchesTarget(resolved, locationRef, location)
      ) {
        setVerifying(false);
        setError(`Incorrect location. Please scan QR for ${locationRef || location || 'this site'}`);
        return;
      }

      setSuccess(true);
      setVerifying(false);
      setTimeout(() => {
        navigateToLocationDetails(resolved.id, isLocationVerify || isPpmFlow);
        setTimeout(() => {
          setSuccess(false);
          setVerifying(false);
        }, 500);
      }, 1200);
    } catch (err: unknown) {
      setVerifying(false);
      setError(err instanceof Error ? err.message : 'Could not look up location.');
    }
  };

  const resolveAsset = async (scannedValue: string) => {
    setVerifying(true);
    setError(null);

    try {
      const asset = await lookupAssetByScan(scannedValue);
      const assetId = asset?.id ?? null;

      if (!assetId) {
        setVerifying(false);
        setError(
          'Asset not found. Check sz-asset-service is running and UPSTREAM_ASSET_MODE=http on technician-service.'
        );
        return;
      }

      if (targetAssetId && assetId.toLowerCase() !== targetAssetId.toLowerCase()) {
        setVerifying(false);
        setError(`Incorrect asset. Please scan QR for ${targetAssetId}`);
        return;
      }

      handleVerificationSuccess(assetId);
    } catch (err: unknown) {
      setVerifying(false);
      setError(err instanceof Error ? err.message : 'Could not look up asset.');
    }
  };

  const resolveQuickScan = async (scannedValue: string) => {
    setVerifying(true);
    setError(null);

    try {
      if (looksLikeLocationScan(scannedValue)) {
        const location = await lookupLocationByScan(scannedValue);
        if (location?.id) {
          setSuccessKind('location');
          setSuccess(true);
          setVerifying(false);
          setTimeout(() => {
            navigation.navigate('LocationDetails', { locationId: location.id } as never);
            setTimeout(() => {
              setSuccess(false);
              setVerifying(false);
            }, 500);
          }, 1200);
          return;
        }
      }

      const asset = await lookupAssetByScan(scannedValue);
      if (asset?.id) {
        handleVerificationSuccess(asset.id);
        return;
      }

      const location = await lookupLocationByScan(scannedValue);
      if (location?.id) {
        setSuccessKind('location');
        setSuccess(true);
        setVerifying(false);
        setTimeout(() => {
          navigation.navigate('LocationDetails', { locationId: location.id } as never);
          setTimeout(() => {
            setSuccess(false);
            setVerifying(false);
          }, 500);
        }, 1200);
        return;
      }

      setVerifying(false);
      setError(
        'QR code not recognized. Scan a registered asset barcode or a contract-service location QR (LQR-…).'
      );
    } catch (err: unknown) {
      setVerifying(false);
      setError(err instanceof Error ? err.message : 'Could not look up scan code.');
    }
  };

  const handleVerificationSuccess = (foundAssetId: string) => {
    setSuccessKind('asset');
    setSuccess(true);
    setVerifying(false);
    setTimeout(() => {
      if (isPpmFlow && ppmScheduleId) {
        navigation.navigate('AssetDetails', {
          assetId: foundAssetId,
          isReviewMode: true,
          workOrderId: ppmScheduleId,
          scheduleId: ppmScheduleId,
          returnTo: 'PpmExecutionDetails',
        } as never);
      } else {
        navigation.navigate('AssetDetails', {
          assetId: foundAssetId,
          isReviewMode: !!woId,
          workOrderId: woId,
        });
      }

      setTimeout(() => {
        setSuccess(false);
        setVerifying(false);
      }, 500);
    }, 1200);
  };

  const handleQrScanned = (data: string) => {
    const value = data.trim();
    if (isQuickScan) {
      void resolveQuickScan(value);
      return;
    }
    if (isLocationScope) {
      if (isLocationVerify) {
        void verifyLocationForWorkOrder(value);
        return;
      }
      void resolveLocation(value);
      return;
    }
    void resolveAsset(value);
  };

  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;
    handleQrScanned(barcodeInput.trim());
  };

  const pageTitle = woId
    ? isLocationScope
      ? 'Verify Location'
      : 'Verify Asset'
    : 'Quick Scan';

  const instructionText = woId
    ? isLocationScope
      ? `Scan the location QR for ${locationRef || location || 'this site'} before continuing.`
      : `Please scan the QR code for asset ${targetAssetId} to verify before starting work.`
    : 'Point camera at any Asset or Location QR code to view details.';

  const showLocationSuccess = isLocationScope || (isQuickScan && successKind === 'location');
  const successTitle = showLocationSuccess ? 'Location Located!' : 'Asset Located!';
  const successDesc = showLocationSuccess
    ? 'Redirecting to location details...'
    : 'Redirecting to asset details...';

  const styles = getStyles(colors, shadows);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PageHeader
        title={pageTitle}
        showBack={true}
        onBack={() => navigation.goBack()}
        backgroundColor={colors.card}
        textColor={colors.foreground}
      />
      <KeyboardAvoidingView
        style={styles.mainContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn} style={styles.content}>
            <Text style={styles.instructionText}>{instructionText}</Text>

            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconBubble}>
                  <CheckCircleIcon size={48} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>{successTitle}</Text>
                <Text style={styles.successDesc}>{successDesc}</Text>
              </View>
            ) : (
              <View style={styles.scannerView}>
                <View style={styles.scanArea}>
                  <AssetQrScanner
                    layout="embedded"
                    hintText={instructionText}
                    onScanSuccess={handleQrScanned}
                    isResolving={verifying}
                    errorMessage={error}
                  />
                </View>

                <Card style={styles.manualEntryCard}>
                  <View style={styles.manualEntryHeader}>
                    <Barcode size={16} color={colors.primary} />
                    <Text style={styles.manualEntryTitle}>Manual Entry</Text>
                  </View>

                  <View style={styles.manualInputRow}>
                    <TextInput
                      placeholder={isLocationScope || isQuickScan ? 'e.g. LQR-123456 or AST-003' : 'e.g. AST-003'}
                      placeholderTextColor={colors.mutedForeground}
                      value={barcodeInput}
                      onChangeText={(t) => {
                        setBarcodeInput(t);
                        if (error) setError(null);
                      }}
                      style={styles.barcodeInput}
                      editable={!verifying}
                    />
                    <TouchableOpacity
                      onPress={handleBarcodeSubmit}
                      style={styles.lookupBtn}
                      disabled={verifying}
                    >
                      <Text style={styles.lookupBtnText}>
                        {isQuickScan ? 'Look up' : 'Verify'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    mainContent: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    content: { paddingHorizontal: 24, paddingTop: 24 },
    instructionText: {
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 22,
      marginBottom: 24,
      textAlign: 'center',
      fontWeight: '500',
    },
    scannerView: { gap: 24 },
    scanArea: {
      height: 420,
      borderRadius: 32,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    manualEntryCard: { padding: 16 },
    manualEntryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    manualEntryTitle: { fontSize: 12, fontWeight: '700', color: colors.foreground },
    manualInputRow: { flexDirection: 'row', gap: 10 },
    barcodeInput: {
      flex: 1,
      height: 48,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 12,
      fontSize: 13,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lookupBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    lookupBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    successContainer: {
      minHeight: 360,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successIconBubble: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.success + '1A',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
    successDesc: { fontSize: 14, color: colors.mutedForeground },
  });
