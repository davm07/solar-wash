import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";

import { loginRequest } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

import VioIcon from "../components/icons/VioIcon";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  const loginMutation = useMutation({
    mutationFn: loginRequest,

    onSuccess: (data) => {
      setAuth(data.token, {
        ...data.user,
        name: data.user.name ?? "",
      });

      navigate("/dashboard");
    },

    onError: (error) => {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data?.message);
      } else {
        console.error("Unexpected error");
      }
    },
  });

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || "Error del servidor";
    }
    return "Unexpected error";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-[#f5f5f5] p-8 rounded-xl shadow-md">
        <VioIcon />
        <h1 className="text-3xl font-bold mb-6 mt-2 text-center">Solar Wash</h1>
        <p className="text-center text-[#888] text-sm">
          Inicia sesión para continuar
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* EMAIL */}
          <div>
            <label className="block mb-1 font-medium">Email</label>

            <input
              type="email"
              placeholder="example@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              {...register("email", {
                required: "Email is required",
              })}
            />

            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block mb-1 font-medium">Password</label>

            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              {...register("password", {
                required: "Password is required",
              })}
            />

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* API ERROR */}
          {loginMutation.isError && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
              {getErrorMessage(loginMutation.error)}
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-[#1D9E75] hover:bg-[#1A8A6A] text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loginMutation.isPending ? "Cargando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
