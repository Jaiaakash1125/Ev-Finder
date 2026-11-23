import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Crosshair } from "lucide-react-native";

import type { Station } from "../types";
import type { RootStackParamList } from "../navigation/types";
import {
  checkApiHealth,
  fetchNearbyStations,
  fetchStations,
  fetchStationsInBounds,
  searchStations,
  getErrorMessage,
  isAbortError,
} from "../api/stationsApi";
import { BENGALURU_CENTER, cityCoordinates, INDIA_CENTER } from "../constants/cities";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";
import { HeaderBar } from "../components/HeaderBar";
import { FilterChipsBar } from "../components/FilterChipsBar";
import { StationDetailBottomSheet } from "../components/StationDetailBottomSheet";
import {
  LeafletMapView,
  type MapBounds,
  type MapCenterTarget,
} from "../components/LeafletMapView";
import { FilterModal, DEFAULT_FILTERS, type FilterState } from "../components/FilterModal";
import { ErrorState } from "../components/ErrorState";
import { OfflineBanner } from "../components/OfflineBanner";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NEARBY_RADIUS_KM = 35;
const NEARBY_LIMIT = 500;
const BOUNDS_LIMIT = 1500;
const MAX_MARKERS = 2000;
const BOUNDS_DEBOUNCE_MS = 600;
const SEARCH_DEBOUNCE_MS = 400;

function matchesClientFilters(station: Station, filters: FilterState): boolean {
  if (filters.minPowerKw > 0 && station.maxPowerKw < filters.minPowerKw) {
    return false;
  }
  if (filters.status && station.status !== filters.status) {
    return false;
  }
  if (filters.connector) {
    const target = filters.connector.toLowerCase();
    if (!station.connectors.some((c) => c.toLowerCase().includes(target))) {
      return false;
    }
  }
  if (filters.network) {
    const target = filters.network.toLowerCase();
    if (!station.network.toLowerCase().includes(target)) {
      return false;
    }
  }
  return true;
}

export const MapDiscoveryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [isDark, setIsDark] = useState<boolean>(true);
  const colors = isDark ? darkColors : lightColors;

  const [stations, setStations] = useState<Station[]>([]);
  const [totalStationCount, setTotalStationCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<MapCenterTarget>({
    lat: BENGALURU_CENTER.lat,
    lng: BENGALURU_CENTER.lng,
    zoom: BENGALURU_CENTER.zoom,
    key: 0,
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);

  const activeRequestsCountRef = useRef<number>(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerKeyRef = useRef<number>(1);
  const anchorRef = useRef<{ lat: number; lng: number }>({
    lat: BENGALURU_CENTER.lat,
    lng: BENGALURU_CENTER.lng,
  });
  const hasInitializedRef = useRef<boolean>(false);
  const filtersRef = useRef<FilterState>(filters);
  filtersRef.current = filters;
  const searchQueryRef = useRef<string>(searchQuery);
  searchQueryRef.current = searchQuery;

  const flyTo = useCallback((lat: number, lng: number, zoom = 12) => {
    anchorRef.current = { lat, lng };
    centerKeyRef.current += 1;
    setMapCenter({ lat, lng, zoom, key: centerKeyRef.current });
  }, []);

  const startNewRequest = useCallback((): AbortController => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;
    activeRequestsCountRef.current += 1;
    setLoading(true);
    return controller;
  }, []);

  const finishRequest = useCallback(() => {
    activeRequestsCountRef.current = Math.max(0, activeRequestsCountRef.current - 1);
    if (activeRequestsCountRef.current === 0) {
      setLoading(false);
    }
  }, []);

  const loadNearby = useCallback(
    async (lat: number, lng: number, activeFilters: FilterState) => {
      const controller = startNewRequest();
      setLoading(true);
      setError(null);
      try {
        const res = await fetchNearbyStations(
          {
            lat,
            lng,
            radius_km: NEARBY_RADIUS_KM,
            limit: NEARBY_LIMIT,
            connector: activeFilters.connector || undefined,
            min_power_kw: activeFilters.minPowerKw > 0 ? activeFilters.minPowerKw : undefined,
            network: activeFilters.network || undefined,
            status: activeFilters.status || undefined,
          },
          controller.signal
        );
        setStations(res.data.slice(0, MAX_MARKERS));
      } catch (err) {
        if (!isAbortError(err)) {
          setError(getErrorMessage(err));
        }
      } finally {
        finishRequest();
      }
    },
    [finishRequest, startNewRequest]
  );

  const loadForFilters = useCallback(
    async (nextFilters: FilterState) => {
      const controller = startNewRequest();
      setLoading(true);
      setError(null);

      try {
        if (nextFilters.city && nextFilters.city !== "All India") {
          const cityCoord = cityCoordinates[nextFilters.city];
          if (cityCoord) {
            flyTo(cityCoord.lat, cityCoord.lng, cityCoord.zoom);
          }

          const res = await fetchStations(
            {
              city: nextFilters.city,
              limit: NEARBY_LIMIT,
              connector: nextFilters.connector || undefined,
              min_power_kw: nextFilters.minPowerKw > 0 ? nextFilters.minPowerKw : undefined,
              network: nextFilters.network || undefined,
              status: nextFilters.status || undefined,
            },
            controller.signal
          );
          const list = res.data.slice(0, MAX_MARKERS);
          setStations(list);

          if (!cityCoord && list.length > 0) {
            flyTo(list[0].lat, list[0].lng, 12);
          }
        } else {
          const anchor = anchorRef.current;
          const res = await fetchNearbyStations(
            {
              lat: anchor.lat,
              lng: anchor.lng,
              radius_km: NEARBY_RADIUS_KM,
              limit: NEARBY_LIMIT,
              connector: nextFilters.connector || undefined,
              min_power_kw: nextFilters.minPowerKw > 0 ? nextFilters.minPowerKw : undefined,
              network: nextFilters.network || undefined,
              status: nextFilters.status || undefined,
            },
            controller.signal
          );
          setStations(res.data.slice(0, MAX_MARKERS));
        }
      } catch (err) {
        if (!isAbortError(err)) {
          setError(getErrorMessage(err));
        }
      } finally {
        finishRequest();
      }
    },
    [finishRequest, flyTo, startNewRequest]
  );

  const requestLocationAndLoad = useCallback(async () => {
    setLoading(true);
    setError(null);

    let targetLat = BENGALURU_CENTER.lat;
    let targetLng = BENGALURU_CENTER.lng;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const position =
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null)) || (await Location.getLastKnownPositionAsync().catch(() => null));

        if (position?.coords) {
          targetLat = position.coords.latitude;
          targetLng = position.coords.longitude;
          setUserLocation({ lat: targetLat, lng: targetLng });
        }
      }
    } catch {
      // Fallback to Bengaluru when location permission or GPS fails
    }

    flyTo(targetLat, targetLng, 12);
    await loadNearby(targetLat, targetLng, filtersRef.current);
  }, [flyTo, loadNearby]);

  // On open: ask location permission, center on user (or Bengaluru), call /stations/nearby
  useEffect(() => {
    hasInitializedRef.current = true;
    requestLocationAndLoad();

    checkApiHealth()
      .then((res) => {
        if (res.stations) setTotalStationCount(res.stations);
      })
      .catch(() => {});

    return () => {
      activeRequestRef.current?.abort();
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [requestLocationAndLoad]);

  // Debounced search using /stations/search
  useEffect(() => {
    if (!hasInitializedRef.current) return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      const controller = startNewRequest();
      setLoading(true);
      setError(null);
      try {
        const cityParam =
          filtersRef.current.city !== "All India" ? filtersRef.current.city : undefined;
        const results = await searchStations(trimmed, cityParam, 50, controller.signal);
        const filtered = results
          .filter((s) => matchesClientFilters(s, filtersRef.current))
          .slice(0, MAX_MARKERS);
        setStations(filtered);
        const lower = trimmed.toLowerCase();
        const coordKey = Object.keys(cityCoordinates).find((k) => k.toLowerCase() === lower);
        if (coordKey && cityCoordinates[coordKey]) {
          flyTo(cityCoordinates[coordKey].lat, cityCoordinates[coordKey].lng, cityCoordinates[coordKey].zoom || 12);
        } else if (filtered.length > 0) {
          flyTo(filtered[0].lat, filtered[0].lng, 12);
        }
      } catch (err) {
        if (!isAbortError(err)) {
          setError(getErrorMessage(err));
        }
      } finally {
        finishRequest();
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, finishRequest, flyTo, startNewRequest]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.trim() === "" && searchQueryRef.current.trim() !== "") {
        loadForFilters(filtersRef.current);
      }
    },
    [loadForFilters]
  );

  // Debounced viewport bounds query (600 ms, limit 300, replaces markers, cancels previous)
  const handleBoundsChange = useCallback(
    (b: MapBounds) => {
      if (searchQueryRef.current.trim().length > 0) {
        return;
      }

      anchorRef.current = {
        lat: (b.min_lat + b.max_lat) / 2,
        lng: (b.min_lng + b.max_lng) / 2,
      };

      if (boundsTimerRef.current) {
        clearTimeout(boundsTimerRef.current);
      }

      boundsTimerRef.current = setTimeout(async () => {
        const controller = startNewRequest();
        setError(null);
        try {
          const data = await fetchStationsInBounds(
            {
              min_lat: b.min_lat,
              min_lng: b.min_lng,
              max_lat: b.max_lat,
              max_lng: b.max_lng,
              limit: BOUNDS_LIMIT,
            },
            controller.signal
          );
          if (activeRequestRef.current === controller) {
            const filtered = data
              .filter((s) => matchesClientFilters(s, filtersRef.current))
              .slice(0, MAX_MARKERS);
            setStations(filtered);
          }
        } catch (err) {
          if (!isAbortError(err)) {
            setError(getErrorMessage(err));
          }
        } finally {
          finishRequest();
        }
      }, BOUNDS_DEBOUNCE_MS);
    },
    [finishRequest, startNewRequest]
  );

  const applyFilterUpdate = useCallback(
    (next: FilterState) => {
      setFilters(next);
      setSearchQuery("");
      if (next.city === "All India" && filtersRef.current.city !== "All India") {
        const target = userLocation || { lat: INDIA_CENTER.lat, lng: INDIA_CENTER.lng };
        flyTo(target.lat, target.lng, userLocation ? 12 : INDIA_CENTER.zoom);
      }
      loadForFilters(next);
    },
    [flyTo, loadForFilters, userLocation]
  );

  const handleCityChange = (city: string) => {
    applyFilterUpdate({ ...filters, city });
  };

  const handleToggleFastDc = () => {
    applyFilterUpdate({
      ...filters,
      minPowerKw: filters.minPowerKw >= 50 ? 0 : 50,
    });
  };

  const handleToggleAvailable = () => {
    applyFilterUpdate({
      ...filters,
      status: filters.status === "available" ? null : "available",
    });
  };

  const handleSelectConnector = (connector: string | null) => {
    applyFilterUpdate({ ...filters, connector });
  };

  const handleResetFilters = () => {
    applyFilterUpdate(DEFAULT_FILTERS);
  };

  const handleLocateMe = async () => {
    setSearchQuery("");
    if (userLocation) {
      flyTo(userLocation.lat, userLocation.lng, 12);
      await loadNearby(userLocation.lat, userLocation.lng, filters);
    } else {
      await requestLocationAndLoad();
    }
  };

  const handleSelectStation = useCallback((station: Station) => {
    setSelectedStation(station);
    setSheetVisible(true);
  }, []);

  const handleViewDetails = useCallback(
    (station: Station) => {
      navigation.navigate("StationDetail", {
        stationId: station.id,
        station,
      });
    },
    [navigation]
  );

  const activeFilterCount = [
    filters.city !== "All India",
    filters.minPowerKw > 0,
    filters.connector !== null,
    filters.network !== null,
    filters.status !== null,
  ].filter(Boolean).length;

  const displayCount =
    filters.city && filters.city !== "All India"
      ? stations.length
      : (totalStationCount || 8025);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <HeaderBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onOpenFilters={() => setFilterModalVisible(true)}
        stationCount={displayCount}
        currentCity={filters.city}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        activeFilterCount={activeFilterCount}
      />

      <FilterChipsBar
        onlyFastDc={filters.minPowerKw >= 50}
        onToggleFastDc={handleToggleFastDc}
        onlyAvailable={filters.status === "available"}
        onToggleAvailable={handleToggleAvailable}
        selectedConnector={filters.connector}
        onSelectConnector={handleSelectConnector}
        selectedCity={filters.city}
        onSelectCity={handleCityChange}
        isDark={isDark}
      />

      {error && stations.length > 0 ? (
        <OfflineBanner
          visible
          message={error}
          onRetry={() => loadForFilters(filters)}
        />
      ) : null}

      {error && stations.length === 0 && !loading ? (
        <ErrorState
          title="Can't reach server"
          message={error}
          onRetry={requestLocationAndLoad}
        />
      ) : (
        <View style={styles.mapContainer}>
          <LeafletMapView
            stations={stations}
            center={mapCenter}
            userLocation={userLocation}
            onSelectStation={handleSelectStation}
            onBoundsChange={handleBoundsChange}
            isDark={isDark}
          />

          {loading ? (
            <View style={styles.loadingPill}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingPillText}>Loading stations...</Text>
            </View>
          ) : !error && stations.length === 0 ? (
            <View style={styles.emptyPill}>
              <Text style={styles.loadingPillText}>No stations found in this area</Text>
              {activeFilterCount > 0 || searchQuery.trim().length > 0 ? (
                <TouchableOpacity onPress={handleResetFilters} style={styles.emptyResetBtn}>
                  <Text style={styles.emptyResetText}>Reset</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.locateBtn,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
            onPress={handleLocateMe}
            activeOpacity={0.85}
            accessibilityLabel="Center on my location"
          >
            <Crosshair size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={applyFilterUpdate}
        onResetFilters={handleResetFilters}
        isDark={isDark}
      />

      <StationDetailBottomSheet
        station={selectedStation}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onViewDetails={handleViewDetails}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  loadingPill: {
    position: "absolute",
    top: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(8, 12, 20, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.full,
    elevation: 5,
  },
  loadingPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f8fafc",
  },
  emptyPill: {
    position: "absolute",
    top: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(8, 12, 20, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.full,
    elevation: 5,
  },
  emptyResetBtn: {
    backgroundColor: "#38bdf8",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  emptyResetText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#020617",
  },
  locateBtn: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 46,
    height: 46,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
