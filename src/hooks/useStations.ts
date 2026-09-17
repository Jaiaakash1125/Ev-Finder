import { useQuery } from "@tanstack/react-query";
import { fetchStations, fetchStationById } from "../lib/api";
import { stations as localStations, Station } from "../data/stations";

export function useStations() {
  const query = useQuery({
    queryKey: ["stations"],
    queryFn: fetchStations,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  return {
    stations: query.data?.data ?? localStations,
    isLiveDb: query.data?.isLiveDb ?? false,
    source: query.data?.source ?? "local_fallback",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useStation(id: string | undefined) {
  const query = useQuery({
    queryKey: ["station", id],
    queryFn: () => (id ? fetchStationById(id) : Promise.resolve(null)),
    enabled: !!id,
  });

  return {
    station: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
