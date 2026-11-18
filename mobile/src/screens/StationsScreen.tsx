import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import {
  Search,
  X,
  SlidersHorizontal,
  MapPin,
  ChevronDown,
  LocateFixed,
  Zap,
} from "lucide-react-native";

import type { Station } from "../types";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import {
  fetchStations,
  fetchNearbyStations,
  fetchCities,
  getErrorMessage,
  isAbortError,
} from "../api/stationsApi";
import { colors, radius, spacing } from "../theme/theme";
import { openStationDirections } from "../utils/maps";
import { loadCachedStations, saveCachedStations } from "../utils/stationCache";
import { StationCardMobile } from "../components/StationCardMobile";
import { FilterModal, DEFAULT_FILTERS, type FilterState } from "../components/FilterModal";
import { CityPickerModal } from "../components/CityPickerModal";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner";

type StationsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Stations">,
  NativeStackNavigationProp<RootStackParamList>
>;
type StationsRouteProp = RouteProp<MainTabParamList, "Stations">;

const PAGE_LIMIT = 20;
const NEARBY_RADIUS_KM = 50;
const NEARBY_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 400;

export const StationsScreen: React.FC = () => {
  const navigation = useNavigation<StationsNavigationProp>();
  const route = useRoute<StationsRouteProp>();

  const [stations, setStations] = useState<Station[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineCache, setIsOfflineCache] = useState<boolean>(false);

  const [searchInput, setSearchInput] = useState<string>(route.params?.query || "");
  const [debouncedQuery, setDebouncedQuery] = useState<string>(route.params?.query || "");
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    city: route.params?.city || "All India",
    connector: route.params?.connector || null,
  });

  const [nearMe, setNearMe] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState<boolean>(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [cityPickerVisible, setCityPickerVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);

  const requestRef = useRef<AbortController | null>(null);

  // Sync incoming navigation params (e.g. from Home search/city grid or Connectors guide)
  useEffect(() => {
    if (route.params?.city !== undefined) {
      setNearMe(false);
      setFilters((prev) => ({
        ...prev,
        city: route.params?.city || "All India",
      }));
    }
    if (route.params?.query !== undefined) {
      setNearMe(false);
      setSearchInput(route.params.query);
      setDebouncedQuery(route.params.query);
    }
    if (route.params?.connector !== undefined) {
      setNearMe(false);
      setFilters((prev) => ({
        ...prev,
        connector: route.params?.connector || null,
      }));
    }
  }, [route.params?.city, route.params?.query, route.params?.connector]);

  // Debounce search text by 400 ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load city list from /stations/cities
  const loadCities = useCallback(async () => {
    setCitiesLoading(true);
    setCitiesError(null);
    try {
      const list = await fetchCities();
      setCities(list);
    } catch (err) {
      if (!isAbortError(err)) {
        setCitiesError(getErrorMessage(err));
      }
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  // Fetch stations (either /stations?page=N&limit=20 or /stations/nearby)
  const loadStations = useCallback(
    async (targetPage: number, mode: "initial" | "refresh" | "more") => {
      if (mode !== "more" && requestRef.current) {
        requestRef.current.abort();
      }
      const controller = new AbortController();
      requestRef.current = controller;

      if (mode === "initial") {
        setLoading(true);
        setError(null);
      } else if (mode === "refresh") {
        setRefreshing(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        if (nearMe && userCoords) {
          const res = await fetchNearbyStations(
            {
              lat: userCoords.lat,
              lng: userCoords.lng,
              radius_km: NEARBY_RADIUS_KM,
              limit: NEARBY_LIMIT,
              connector: filters.connector || undefined,
              min_power_kw: filters.minPowerKw > 0 ? filters.minPowerKw : undefined,
              network: filters.network || undefined,
              status: filters.status || undefined,
            },
            controller.signal
          );

          const filtered = debouncedQuery
            ? res.data.filter((s) => {
                const q = debouncedQuery.toLowerCase();
                return (
                  s.name.toLowerCase().includes(q) ||
                  s.address.toLowerCase().includes(q) ||
                  s.network.toLowerCase().includes(q) ||
                  s.city.toLowerCase().includes(q)
                );
              })
            : res.data;

          setStations(filtered);
          setTotalCount(filtered.length);
          setPage(1);
          setTotalPages(1);
          setIsOfflineCache(false);
          if (filtered.length > 0) {
            saveCachedStations(filtered, filtered.length);
          }
        } else {
          const res = await fetchStations(
            {
              page: targetPage,
              limit: PAGE_LIMIT,
              city: filters.city !== "All India" ? filters.city : undefined,
              q: debouncedQuery || undefined,
              connector: filters.connector || undefined,
              min_power_kw: filters.minPowerKw > 0 ? filters.minPowerKw : undefined,
              network: filters.network || undefined,
              status: filters.status || undefined,
            },
            controller.signal
          );

          setTotalCount(res.total);
          setPage(res.page);
          setTotalPages(Math.max(res.pages, 1));
          setIsOfflineCache(false);

          if (mode === "more") {
            setStations((prev) => {
              const seen = new Set(prev.map((s) => s.id));
              const nextItems = res.data.filter((s) => !seen.has(s.id));
              return [...prev, ...nextItems];
            });
          } else {
            setStations(res.data);
            if (res.data.length > 0) {
              saveCachedStations(res.data, res.total);
            }
          }
        }
      } catch (err) {
        if (!isAbortError(err)) {
          const message = getErrorMessage(err);
          setError(message);

          if (mode !== "more") {
            const cached = await loadCachedStations();
            if (cached && cached.stations.length > 0) {
              setStations(cached.stations);
              setTotalCount(cached.stations.length);
              setPage(1);
              setTotalPages(1);
              setIsOfflineCache(true);
            }
          }
        }
      } finally {
        if (requestRef.current === controller) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [nearMe, userCoords, filters, debouncedQuery]
  );

  // Trigger initial fetch when filters, query, or nearMe change
  useEffect(() => {
    if (nearMe && !userCoords) return;
    loadStations(1, "initial");

    return () => {
      requestRef.current?.abort();
    };
  }, [loadStations, nearMe, userCoords]);

  const handleToggleNearMe = async () => {
    setLocationNotice(null);

    if (nearMe) {
      setNearMe(false);
      return;
    }

    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationNotice("Location permission denied. Enable location to sort by distance.");
        return;
      }

      const position =
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null)) || (await Location.getLastKnownPositionAsync().catch(() => null));

      if (!position?.coords) {
        setLocationNotice("Couldn't determine your current location. Please try again.");
        return;
      }

      setUserCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setNearMe(true);
    } catch {
      setLocationNotice("Location unavailable right now. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const handleSelectCity = (city: string) => {
    setNearMe(false);
    setLocationNotice(null);
    setFilters((prev) => ({ ...prev, city }));
  };

  const handleApplyFilters = (next: FilterState) => {
    setFilters((prev) => ({
      ...next,
      city: prev.city,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      city: "All India",
    });
    setSearchInput("");
    setDebouncedQuery("");
    setNearMe(false);
    setLocationNotice(null);
  };

  const handleLoadMore = useCallback(() => {
    if (nearMe || isOfflineCache || loading || refreshing || loadingMore) return;
    if (page >= totalPages) return;
    loadStations(page + 1, "more");
  }, [nearMe, isOfflineCache, loading, refreshing, loadingMore, page, totalPages, loadStations]);

  const handleRefresh = useCallback(() => {
    loadStations(1, "refresh");
  }, [loadStations]);

  const handlePressStation = useCallback(
    (station: Station) => {
      navigation.navigate("StationDetail", {
        stationId: station.id,
        station,
      });
    },
    [navigation]
  );

  const handleNavigateStation = useCallback((station: Station) => {
    openStationDirections(station.lat, station.lng, station.name);
  }, []);

  const renderStationItem = useCallback(
    ({ item }: { item: Station }) => (
      <StationCardMobile
        station={item}
        showDistance={nearMe}
        onPress={handlePressStation}
        onNavigate={handleNavigateStation}
      />
    ),
    [nearMe, handlePressStation, handleNavigateStation]
  );

  const activeFilterCount = [
    filters.minPowerKw > 0,
    filters.connector !== null,
    filters.network !== null,
    filters.status !== null,
  ].filter(Boolean).length;

  const hasAnyActiveConstraint =
    activeFilterCount > 0 || filters.city !== "All India" || debouncedQuery.length > 0 || nearMe;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <Zap size={18} color={colors.accent} />
            <Text style={styles.title}>Stations</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {totalCount.toLocaleString()} {totalCount === 1 ? "station" : "stations"}
              {nearMe ? " near you" : ""}
            </Text>
          </View>
        </View>

        {/* Search + Filter row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.foregroundSubtle} />
            <TextInput
              style={styles.searchInput}
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search name, address, network..."
              placeholderTextColor={colors.foregroundSubtle}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchInput.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchInput("")}>
                <X size={16} color={colors.foregroundSubtle} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFilterCount > 0 && styles.filterBtnActive,
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <SlidersHorizontal
              size={17}
              color={activeFilterCount > 0 ? colors.accentForeground : colors.primary}
            />
            {activeFilterCount > 0 ? (
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* City Picker + Near Me row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlPill,
              !nearMe && filters.city !== "All India" && styles.controlPillActive,
            ]}
            onPress={() => setCityPickerVisible(true)}
            activeOpacity={0.8}
          >
            <MapPin
              size={14}
              color={!nearMe && filters.city !== "All India" ? colors.primary : colors.frost}
            />
            <Text
              style={[
                styles.controlPillText,
                !nearMe && filters.city !== "All India" && styles.controlPillTextActive,
              ]}
              numberOfLines={1}
            >
              {nearMe ? "City: Nearby" : filters.city}
            </Text>
            <ChevronDown size={14} color={colors.frost} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nearMeBtn, nearMe && styles.nearMeBtnActive]}
            onPress={handleToggleNearMe}
            disabled={locating}
            activeOpacity={0.8}
          >
            {locating ? (
              <ActivityIndicator size="small" color={nearMe ? "#020617" : colors.accent} />
            ) : (
              <LocateFixed size={14} color={nearMe ? "#020617" : colors.accent} />
            )}
            <Text style={[styles.nearMeText, nearMe && styles.nearMeTextActive]}>
              Near me
            </Text>
          </TouchableOpacity>

          {hasAnyActiveConstraint ? (
            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={handleResetFilters}
              activeOpacity={0.75}
            >
              <Text style={styles.clearAllText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {locationNotice ? (
        <OfflineBanner visible message={locationNotice} />
      ) : null}

      {isOfflineCache ? (
        <OfflineBanner
          visible
          message="Offline - saved data"
          onRetry={() => loadStations(1, "refresh")}
        />
      ) : error && stations.length > 0 ? (
        <OfflineBanner
          visible
          message={error}
          onRetry={() => loadStations(1, "refresh")}
        />
      ) : null}

      {/* Body */}
      {loading && stations.length === 0 ? (
        <LoadingState message={nearMe ? "Finding stations near you..." : "Loading stations..."} />
      ) : error && stations.length === 0 ? (
        <ErrorState
          title="Can't reach server"
          message={error}
          onRetry={() => loadStations(1, "initial")}
        />
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id}
          renderItem={renderStationItem}
          contentContainerStyle={[
            styles.listContent,
            stations.length === 0 && styles.emptyListContent,
          ]}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No stations found"
              message={
                nearMe
                  ? `No stations matched within ${NEARBY_RADIUS_KM} km of your location.`
                  : "Try a different search term, city, or filter combination."
              }
              actionLabel={hasAnyActiveConstraint ? "Clear filters" : undefined}
              onAction={hasAnyActiveConstraint ? handleResetFilters : undefined}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.footerText}>Loading more stations...</Text>
              </View>
            ) : stations.length > 0 && (nearMe || page >= totalPages) ? (
              <View style={styles.footerLoader}>
                <Text style={styles.footerText}>
                  Showing all {stations.length.toLocaleString()} stations
                </Text>
              </View>
            ) : undefined
          }
        />
      )}

      <CityPickerModal
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        cities={cities}
        loading={citiesLoading}
        error={citiesError}
        selectedCity={filters.city}
        onSelectCity={handleSelectCity}
        onRetryLoad={loadCities}
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={() =>
          setFilters((prev) => ({
            ...DEFAULT_FILTERS,
            city: prev.city,
          }))
        }
        showCitySection={false}
        isDark
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.foreground,
  },
  countBadge: {
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  controlPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  controlPillActive: {
    backgroundColor: colors.backgroundInput,
    borderColor: colors.primary,
  },
  controlPillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  controlPillTextActive: {
    color: colors.primary,
  },
  nearMeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  nearMeBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  nearMeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.accent,
  },
  nearMeTextActive: {
    color: "#020617",
  },
  clearAllBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSubtle,
  },
});
