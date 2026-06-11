import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../utils/api";
import { parseSvg, ParsedSvg } from "../utils/parseSvg";
import { SkiaPlantMap } from "../components/SkiaPlantMap";

export default function SessionSummaryScreen({ route, navigation }: any) {
  const { sessionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [parsedSvg, setParsedSvg] = useState<ParsedSvg | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}/summary`);
      setSummary(data);

      if (data.session.plant.svgContent) {
        const parsed = parseSvg(data.session.plant.svgContent);
        setParsedSvg(parsed);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const totalSeconds = Math.round(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h}h ${m}m ${s}s`;
  };

  const mesasState: Record<string, string> = summary?.mesasSession
    ? Object.fromEntries(
        summary.mesasSession.map((m: any) => [m.code, m.status]),
      )
    : {};

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
        <Text>No se pudo cargar el resumen</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Resumen de sesión</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Planta</Text>
          <Text style={styles.value}>{summary.session.plant.name}</Text>
          <Text style={styles.value}>
            <Text
              style={[
                {
                  color: "#888",
                  fontWeight: "normal",
                },
              ]}
            >
              Ubicación:
            </Text>{" "}
            {summary.session.plant.location}
          </Text>

          <Text style={styles.label}>Técnico a cargo</Text>
          <Text style={styles.value}>{summary.session.technician.name}</Text>

          <Text style={styles.label}>Mesas lavadas</Text>
          <Text style={styles.value}>
            {summary.mesasLavadas} / {summary.totalMesas}
          </Text>

          <Text style={styles.label}>Progreso</Text>
          <Text style={styles.value}>{summary.porcentaje}%</Text>

          <Text style={styles.label}>Duración</Text>
          <Text style={styles.value}>
            {formatDuration(summary.duracionTotal)}
          </Text>
        </View>

        {/* SVG MAP */}
        {parsedSvg && (
          <View style={styles.mapSection}>
            <View
              style={styles.mapContainer}
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
                  mesasState={mesasState}
                />
              )}
            </View>
            <Text style={styles.mapHint}>
              Solo las mesas terminadas o en progreso son mostradas en esta
              sección
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "PlantSelect" }],
            })
          }
        >
          <Text style={styles.btnText}>Volver a plantas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },

  label: {
    fontSize: 12,
    color: "#888",
    marginTop: 10,
  },

  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1D9E75",
  },

  btn: {
    marginTop: 20,
    backgroundColor: "#1D9E75",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  mapSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  mapContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    height: 400,
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  mapHint: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
  },
});
