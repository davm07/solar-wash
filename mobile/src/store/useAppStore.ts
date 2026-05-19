import { create } from "zustand";

/**
 * =========================
 * TIPOS BASE
 * =========================
 */

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface Plant {
  id: string;
  name: string;
  location: string;
  totalMesas: number;
}

interface Session {
  id: string;
  plantId: string;
  technicianId: string;
  startedAt?: string;
  finishedAt?: string | null;
  status: "idle" | "active" | "finished";
}

/**
 * =========================
 * ESTADO GLOBAL
 * =========================
 */

interface AppState {
  // 👤 AUTH
  user: User | null;
  token: string | null;

  // 🌱 PLANTA SELECCIONADA
  plant: Plant | null;

  // 🧼 SESIÓN DE LAVADO ACTIVA
  session: Session | null;

  // 🟡 MESA ACTUAL (QR SCAN)
  currentMesaId: string | null;

  // =========================
  // ACTIONS - AUTH
  // =========================
  setUser: (user: User) => void;
  setToken: (token: string) => void;

  // =========================
  // ACTIONS - PLANTA
  // =========================
  setPlant: (plant: Plant) => void;

  // =========================
  // ACTIONS - SESIÓN
  // =========================
  setSession: (session: Session) => void;
  endSession: () => void;

  // =========================
  // ACTIONS - MESAS (QR FLOW)
  // =========================
  setCurrentMesa: (id: string | null) => void;

  // =========================
  // RESET TOTAL
  // =========================
  logout: () => void;
}

/**
 * =========================
 * STORE
 * =========================
 */

export const useAppStore = create<AppState>((set) => ({
  // =========================
  // INITIAL STATE
  // =========================
  user: null,
  token: null,

  plant: null,

  session: null,

  currentMesaId: null,

  // =========================
  // AUTH
  // =========================
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  // =========================
  // PLANT
  // =========================
  setPlant: (plant) => set({ plant }),

  // =========================
  // SESSION
  // =========================
  setSession: (session) => set({ session }),

  endSession: () =>
    set({
      session: null,
      currentMesaId: null,
    }),

  // =========================
  // QR / MESA FLOW
  // =========================
  setCurrentMesa: (id) => set({ currentMesaId: id }),

  // =========================
  // LOGOUT / RESET
  // =========================
  logout: () =>
    set({
      user: null,
      token: null,
      plant: null,
      session: null,
      currentMesaId: null,
    }),
}));
