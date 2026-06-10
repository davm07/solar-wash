import { useQuery } from "@tanstack/react-query";
import { fetchActiveCycle } from "../api/sessions.api";

export const useActiveCycle = (plantId: string | null) => {
  return useQuery({
    queryKey: ["activeCycle", plantId],
    queryFn: () => fetchActiveCycle(plantId!),
    enabled: !!plantId,
    refetchInterval: 30_000,
  });
};
