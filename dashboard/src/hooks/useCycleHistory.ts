import { useQuery } from "@tanstack/react-query";
import { fetchCycleHistory } from "../api/sessions.api";

export const useCycleHistory = (plantId: string | null) => {
  return useQuery({
    queryKey: ["cycleHistory", plantId],
    queryFn: () => fetchCycleHistory(plantId!),
    enabled: !!plantId,
  });
};
