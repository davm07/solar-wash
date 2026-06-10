import { useQuery } from "@tanstack/react-query";
import { fetchCycleSummary } from "../api/sessions.api";

export const useCycleSummary = (cycleId: string | null) => {
  return useQuery({
    queryKey: ["cycleSummary", cycleId],
    queryFn: () => fetchCycleSummary(cycleId!),
    enabled: !!cycleId,
  });
};
