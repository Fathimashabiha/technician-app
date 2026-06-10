import { View, Text, StyleSheet } from "react-native";
import { QrCode } from "lucide-react-native";
import { isExpoCameraAvailable } from "@/lib/nativeMedia";
import { COLORS } from "@/app/constants/theme";
import type { AssetQrScannerProps } from "./AssetQrScannerNative";

export type { AssetQrScannerProps };

function AssetQrScannerFallback({
  errorMessage,
  layout = "inline",
}: Pick<AssetQrScannerProps, "errorMessage" | "layout">) {
  const isFull = layout === "full" || layout === "embedded";
  return (
    <View style={[styles.fallbackBox, isFull && styles.fallbackFull]}>
      <View style={styles.iconWrap}>
        <QrCode size={36} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>QR camera not available</Text>
      <Text style={styles.sub}>
        Live scanning needs a dev build with expo-camera. Use manual entry below.
      </Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

export default function AssetQrScanner(props: AssetQrScannerProps) {
  if (!isExpoCameraAvailable()) {
    return (
      <AssetQrScannerFallback errorMessage={props.errorMessage} layout={props.layout} />
    );
  }

  const AssetQrScannerNative = require("./AssetQrScannerNative").default;
  return <AssetQrScannerNative {...props} />;
}

const styles = StyleSheet.create({
  fallbackBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
    height: 240,
    borderRadius: 20,
  },
  fallbackFull: { flex: 1, height: undefined, borderRadius: 0 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ecfeff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  sub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  errorText: { marginTop: 12, fontSize: 13, color: "#dc2626", textAlign: "center" },
});
