import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export function useMesaRealtime(
  plantId: string | null,
  sessionId: string | null,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!plantId) return;

    const channel = supabase
      .channel(`plant:${plantId}`)
      // Mesa status changes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mesas",
          filter: `plant_id=eq.${plantId}`,
        },
        (payload) => {
          console.log("Mesa updated:", payload.new);
          queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
        },
      )
      // Session end
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wash_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.finished_at) {
            console.log("Session ended");
            queryClient.invalidateQueries({ queryKey: ["sessionSummary"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [plantId, sessionId, queryClient]);
}
