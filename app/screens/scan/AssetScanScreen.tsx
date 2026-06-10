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
import { useNavigation } from '@react-navigation/native';
import { Barcode, CheckCircle2 as CheckCircleIcon } from 'lucide-react-native';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/app/constants/theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '@/app/types/navigation';
import AssetQrScanner from '@/components/media/AssetQrScanner';
import { resolveAssetFromScan } from '@/lib/assetService';

export default function AssetScanScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { colors, shadows, isDark } = useTheme();
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerificationSuccess = (assetId: string) => {
    setSuccess(true);
    setError(null);
    setTimeout(() => {
      navigation.navigate('Maintenance', { 
        screen: 'AssetDetails',
        params: { assetId: assetId }
      });
      
      // Reset state for next time
      setTimeout(() => {
        setSuccess(false);
        setVerifying(false);
        setBarcodeInput('');
      }, 500);
    }, 1200);
  };

  const resolveAsset = async (scannedValue: string) => {
    setVerifying(true);
    setError(null);

    const assetId = await resolveAssetFromScan(scannedValue);
    setVerifying(false);

    if (assetId) {
      handleVerificationSuccess(assetId);
    } else {
      setError('Asset not found. Please check the code and try again.');
    }
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <PageHeader 
        title="Quick Scan" 
        showBack={false} 
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
            <Text style={styles.instructionText}>
              Scan any Asset QR code or Barcode to view immediate technical details, manuals, and history.
            </Text>

            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconBubble}>
                  <CheckCircleIcon size={48} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>Asset Located!</Text>
                <Text style={styles.successDesc}>Loading asset dashboard...</Text>
              </View>
            ) : (
              <View style={styles.scannerView}>
                <View style={styles.scanArea}>
                  <AssetQrScanner
                    layout="embedded"
                    hintText="Point at an asset QR or barcode"
                    onScanSuccess={handleQrScanned}
                    isResolving={verifying}
                    errorMessage={null}
                  />
                </View>

                <Card style={styles.manualEntryCard}>
                  <View style={styles.manualEntryHeader}>
                    <Barcode size={16} color={colors.primary} />
                    <Text style={styles.manualEntryTitle}>Manual Entry</Text>
                  </View>

                  {error && (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.manualInputRow}>
                    <TextInput
                      placeholder="Enter Asset ID or Serial"
                      placeholderTextColor={colors.mutedForeground}
                      value={barcodeInput}
                      onChangeText={(txt) => {
                        setBarcodeInput(txt);
                        if (error) setError(null);
                      }}
                      style={styles.barcodeInput}
                      editable={!verifying}
                    />
                    <TouchableOpacity
                      onPress={handleBarcodeSubmit}
                      style={[styles.lookupBtn, !barcodeInput.trim() && { opacity: 0.5 }]}
                      disabled={verifying || !barcodeInput.trim()}
                    >
                      <Text style={styles.lookupBtnText}>Lookup</Text>
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

const getStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  instructionText: {
    fontSize: 15,
    color: colors.mutedForeground,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  scannerView: {
    gap: 24,
  },
  scanArea: {
    width: '100%',
    height: 420,
    backgroundColor: '#000',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  scanTarget: {
    position: 'absolute',
    top: 60,
    bottom: 60,
    left: 60,
    right: 60,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderRadius: 24,
    borderStyle: 'dashed',
  },
  scanLine: {
    position: 'absolute',
    width: '90%',
    height: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    borderRadius: 2,
  },
  scanOverlay: {
    alignItems: 'center',
    zIndex: 10,
  },
  scanText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },
  manualEntryCard: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
  },
  manualEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  manualEntryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  barcodeInput: {
    flex: 1,
    height: 50,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lookupBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    ...shadows.card,
  },
  lookupBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: colors.destructive + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.destructive + '20',
  },
  errorText: {
    color: colors.destructive,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  successContainer: {
    minHeight: 360,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconBubble: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
});
