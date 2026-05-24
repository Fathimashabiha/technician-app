import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { QrCode } from "lucide-react-native";
import { COLORS } from "@/app/constants/theme";

type Props = {
  onScanSuccess: (data: string) => void;
  isResolving?: boolean;
  errorMessage?: string | null;
};

export default function AssetQrScannerNative({
  onScanSuccess,
  isResolving = false,
  errorMessage,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    scanLockRef.current = false;
  }, [errorMessage]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanLockRef.current || isResolving) return;
    scanLockRef.current = true;
    onScanSuccess(data);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <View style={styles.permissionIcon}>
          <QrCode size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSub}>
          Allow camera access to scan the asset QR code on the equipment tag.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={isResolving ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.hint}>Align the asset QR code inside the frame</Text>
        {isResolving && (
          <View style={styles.resolvingRow}>
            <ActivityIndicator color="white" />
            <Text style={styles.resolvingText}>Verifying asset...</Text>
          </View>
        )}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <TouchableOpacity style={styles.torchBtn} onPress={() => setTorchOn((v) => !v)}>
          <Text style={styles.torchBtnText}>{torchOn ? "Turn Off Flash" : "Turn On Flash"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME = 240;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", minHeight: 280 },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 24,
  },
  scanFrame: { width: FRAME, height: FRAME, position: "relative" },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#fff" },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  hint: { color: "white", fontSize: 14, marginTop: 24, textAlign: "center" },
  resolvingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  resolvingText: { color: "white", fontSize: 13, fontWeight: "600" },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
    backgroundColor: "rgba(127,29,29,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  torchBtn: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  torchBtnText: { color: "white", fontSize: 13, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 280 },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
    minHeight: 280,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  permissionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  permissionSub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
});
