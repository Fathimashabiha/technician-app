import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Flashlight, FlashlightOff, QrCode } from "lucide-react-native";
import { COLORS } from "@/app/constants/theme";

export type AssetQrScannerProps = {
  onScanSuccess: (data: string) => void;
  isResolving?: boolean;
  errorMessage?: string | null;
  /** `full` = screen/modal. `embedded` = fixed-height card. `inline` = compact card. */
  layout?: "full" | "embedded" | "inline";
  hintText?: string;
};

const FRAME_BY_LAYOUT = {
  full: 220,
  embedded: 200,
  inline: 156,
} as const;

/** Space reserved at bottom so controls never cover the scan frame */
const BOTTOM_RESERVE: Record<keyof typeof FRAME_BY_LAYOUT, number> = {
  full: 118,
  embedded: 112,
  inline: 100,
};

export default function AssetQrScannerNative({
  onScanSuccess,
  isResolving = false,
  errorMessage,
  layout = "inline",
  hintText,
}: AssetQrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);
  const [torchOn, setTorchOn] = useState(false);
  const isInline = layout === "inline";
  const frameSize = FRAME_BY_LAYOUT[layout];
  const defaultHint = isInline
    ? "Align the code inside the frame"
    : "Position the QR code inside the frame";

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
      <View style={[styles.centered, !isInline && styles.centeredFill]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionBox, !isInline && styles.permissionBoxFill]}>
        <View style={styles.permissionIcon}>
          <QrCode size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSub}>
          Allow camera access to scan QR codes on asset tags or location signs.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isInline ? styles.containerInline : styles.containerFill,
      ]}
    >
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={isResolving ? undefined : handleBarcodeScanned}
      />

      <View
        style={[styles.overlay, { paddingBottom: BOTTOM_RESERVE[layout] }]}
        pointerEvents="box-none"
      >
        <View style={styles.dimTop} />
        <View style={[styles.middleRow, { height: frameSize }]}>
          <View style={styles.dimSide} />
          <View style={[styles.frameWindow, { width: frameSize, height: frameSize }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {isResolving ? (
              <View style={styles.frameLoading}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            ) : null}
          </View>
          <View style={styles.dimSide} />
        </View>
        <View style={styles.dimBottom} />
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <Text style={styles.hint} numberOfLines={layout === "embedded" ? 1 : 2}>
          {hintText ?? defaultHint}
        </Text>
        {errorMessage ? (
          <Text style={styles.errorText} numberOfLines={2}>
            {errorMessage}
          </Text>
        ) : null}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolBtn, torchOn && styles.toolBtnActive]}
            onPress={() => setTorchOn((v) => !v)}
            accessibilityLabel={torchOn ? "Turn off flash" : "Turn on flash"}
          >
            {torchOn ? (
              <FlashlightOff size={22} color="#fff" />
            ) : (
              <Flashlight size={22} color="#fff" />
            )}
          </TouchableOpacity>
          {isResolving ? <Text style={styles.resolvingText}>Verifying…</Text> : null}
        </View>
      </View>
    </View>
  );
}

const dim: ViewStyle = { backgroundColor: "rgba(0,0,0,0.55)" };

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    overflow: "hidden",
  },
  containerInline: {
    height: 240,
    borderRadius: 20,
  },
  containerFill: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  dimTop: { ...dim, flex: 1 },
  middleRow: { flexDirection: "row" },
  dimSide: { ...dim, flex: 1 },
  dimBottom: { ...dim, flex: 1 },
  frameWindow: {
    position: "relative",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: COLORS.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  frameLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.35)",
    borderRadius: 8,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
    backgroundColor: "rgba(15,23,42,0.72)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  hint: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 12,
    textAlign: "center",
    backgroundColor: "rgba(127,29,29,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "100%",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 48,
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  toolBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  resolvingText: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
  },
  centeredFill: { flex: 1, minHeight: undefined, borderRadius: 0 },
  permissionBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#f8fafc",
    minHeight: 240,
    borderRadius: 20,
  },
  permissionBoxFill: { flex: 1, minHeight: undefined, borderRadius: 0 },
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
    maxWidth: 280,
  },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  permissionBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
});
