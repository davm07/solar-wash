import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import api from "../utils/api";
import StartIcon from "../components/StartIcon";
import { useAppStore } from "../store/useAppStore";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🧠 ZUSTAND ACTIONS
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Ingresa email y contraseña");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      // 🧠 1. ESTADO GLOBAL (ZUSTAND)
      setUser(data.user);
      setToken(data.token);

      // 🔵 2. PERSISTENCIA (SECURE STORE)
      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));

      // 🚀 3. NAVEGACIÓN
      navigation.navigate("PlantSelect");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error.message || "Error de conexión";

      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StartIcon width={200} height={100} />

      <Text style={s.title}>Solar Wash</Text>
      <Text style={s.subtitle}>Inicia sesión para continuar</Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={s.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>Entrar</Text>
        )}
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
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    width: "100%",
  },
  btn: {
    backgroundColor: "#1D9E75",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
