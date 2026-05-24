import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Barcode, CheckCircle2 as CheckCircleIcon } from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from '@/app/types/navigation';
import { assets } from '@/data/mockData';
import AssetQrScanner from '@/components/media/AssetQrScanner';

export default function AssetScannerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<any, any>>();
  const { colors, shadows } = useTheme();

  const { id: woId, assetId: targetAssetId } = route.params || {};

  const [barcodeInput, setBarcodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveAsset = (scannedValue: string) => {
    setVerifying(true);
    setError(null);

    const foundAsset = assets.find(
      (a: any) =>
        a.id.toLowerCase() === scannedValue.toLowerCase() ||
        a.serialNumber?.toLowerCase() === scannedValue.toLowerCase() ||
        scannedValue.toLowerCase().includes(a.id.toLowerCase()),
    );

    setTimeout(() => {
      if (foundAsset) {
        if (targetAssetId && foundAsset.id.toLowerCase() !== targetAssetId.toLowerCase()) {
          setVerifying(false);
          setError(`Incorrect Asset. Please scan QR for ${targetAssetId}`);
        } else {
          handleVerificationSuccess(foundAsset.id);
        }
      } else if (targetAssetId && scannedValue.toLowerCase() === targetAssetId.toLowerCase()) {
        handleVerificationSuccess(targetAssetId);
      } else {
        setVerifying(false);
        setError('Asset not found in system.');
      }
    }, 800);
  };

  const handleVerificationSuccess = (foundAssetId: string) => {
    setSuccess(true);
    setVerifying(false);
    setTimeout(() => {
      navigation.navigate('AssetDetails', {
        assetId: foundAssetId,
        isReviewMode: !!woId,
        workOrderId: woId,
      });

      setTimeout(() => {
        setSuccess(false);
        setVerifying(false);
      }, 500);
    }, 1200);
  };

  const handleQrScanned = (data: string) => {
    resolveAsset(data.trim());
  };

  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;
    resolveAsset(barcodeInput.trim());
  };

  const styles = getStyles(colors, shadows);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PageHeader
        title={woId ? 'Verify Asset' : 'Quick Scan'}
        showBack={true}
        onBack={() => navigation.goBack()}
        backgroundColor={colors.card}
        textColor={colors.foreground}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Animated.View entering={FadeIn} style={styles.content}>
          <Text style={styles.instructionText}>
            {woId
              ? `Please scan the QR code for asset ${targetAssetId} to verify before starting work.`
              : 'Point camera at any Asset QR code or Barcode to view technical details.'}
          </Text>

          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconBubble}>
                <CheckCircleIcon size={48} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Asset Located!</Text>
              <Text style={styles.successDesc}>Redirecting to asset details...</Text>
            </View>
          ) : (
            <View style={styles.scannerView}>
              <View style={styles.scanArea}>
                <AssetQrScanner
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
                    placeholder="e.g. AST-003"
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
                    <Text style={styles.lookupBtnText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const getStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, flex: 1 },
    instructionText: {
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 22,
      marginBottom: 24,
      textAlign: 'center',
      fontWeight: '500',
    },
    scannerView: { gap: 24, flex: 1 },
    scanArea: {
      flex: 1,
      minHeight: 320,
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
    successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -40 },
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
