import { useQuery } from "@tanstack/react-query";
import { fetchSessionsByPlant } from "../api/sessions.api";

export const useSessions = (plantId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["sessions", plantId],
    queryFn: () => fetchSessionsByPlant(plantId),
    enabled, // 👈 key for lazy loading
    refetchInterval: enabled ? 30_000 : false, // Refetch every 30 seconds when the component is open
  });
};
