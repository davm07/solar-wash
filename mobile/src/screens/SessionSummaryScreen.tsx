import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../utils/api";

export default function SessionSummaryScreen({ route, navigation }: any) {
  const { sessionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}/summary`);
      setSummary(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h}h ${m}m ${s}s`;
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
        <Text>No se pudo cargar el resumen</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
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
});
