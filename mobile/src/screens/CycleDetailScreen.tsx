import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../utils/api";

interface CycleSummary {
  cycle: { id: string; plantId: string; startedAt: string; finishedAt: string | null };
  mesasDone: number;
  totalMesas: number;
  percentage: number;
  sessions: {
    id: string;
    technicianId: string;
    startedAt: string;
    finishedAt: string | null;
    technicianName: string;
    mesasWashed: number;
  }[];
  technicians: {
    id: string;
    name: string;
    mesasWashed: number;
    sessionCount: number;
  }[];
}

export default function CycleDetailScreen({ route, navigation }: any) {
  const { cycleId } = route.params;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CycleSummary | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get(`/sessions/cycles/${cycleId}/summary`);
      setSummary(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getCycleDate = (start: string, end: string | null) => {
    const s = new Date(start);
    const sStr = `${s.getDate()}/${s.getMonth() + 1}/${s.getFullYear()}`;
    if (!end) return `${sStr} - En curso`;
    const e = new Date(end);
    const eStr = `${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`;
    return `${sStr} - ${eStr}`;
  };

  const formatDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    const h = Math.floor(diffInSeconds / 3600);
    const m = Math.floor((diffInSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text>No se pudo cargar el resumen del ciclo</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Resumen del ciclo</Text>
        <Text style={styles.subtitle}>
          {summary.cycle.finishedAt ? "Finalizado" : "En progreso"}
        </Text>

        {/* DATES & DURATION */}
        <View style={styles.card}>
          <Text style={styles.label}>Período</Text>
          <Text style={styles.value}>
            {getCycleDate(summary.cycle.startedAt, summary.cycle.finishedAt)}
          </Text>
          <Text style={styles.meta}>
            Duración: {formatDuration(summary.cycle.startedAt, summary.cycle.finishedAt)}
          </Text>
        </View>

        {/* PROGRESS */}
        <View style={styles.card}>
          <View style={styles.progressRow}>
            <Text style={styles.label}>Progreso</Text>
            <Text style={styles.progressPercent}>{summary.percentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${summary.percentage}%` }]}
            />
          </View>
          <Text style={styles.meta}>
            {summary.mesasDone} / {summary.totalMesas} mesas lavadas
          </Text>
        </View>

        {/* TECHNICIANS */}
        {summary.technicians.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contribución por técnico</Text>
            {summary.technicians.map((tech) => (
              <View key={tech.id} style={styles.techRow}>
                <View>
                  <Text style={styles.techName}>{tech.name}</Text>
                  <Text style={styles.techMeta}>{tech.sessionCount} sesiones</Text>
                </View>
                <View style={styles.techRight}>
                  <Text style={styles.techMesas}>{tech.mesasWashed} mesas</Text>
                  <Text style={styles.techPercent}>
                    {summary.totalMesas > 0
                      ? Math.round((tech.mesasWashed / summary.totalMesas) * 100)
                      : 0}
                    %
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SESSIONS */}
        {summary.sessions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sesiones del ciclo</Text>
            {summary.sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionItem}
                onPress={() =>
                  navigation.navigate("SessionSummary", { sessionId: session.id })
                }
              >
                <View>
                  <Text style={styles.sessionTech}>{session.technicianName}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.startedAt).toLocaleDateString()}
                    {session.finishedAt &&
                      ` - ${new Date(session.finishedAt).toLocaleDateString()}`}
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionMesas}>{session.mesasWashed} mesas</Text>
                  <Text style={styles.sessionStatus}>
                    {session.finishedAt ? "Finalizada" : "En curso"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { fontSize: 14, color: "#1D9E75", marginBottom: 12, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 10 },
  label: { fontSize: 12, color: "#888" },
  value: { fontSize: 16, fontWeight: "bold", color: "#1D9E75", marginTop: 4 },
  meta: { fontSize: 12, color: "#888", marginTop: 6 },

  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressPercent: { fontSize: 16, fontWeight: "bold", color: "#1D9E75" },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#1D9E75", borderRadius: 4 },

  techRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  techName: { fontSize: 14, fontWeight: "500" },
  techMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  techRight: { alignItems: "flex-end" },
  techMesas: { fontSize: 14, fontWeight: "bold", color: "#1D9E75" },
  techPercent: { fontSize: 12, color: "#888" },

  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  sessionTech: { fontSize: 14, fontWeight: "500" },
  sessionDate: { fontSize: 12, color: "#888", marginTop: 2 },
  sessionRight: { alignItems: "flex-end" },
  sessionMesas: { fontSize: 14, fontWeight: "bold", color: "#1D9E75" },
  sessionStatus: { fontSize: 12, color: "#888" },
});
