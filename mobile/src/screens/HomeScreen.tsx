import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import {
  Zap,
  Search,
  MapPin,
  ArrowRight,
  Map as MapIcon,
  Navigation,
  X,
} from "lucide-react-native";

import type { Station } from "../types";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import {
  checkApiHealth,
  fetchNearbyStations,
  getErrorMessage,
  isAbortError,
} from "../api/stationsApi";
import { BENGALURU_CENTER, TOP_CITIES, cityCoordinates } from "../constants/cities";
import { colors, radius, spacing } from "../theme/theme";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner";

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

interface NearbyStationCardProps {
  station: Station;
  onPress: (station: Station) => void;
}

const NearbyStationCard = memo(({ station, onPress }: NearbyStationCardProps) => {
  const statusColor =
    station.status === "available"
      ? colors.success
      : station.status === "offline"
        ? colors.destructive
        : colors.warning;

  return (
    <TouchableOpacity
      style={styles.nearbyCard}
      onPress={() => onPress(station)}
      activeOpacity={0.85}
    >
      <View style={styles.nearbyTopRow}>
        <Text style={styles.nearbyNetwork} numberOfLines={1}>
          {station.network}
        </Text>
        {typeof station.distanceKm === "number" ? (
          <View style={styles.distanceBadge}>
            <Navigation size={10} color={colors.primary} />
            <Text style={styles.distanceText}>{station.distanceKm.toFixed(1)} km</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.nearbyName} numberOfLines={2}>
        {station.name}
      </Text>

      <Text style={styles.nearbyAddress} numberOfLines={1}>
        {station.address || station.city}
      </Text>

      <View style={styles.nearbyMetaRow}>
        <View style={styles.nearbyStatusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.nearbyStatusText, { color: statusColor }]}>
            {station.status.charAt(0).toUpperCase() + station.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.nearbyPower}>{station.maxPowerKw} kW</Text>
      </View>

      <View style={styles.nearbyConnectors}>
        {station.connectors.slice(0, 2).map((c, idx) => (
          <View key={`${c}-${idx}`} style={styles.connectorPill}>
            <Text style={styles.connectorText} numberOfLines={1}>
              {c}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
});

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();

  const [searchQuery, setSearchQuery] = useState("");
  const [stationCount, setStationCount] = useState<number | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [nearbyStations, setNearbyStations] = useState<Station[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(true);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [usingUserLocation, setUsingUserLocation] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const controllerRef = useRef<AbortController | null>(null);

  const loadHomeData = useCallback(async (isRefresh = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setNearbyLoading(true);
    }
    setHealthError(null);
    setNearbyError(null);

    // 1. Fetch live station count from /health
    const healthPromise = checkApiHealth(controller.signal)
      .then((res) => {
        setStationCount(res.stations);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setHealthError(getErrorMessage(err));
        }
      });

    // 2. Resolve user location (or fallback to Bengaluru) and fetch /stations/nearby
    const nearbyPromise = (async () => {
      let lat = BENGALURU_CENTER.lat;
      let lng = BENGALURU_CENTER.lng;
      let gotUserCoords = false;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos =
            (await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }).catch(() => null)) || (await Location.getLastKnownPositionAsync().catch(() => null));
          if (pos?.coords) {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            gotUserCoords = true;
          }
        }
      } catch {
        // Fallback to Bengaluru
      }

      setUsingUserLocation(gotUserCoords);

      try {
        const res = await fetchNearbyStations(
          { lat, lng, radius_km: 25, limit: 12 },
          controller.signal
        );
        setNearbyStations(res.data);
      } catch (err) {
        if (!isAbortError(err)) {
          setNearbyError(getErrorMessage(err));
        }
      }
    })();

    await Promise.all([healthPromise, nearbyPromise]);

    if (controllerRef.current === controller) {
      setNearbyLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData(false);
    return () => {
      controllerRef.current?.abort();
    };
  }, [loadHomeData]);

  const handleSubmitSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      navigation.navigate("Stations", {
        city: "All India",
        query: "",
        connector: undefined,
      });
      return;
    }

    const lower = trimmed.toLowerCase();
    const matchedCity =
      TOP_CITIES.find((c) => c.toLowerCase() === lower) ||
      Object.keys(cityCoordinates).find((c) => c.toLowerCase() === lower);

    if (matchedCity) {
      navigation.navigate("Stations", {
        city: matchedCity,
        query: "",
        connector: undefined,
      });
    } else {
      navigation.navigate("Stations", {
        query: trimmed,
        city: "All India",
        connector: undefined,
      });
    }
  };

  const handleSelectCity = (city: string) => {
    navigation.navigate("Stations", {
      city,
      query: "",
      connector: undefined,
    });
  };

  const handleOpenStation = useCallback(
    (station: Station) => {
      navigation.navigate("StationDetail", {
        stationId: station.id,
        station,
      });
    },
    [navigation]
  );

  const renderNearbyCard = useCallback(
    ({ item }: { item: Station }) => (
      <NearbyStationCard station={item} onPress={handleOpenStation} />
    ),
    [handleOpenStation]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHomeData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {healthError && nearbyError ? (
          <OfflineBanner
            visible
            message={healthError}
            onRetry={() => loadHomeData(false)}
          />
        ) : null}

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Zap size={16} color={colors.accent} fill={colors.accent} />
            </View>
            <Text style={styles.brandText}>
              EV<Text style={styles.brandAccent}>FINDER</Text> INDIA
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Charge anywhere{"\n"}
            <Text style={styles.heroTitleAccent}>across India.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Discover public EV charging stations across 28 states & UTs with connector specs, reviews, and instant navigation.
          </Text>

          {/* Hero Search Box -> submits to Stations tab */}
          <View style={styles.searchCard}>
            <View style={styles.searchInputRow}>
              <Search size={17} color={colors.foregroundSubtle} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by city name..."
                placeholderTextColor={colors.foregroundSubtle}
                returnKeyType="search"
                onSubmitEditing={handleSubmitSearch}
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color={colors.foregroundSubtle} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.primaryHeroBtn}
                onPress={handleSubmitSearch}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryHeroBtnText}>Search Stations</Text>
                <ArrowRight size={15} color={colors.accentForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryHeroBtn}
                onPress={() => navigation.navigate("Map")}
                activeOpacity={0.85}
              >
                <MapIcon size={15} color={colors.primary} />
                <Text style={styles.secondaryHeroBtnText}>Live Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Stats Section from /health */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={styles.statValue}>
              {stationCount !== null ? stationCount.toLocaleString() : healthError ? "—" : "..."}
            </Text>
            <Text style={styles.statLabel}>Live Stations</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>28+</Text>
            <Text style={styles.statLabel}>States & UTs</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>6</Text>
            <Text style={styles.statLabel}>Plug Types</Text>
          </View>
        </View>

        {/* Stations Near You Horizontal List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {usingUserLocation ? "Stations near you" : "Stations in Bengaluru"}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {usingUserLocation
                  ? "Closest chargers within 25 km"
                  : "Enable location for chargers closest to you"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() =>
                navigation.navigate("Stations", {
                  city: usingUserLocation ? "All India" : "Bengaluru",
                  query: "",
                })
              }
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ArrowRight size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {nearbyLoading && nearbyStations.length === 0 ? (
            <LoadingState compact message="Finding nearby stations..." />
          ) : nearbyError && nearbyStations.length === 0 ? (
            <ErrorState
              compact
              title="Can't load nearby stations"
              message={nearbyError}
              onRetry={() => loadHomeData(false)}
            />
          ) : nearbyStations.length === 0 ? (
            <EmptyState
              compact
              title="No nearby stations found"
              message="Try browsing all stations across India."
              actionLabel="Browse all"
              onAction={() => handleSelectCity("All India")}
            />
          ) : (
            <FlatList
              data={nearbyStations}
              keyExtractor={(item) => item.id}
              renderItem={renderNearbyCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyListContent}
            />
          )}
        </View>

        {/* Explore by Indian City Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Explore by Indian City</Text>
              <Text style={styles.sectionSubtitle}>Tap a city to browse charging hubs</Text>
            </View>

            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => handleSelectCity("All India")}
            >
              <Text style={styles.seeAllText}>Directory</Text>
              <ArrowRight size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.cityGrid}>
            {TOP_CITIES.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.cityTile}
                onPress={() => handleSelectCity(city)}
                activeOpacity={0.8}
              >
                <MapPin size={14} color={colors.accent} />
                <Text style={styles.cityTileText} numberOfLines={1}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: 1,
  },
  brandAccent: {
    color: colors.primary,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.foreground,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  heroTitleAccent: {
    color: colors.accent,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.foregroundMuted,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  searchCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryHeroBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  primaryHeroBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  secondaryHeroBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  secondaryHeroBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statCardHighlight: {
    borderColor: colors.border,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  nearbyListContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  nearbyCard: {
    width: 240,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  nearbyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  nearbyNetwork: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
    flex: 1,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.backgroundInput,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  nearbyName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: spacing.xs + 2,
    minHeight: 38,
  },
  nearbyAddress: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  nearbyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  nearbyStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  nearbyStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  nearbyPower: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.foreground,
  },
  nearbyConnectors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  connectorPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  connectorText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.frost,
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cityTile: {
    width: "31%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cityTileText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
  },
});
