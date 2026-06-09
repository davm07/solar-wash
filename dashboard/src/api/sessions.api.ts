import { api } from "./axios";

export interface Session {
  id: number;
  finishedAt: string;
  startedAt: string;
  technicianId: string;
  plantId: string;
  notes?: string;
}

export interface SessionSummary {
  mesasLavadas: number;
  totalMesas: number;
  porcentaje: number;
  duracionTotal: number;
  mesasPlanta: {
    code: string;
    label: string;
    status: string;
  }[];
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
  plantId: number,
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
