import { useQuery } from "@tanstack/react-query";
import { fetchSessionsByPlant } from "../api/sessions.api";

export const useSessions = (plantId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["sessions", plantId],
    queryFn: () => fetchSessionsByPlant(plantId),
    enabled, // 👈 key for lazy loading
  });
};
