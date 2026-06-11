import { api } from "./axios";

export interface Session {
  id: number;
  finishedAt: string;
  startedAt: string;
  technicianId: string;
  plantId: string;
  notes?: string;
}

export interface ActiveCycle {
  cycle: {
    id: string;
    plantId: string;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  mesasDone: number;
  totalMesas: number;
  percentage: number;
  sessionCount: number;
  technicianCount: number;
}

export interface SessionSummary {
  mesasLavadas: number;
  totalMesas: number;
  porcentaje: number;
  duracionTotal: number;
  mesasSession: {
    code: string;
    status: string;
  }[];
  cycleProgress: {
    cycleId: string;
    startedAt: string;
    finishedAt: string | null;
    mesasDone: number;
    totalMesas: number;
    percentage: number;
  } | null;
  session: {
    id: string;
    finishedAt: string;
    startedAt: string;
    technicianId: string;
    plantId: string;
    notes?: string;
    technician: {
      id: string;
      name: string;
    };
    plant: {
      id: string;
      name: string;
      location: string;
      svgContent: string;
    };
  };
}

export const fetchSessionsByPlant = async (
  plantId: string,
): Promise<Session[]> => {
  const { data } = await api.get(`/sessions/${plantId}`);
  return data;
};

export const fetchSessionSummary = async (
  sessionId: string,
): Promise<SessionSummary> => {
  const { data } = await api.get(`/sessions/${sessionId}/summary`);
  return data;
};

export const fetchActiveCycle = async (
  plantId: string,
): Promise<ActiveCycle> => {
  const { data } = await api.get(`/sessions/cycles/active/${plantId}`);
  return data;
};

export const finishCycle = async (cycleId: string) => {
  const { data } = await api.post(`/sessions/cycles/${cycleId}/finish`);
  return data;
};

// ============================
// CYCLE HISTORY
// ============================

export interface CycleHistoryItem {
  id: string;
  plantId: string;
  startedAt: string;
  finishedAt: string | null;
  mesasDone: number;
  totalMesas: number;
  percentage: number;
  sessionCount: number;
  technicianCount: number;
}

export interface CycleSummary {
  cycle: {
    id: string;
    plantId: string;
    startedAt: string;
    finishedAt: string | null;
  };
  mesasDone: number;
  totalMesas: number;
  percentage: number;
  sessions: {
    id: string;
    technicianId: string;
    startedAt: string;
    finishedAt: string | null;
    technicianName: string;
    mesasWashed: number;
  }[];
  technicians: {
    id: string;
    name: string;
    mesasWashed: number;
    sessionCount: number;
  }[];
  svgContent: string | null;
  mesasCycle: {
    code: string;
    status: string;
  }[];
  sessionDuration: number;
  washingDuration: number;
}

export const fetchCycleHistory = async (
  plantId: string,
): Promise<CycleHistoryItem[]> => {
  const { data } = await api.get(`/sessions/cycles/list/${plantId}`);
  return data;
};

export const fetchCycleSummary = async (
  cycleId: string,
): Promise<CycleSummary> => {
  const { data } = await api.get(`/sessions/cycles/${cycleId}/summary`);
  return data;
};
