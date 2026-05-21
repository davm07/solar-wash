import { useQuery } from "@tanstack/react-query";
import { fetchPlants, fetchMyPlants } from "../api/plants.api";
import { useAuthStore } from "../store/auth.store";

export const usePlants = () => {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["plants"],
    queryFn: () => {
      if (user?.role === "client") {
        return fetchMyPlants();
      }
      return fetchPlants();
    },
  });
};
