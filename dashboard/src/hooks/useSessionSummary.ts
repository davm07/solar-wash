import { useQuery } from "@tanstack/react-query";
import { fetchSessionSummary } from "../api/sessions.api";

export const useSessionSummary = (sessionId: string) => {
  return useQuery({
    queryKey: ["session-summary", sessionId],

    queryFn: () => fetchSessionSummary(sessionId),
  });
};
