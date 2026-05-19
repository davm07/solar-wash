import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ZoomableSVG } from "../components/ZoomableSVG";
import PlantaSVG from "../components/PlantDemoSVG"; // cambia por el nombre de tu componente

const { width } = Dimensions.get("window");

type SessionState = "idle" | "active" | "scanning";

export default function SessionScreen() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [permission, requestPermission] = useCameraPermissions();

  const PADDING_HORIZONTAL = 16 * 2;
  const svgBaseWidth = width - PADDING_HORIZONTAL;
  const svgBaseHeight = svgBaseWidth * (147.16888 / 367.04461);

  // Datos estáticos de demo
  const mesaActual = "Mesa 05";
  const tiempo = "00:12:34";
  const mesasLavadas = 4;
  const totalMesas = 36;
  const porcentaje = Math.round((mesasLavadas / totalMesas) * 100);

  if (sessionState === "scanning") {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={s.centered}>
          <Text style={s.permissionText}>Se necesita permiso de cámara</Text>
          <TouchableOpacity style={s.btn} onPress={requestPermission}>
            <Text style={s.btnText}>Dar permiso</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={s.scanOverlay}>
          <Text style={s.scanText}>Apunta al código QR de la mesa</Text>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => setSessionState("active")}
          >
            <Text style={s.btnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* SVG ocupa la mayor parte */}
      <View style={s.svgContainer}>
        <ZoomableSVG baseWidth={svgBaseWidth} baseHeight={svgBaseHeight}>
          <PlantaSVG />
        </ZoomableSVG>
      </View>

      {/* Panel inferior */}
      <View style={s.panel}>
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Tiempo</Text>
            <Text style={s.statValue}>{tiempo}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Mesa actual</Text>
            <Text style={s.statValue}>
              {sessionState === "active" ? mesaActual : "—"}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Progreso</Text>
            <Text style={s.statValue}>
              {mesasLavadas}/{totalMesas} · {porcentaje}%
            </Text>
          </View>
        </View>

        {/* Botones */}
        {sessionState === "idle" && (
          <TouchableOpacity
            style={s.btn}
            onPress={() => setSessionState("active")}
          >
            <Text style={s.btnText}>▶ Iniciar jornada</Text>
          </TouchableOpacity>
        )}

        {sessionState === "active" && (
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, s.scanBtn]}
              onPress={() => setSessionState("scanning")}
            >
              <Text style={s.btnText}>📷 Escanear QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.finishBtn]}
              onPress={() => setSessionState("idle")}
            >
              <Text style={s.btnText}>⏹ Finalizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  svgContainer: { flex: 1 },
  panel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  statValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1D9E75",
    textAlign: "center",
  },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    backgroundColor: "#1D9E75",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  scanBtn: { backgroundColor: "#2980b9" },
  finishBtn: { backgroundColor: "#e74c3c" },
  cancelBtn: {
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  permissionText: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  scanOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
});
