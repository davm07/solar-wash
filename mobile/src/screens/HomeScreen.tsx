import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import StartIcon from "../components/StartIcon";

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
    onLogout();
  };

  return (
    <View style={s.container}>
      <StartIcon width={50} height={25} />
      <Text style={s.title}> Solar Wash</Text>
      <TouchableOpacity style={s.btn} onPress={handleLogout}>
        <Text style={s.btnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 40 },
  btn: {
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    padding: 16,
    width: "100%",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
