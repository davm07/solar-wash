import * as SecureStore from "expo-secure-store";
import { useAppStore } from "../store/useAppStore";

export const logout = async () => {
  await SecureStore.deleteItemAsync("token");
  useAppStore.getState().logout();
};
