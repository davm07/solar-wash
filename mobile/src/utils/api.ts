import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 10000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("token");
    }

    const message =
      error.response?.data?.message ?? error.message ?? "Request failed";

    return Promise.reject(new Error(message));
  },
);

export default api;
