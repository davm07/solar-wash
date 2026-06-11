import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import api from "../utils/api";
import { parseSvg, ParsedSvg } from "../utils/parseSvg";
import { SkiaPlantMap } from "../components/SkiaPlantMap";

type Mode = "view" | "scanning";
export type MesaStatus = "pending" | "in_progress" | "done";

export default function SessionScreen({ navigation }: any) {
  const [mode, setMode] = useState<Mode>("view");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [parsedSvg, setParsedSvg] = useState<ParsedSvg | null>(null);
  const [svgLoading, setSvgLoading] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 🧠 ZUSTAND STATE
  const plant = useAppStore((s) => s.plant);
  const session = useAppStore((s) => s.session);
  const currentMesaId = useAppStore((s) => s.currentMesaId);
  const mesas = useAppStore((s) => s.mesas);

  const setSession = useAppStore((s) => s.setSession);
  const endSession = useAppStore((s) => s.endSession);
  const setMesas = useAppStore((s) => s.setMesas);
  const updateMesa = useAppStore((s) => s.updateMesa);
  const setCurrentMesa = useAppStore((s) => s.setCurrentMesa);

  const isActive = !!session?.id;
  const hasMesaInProgress = !!currentMesaId;
  const currentMesa = mesas.find((m) => m.code === currentMesaId);
  const mesaStatus = () => {
    if (currentMesa?.status === "pending") return "Pendiente";
    if (currentMesa?.status === "in_progress") return "En progreso";
    if (currentMesa?.status === "done") return "Finalizada";
  };

  useEffect(() => {
    fetchMesas();
    fetchSvgMap();
  }, []);

  const fetchMesas = async () => {
    try {
      const { data } = await api.get(`/mesas/${plant?.id}`);
      setMesas(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "No se pudieron cargar las mesas",
      );
    }
  };

  const fetchSvgMap = async () => {
    try {
      setSvgLoading(true);
      const { data } = await api.get(`/plants/${plant?.id}/svg`);
      const parsedSvg = parseSvg(data.svg);
      // Aquí podrías hacer algo con el SVG, como guardarlo en el estado si decides mostrarlo en lugar del demo
      setParsedSvg(parsedSvg);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "No se pudo cargar el mapa de la planta",
      );
    } finally {
      setSvgLoading(false);
    }
  };

  // =========================
  // START SESSION (REAL API)
  // =========================
  const startSession = async () => {
    try {
      const { data } = await api.post("/sessions/start", {
        plantId: plant?.id ?? "",
      });
      setSession(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "No se pudo iniciar la sesión",
      );
    }
  };

  // =========================
  // END SESSION (REAL API)
  // =========================
  const finishSession = async () => {
    if (!session?.id) return; // seguridad extra, aunque el botón solo aparece si hay sesión

    // 🚨 VALIDACIÓN
    if (currentMesaId) {
      Alert.alert(
        "Mesa en progreso",
        "Finaliza la mesa actual antes de terminar la jornada",
      );
      return;
    }

    try {
      await api.post(`/sessions/${session.id}/finish`);
      const sessionId = session.id;

      endSession();
      setCurrentMesa(null);

      setMode("view");
      Alert.alert("Sesión finalizada", "¡La jornada ha terminado!");
      navigation.replace("SessionSummary", {
        sessionId,
      });
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "No se pudo finalizar la sesión",
      );
    }
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (scanning) return;
    setScanning(true);

    try {
      const mesa = mesas.find((m) => m.code === data);

      if (!mesa) {
        Alert.alert("Error", "Mesa no encontrada");
        return;
      }

      // decidir acción según estado
      if (mesa.status === "pending") {
        const res = await api.post("/mesas/scan/start", {
          code: data,
          sessionId: session?.id,
        });

        setCurrentMesa(res.data.mesa.code);
        updateMesa(res.data.mesa);
      } else if (mesa.status === "in_progress") {
        const res = await api.post("/mesas/scan/finish", {
          code: data,
          sessionId: session?.id,
        });

        updateMesa(res.data.mesa);
        setCurrentMesa(null);
      } else if (mesa.status === "done") {
        Alert.alert("Mesa ya lavada", "Esta mesa ya fue lavada en esta sesión");
        setScanning(false);
        return;
      }

      setMode("view");
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const message =
        error?.response?.data?.message ||
        error.message ||
        "No se pudo procesar el QR";

      if (code === "ALREADY_WASHED_IN_SESSION") {
        Alert.alert("Mesa ya lavada", message);
      } else if (code === "IN_PROGRESS_BY_OTHER") {
        Alert.alert("Mesa en uso", message);
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setScanning(false);
    }
  };

  // 🧠 DATA REAL
  const mesasLavadas = mesas.filter((m) => m.status === "done").length;
  const totalMesas = plant?.totalMesas ?? 0;
  const porcentaje = totalMesas
    ? Math.round((mesasLavadas / totalMesas) * 100)
    : 0;
  const mesasState = useMemo(
    () =>
      mesas.reduce(
        (acc, m) => {
          acc[m.code] = m.status;
          return acc;
        },
        {} as Record<string, string>,
      ),
    [mesas],
  );

  // =========================
  // SCAN SCREEN
  // =========================
  if (mode === "scanning") {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={s.centered}>
          <Text>Se necesita permiso de cámara</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text>Dar permiso</Text>
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
          onBarcodeScanned={handleScan}
        />

        <View style={s.scanOverlay}>
          <Text style={s.scanText}>Escanea QR de la mesa</Text>

          <TouchableOpacity
            style={s.btn}
            onPress={() => {
              setMode("view");
              setScanning(false);
            }}
          >
            <Text style={s.btnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =========================
  // MAIN VIEW
  // =========================
  return (
    <SafeAreaView style={s.container}>
      <View
        style={s.svgContainer}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setContainerSize({ width: w, height: h });
        }}
      >
        {svgLoading ? (
          <View style={s.centered}>
            <Text>Cargando plano...</Text>
          </View>
        ) : parsedSvg && containerSize.width > 0 ? (
          <SkiaPlantMap
            parsedSvg={parsedSvg}
            width={containerSize.width}
            height={containerSize.height}
            mesasState={mesasState}
          />
        ) : (
          <View style={s.centered}>
            <Text>No se pudo cargar el plano</Text>
          </View>
        )}
      </View>

      <View style={s.panel}>
        {/* STATS */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Planta</Text>
            <Text style={s.statValue}>{plant?.name ?? "—"}</Text>
          </View>

          <View style={s.statBox}>
            <Text style={s.statLabel}>Mesa actual</Text>
            <Text style={s.statValue}>
              {currentMesaId
                ? `${currentMesa?.label} (${mesaStatus()})`
                : "Escanea una mesa"}
            </Text>
          </View>

          <View style={s.statBox}>
            <Text style={s.statLabel}>Progreso</Text>
            <Text style={s.statValue}>
              {isActive ? "Activo" : "Inactivo"} - {porcentaje}% ({mesasLavadas}
              /{totalMesas})
            </Text>
          </View>
        </View>

        {/* BOTONES */}
        {!isActive && (
          <TouchableOpacity
            style={{
              backgroundColor: "#1D9E75",
              padding: 14,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={startSession}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              Iniciar jornada
            </Text>
          </TouchableOpacity>
        )}

        {isActive && (
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, s.scanBtn]}
              onPress={() => setMode("scanning")}
            >
              <Text style={s.btnText}>
                📷 {currentMesaId ? "Finalizar mesa" : "Escanear mesa"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.btn,
                s.finishBtn,
                hasMesaInProgress && {
                  opacity: 0.6,
                },
              ]}
              onPress={finishSession}
              disabled={hasMesaInProgress}
            >
              <Text style={s.btnText}>⏹ Finalizar sesión</Text>
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
    marginTop: 8,
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
