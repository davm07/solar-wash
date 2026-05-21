import { api } from "./axios";

interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: "technician" | "client" | "admin";
  };
}

export const loginRequest = async (
  data: LoginPayload,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/auth/login", data);
  return response.data;
};
