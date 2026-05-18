import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import api from "../utils/api";

interface Plant {
  id: string;
  name: string;
  location: string;
  totalMesas: number;
}

export default function PlantSelectScreen({
  onSelectPlant,
}: {
  onSelectPlant: (plant: Plant) => void;
}) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const { data } = await api.get("/plants");
      setPlants(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar las plantas",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Selecciona una planta</Text>
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => onSelectPlant(item)}>
            <Text style={s.plantName}>{item.name}</Text>
            <Text style={s.plantInfo}>{item.location}</Text>
            <Text style={s.plantInfo}>{item.totalMesas} mesas</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  plantName: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  plantInfo: { fontSize: 14, color: "#888" },
});
