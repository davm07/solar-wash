import { api } from "./axios";

export interface Plant {
  id: number;
  name: string;
  location: string;
  client?: string;
}

export const fetchPlants = async (): Promise<Plant[]> => {
  const { data } = await api.get("/plants");
  return data;
};

export const fetchMyPlants = async (): Promise<Plant[]> => {
  const { data } = await api.get("/plants/my-plants");
  return data;
};
