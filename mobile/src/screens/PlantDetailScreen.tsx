import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import api from "../utils/api";
import { useAppStore } from "../store/useAppStore";
import { parseSvg, ParsedSvg } from "../utils/parseSvg";
import { SkiaPlantMap } from "../components/SkiaPlantMap";

interface ActiveCycleData {
  cycle: {
    id: string;
    plantId: string;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  mesasDone: number;
  totalMesas: number;
  percentage: number;
  sessionCount: number;
  technicianCount: number;
}

interface CycleHistoryItem {
  id: string;
  plantId: string;
  startedAt: string;
  finishedAt: string | null;
  mesasDone: number;
  totalMesas: number;
  percentage: number;
  sessionCount: number;
  technicianCount: number;
}

interface Session {
  id: string;
  plantId: string;
  technicianId: string;
  startedAt: string;
  finishedAt: string | null;
  cycleId: string | null;
}

export default function PlantDetailScreen({ navigation }: any) {
  const plant = useAppStore((s) => s.plant);
  const setSession = useAppStore((s) => s.setSession);

  const [activeCycle, setActiveCycle] = useState<ActiveCycleData | null>(null);
  const [cycleHistory, setCycleHistory] = useState<CycleHistoryItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsedSvg, setParsedSvg] = useState<ParsedSvg | null>(null);
  const [mesasCycle, setMesasCycle] = useState<Record<string, string>>({});
  const [mapLoading, setMapLoading] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const fetchData = async () => {
    if (!plant?.id) return;
    try {
      const [activeRes, historyRes, sessionsRes] = await Promise.all([
        api.get(`/sessions/cycles/active/${plant.id}`),
        api.get(`/sessions/cycles/list/${plant.id}`),
        api.get(`/sessions/${plant.id}`),
      ]);
      setActiveCycle(activeRes.data);
      setCycleHistory(historyRes.data);
      setSessions(sessionsRes.data);

      // Fetch cycle summary for map if there's an active cycle
      if (activeRes.data?.cycle?.id) {
        fetchCycleMap(activeRes.data.cycle.id);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "Error al cargar datos",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCycleMap = async (cycleId: string) => {
    try {
      setMapLoading(true);
      const { data } = await api.get(`/sessions/cycles/${cycleId}/summary`);

      if (data.svgContent) {
        const parsed = parseSvg(data.svgContent);
        setParsedSvg(parsed);
      }

      if (data.mesasCycle) {
        const stateMap: Record<string, string> = {};
        for (const m of data.mesasCycle) {
          stateMap[m.code] = m.status;
        }
        setMesasCycle(stateMap);
      }
    } catch (error) {
      console.log("Error loading cycle map:", error);
    } finally {
      setMapLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [plant?.id]),
  );

  const handleStartSession = async () => {
    if (!plant?.id) return;
    try {
      const { data } = await api.post("/sessions/start", { plantId: plant.id });
      setSession({ ...data, status: "active" });
      navigation.navigate("Session");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "No se pudo iniciar la sesión",
      );
    }
  };

  const handleResumeSession = (session: Session) => {
    setSession({ ...session, status: "active" });
    navigation.navigate("Session");
  };

  const finishedCycles = cycleHistory.filter((c) => c.finishedAt !== null);

  const activeSession = sessions.find((s) => !s.finishedAt);

  const getCycleDate = (start: string, end: string | null) => {
    const s = new Date(start);
    const sStr = `${s.getDate()}/${s.getMonth() + 1}`;
    if (!end) return `${sStr} - En curso`;
    const e = new Date(end);
    const eStr = `${e.getDate()}/${e.getMonth() + 1}`;
    return `${sStr} - ${eStr}`;
  };

  const getSessionDate = (start: string, end: string | null) => {
    const s = new Date(start);
    const sStr = `${s.getDate()}/${s.getMonth() + 1}/${s.getFullYear()}`;
    if (!end) return `${sStr} - En curso`;
    const e = new Date(end);
    const eStr = `${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`;
    return `${sStr} - ${eStr}`;
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        {/* HEADER */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Volver</Text>
        </TouchableOpacity>

        <Text style={s.title}>{plant?.name}</Text>
        <Text style={s.subtitle}>{plant?.location}</Text>
        <Text style={s.subtitle}>{plant?.totalMesas} mesas</Text>

        {/* ACTIVE SESSION RESUME */}
        {activeSession && (
          <TouchableOpacity
            style={s.resumeCard}
            onPress={() => handleResumeSession(activeSession)}
          >
            <Text style={s.resumeLabel}>Sesión en curso</Text>
            <Text style={s.resumeBtn}>Reanudar sesión →</Text>
          </TouchableOpacity>
        )}

        {/* ACTIVE CYCLE */}
        {activeCycle?.cycle && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Ciclo activo</Text>
            <View style={s.progressRow}>
              <Text style={s.progressText}>
                {activeCycle.mesasDone}/{activeCycle.totalMesas} (
                {activeCycle.percentage}%)
              </Text>
            </View>
            <View style={s.progressBar}>
              <View
                style={[
                  s.progressFill,
                  { width: `${activeCycle.percentage}%` },
                ]}
              />
            </View>
            <Text style={s.cardMeta}>
              Sesiones: {activeCycle.sessionCount} · Técnicos:{" "}
              {activeCycle.technicianCount}
            </Text>

            {/* CYCLE MAP */}
            {mapLoading ? (
              <View style={s.mapLoading}>
                <ActivityIndicator size="small" color="#1D9E75" />
                <Text style={s.mapLoadingText}>Cargando plano...</Text>
              </View>
            ) : parsedSvg ? (
              <View style={s.mapSection}>
                <View
                  style={s.mapContainer}
                  onLayout={(e) => {
                    const { width: w, height: h } = e.nativeEvent.layout;
                    setContainerSize({ width: w, height: h });
                  }}
                >
                  {containerSize.width > 0 && (
                    <SkiaPlantMap
                      parsedSvg={parsedSvg}
                      width={containerSize.width - 20}
                      height={containerSize.height - 20}
                      mesasState={mesasCycle}
                    />
                  )}
                </View>
              </View>
            ) : null}

            {/* Sessions in active cycle */}
            {sessions
              .filter((ses) => ses.cycleId === activeCycle.cycle?.id)
              .map((ses) => (
                <TouchableOpacity
                  key={ses.id}
                  style={s.sessionItem}
                  onPress={() =>
                    navigation.navigate("SessionSummary", { sessionId: ses.id })
                  }
                >
                  <View>
                    <Text style={s.sessionDate}>
                      {getSessionDate(ses.startedAt, ses.finishedAt)}
                    </Text>
                    <Text style={s.sessionStatus}>Ir a resumen →</Text>
                  </View>
                  <Text style={s.sessionStatus}>
                    {ses.finishedAt ? "Finalizada" : "En curso"}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* FINISHED CYCLES */}
        {finishedCycles.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Ciclos anteriores</Text>
            {finishedCycles.map((cycle) => (
              <TouchableOpacity
                key={cycle.id}
                style={s.cycleItem}
                onPress={() =>
                  navigation.navigate("CycleDetail", { cycleId: cycle.id })
                }
              >
                <View>
                  <Text style={s.cycleDate}>
                    {getCycleDate(cycle.startedAt, cycle.finishedAt)}
                  </Text>
                  <Text style={s.cycleMeta}>
                    {cycle.sessionCount} sesiones · {cycle.technicianCount}{" "}
                    técnicos
                  </Text>
                </View>
                <Text style={s.cyclePercent}>{cycle.percentage}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* NO CYCLES MESSAGE */}
        {!activeCycle?.cycle && finishedCycles.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>
              No hay ciclos ni sesiones asignadas a esta planta
            </Text>
          </View>
        )}

        {/* START SESSION BUTTON */}
        <TouchableOpacity style={s.startBtn} onPress={handleStartSession}>
          <Text style={s.startBtnText}>Iniciar jornada</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { fontSize: 14, color: "#1D9E75", marginBottom: 12, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 2 },

  resumeCard: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  resumeLabel: { fontSize: 13, color: "#92400e", fontWeight: "600" },
  resumeBtn: {
    fontSize: 15,
    color: "#92400e",
    fontWeight: "bold",
    marginTop: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 10 },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: { fontSize: 14, fontWeight: "bold", color: "#1D9E75" },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#1D9E75", borderRadius: 4 },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 8 },

  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 10,
  },
  sessionDate: { fontSize: 13, color: "#374151" },
  sessionStatus: { fontSize: 12, color: "#888" },

  cycleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    marginTop: 8,
  },
  cycleDate: { fontSize: 14, fontWeight: "500", color: "#374151" },
  cycleMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  cyclePercent: { fontSize: 14, fontWeight: "bold", color: "#1D9E75" },

  startBtn: {
    marginTop: 24,
    marginBottom: 40,
    backgroundColor: "#1D9E75",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  mapLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  mapLoadingText: { fontSize: 13, color: "#888" },
  mapSection: { marginTop: 12 },
  mapContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    height: 300,
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
});
