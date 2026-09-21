import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { Map, List, Crosshair, Zap } from "lucide-react-native";

import { Station } from "../types";
import { api } from "../api/client";
import { colors, radius, spacing } from "../theme/theme";
import { HeaderBar } from "../components/HeaderBar";
import { FilterChipsBar } from "../components/FilterChipsBar";
import { StationCardMobile } from "../components/StationCardMobile";
import { StationDetailBottomSheet } from "../components/StationDetailBottomSheet";

// Default India center (matching website)
const INITIAL_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 14.0,
  longitudeDelta: 14.0,
};

const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  "All India": { latitude: 20.5937, longitude: 78.9629 },
  Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  "New Delhi": { latitude: 28.6139, longitude: 77.209 },
  Mumbai: { latitude: 19.076, longitude: 72.8777 },
  Hyderabad: { latitude: 17.385, longitude: 78.4867 },
  Chennai: { latitude: 13.0827, longitude: 80.2707 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Kolkata: { latitude: 22.5726, longitude: 88.3639 },
};

export const MapDiscoveryScreen: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("All India");
  const [onlyFastDc, setOnlyFastDc] = useState<boolean>(false);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  // Selected Station for Bottom Sheet
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);

  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    loadStations();
  }, [selectedCity, onlyFastDc, onlyAvailable, selectedConnector]);

  const loadStations = async () => {
    setLoading(true);
    try {
      const coords = CITY_COORDS[selectedCity] || CITY_COORDS["All India"];
      const res = await api.getNearbyStations({
        lat: coords.latitude,
        lng: coords.longitude,
        city: selectedCity,
        radiusKm: selectedCity === "All India" ? 5000 : 50,
        minPowerKw: onlyFastDc ? 50 : undefined,
        connector: selectedConnector || undefined,
        status: onlyAvailable ? "available" : undefined,
        limit: 2000,
      });

      setStations(res.data || []);
    } catch (err) {
      console.warn("Error fetching stations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const coords = CITY_COORDS[city];
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: city === "All India" ? 12 : 0.12,
        longitudeDelta: city === "All India" ? 12 : 0.12,
      });
    }
  };

  const handleRecenterGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        });
      }
    } catch (e) {
      console.warn("GPS error:", e);
    }
  };

  const filteredStations = stations.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.network.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Top Search & Brand Header */}
      <HeaderBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFilters={() => {}}
        stationCount={filteredStations.length}
        currentCity={selectedCity}
      />

      {/* Horizontal Filter Chips */}
      <FilterChipsBar
        onlyFastDc={onlyFastDc}
        onToggleFastDc={() => setOnlyFastDc(!onlyFastDc)}
        onlyAvailable={onlyAvailable}
        onToggleAvailable={() => setOnlyAvailable(!onlyAvailable)}
        selectedConnector={selectedConnector}
        onSelectConnector={setSelectedConnector}
        selectedCity={selectedCity}
        onSelectCity={handleCityChange}
      />

      {/* Main Content: Map or List View */}
      {viewMode === "map" ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFillObject}
            initialRegion={INITIAL_REGION}
            showsUserLocation
            showsCompass
          >
            {filteredStations.map((station) => (
              <Marker
                key={station.id}
                coordinate={{ latitude: station.lat, longitude: station.lng }}
                onPress={() => {
                  setSelectedStation(station);
                  setSheetVisible(true);
                }}
              >
                <View
                  style={[
                    styles.customMarker,
                    station.status === "available"
                      ? styles.markerAvailable
                      : styles.markerBusy,
                  ]}
                >
                  <Zap size={14} color="#020617" />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Floating Recenter GPS FAB */}
          <TouchableOpacity
            style={styles.recenterFab}
            onPress={handleRecenterGps}
            activeOpacity={0.8}
          >
            <Crosshair size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <StationCardMobile
                  station={item}
                  onPress={() => {
                    setSelectedStation(item);
                    setSheetVisible(true);
                  }}
                  onNavigate={() => {
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`
                    );
                  }}
                />
              )}
            />
          )}
        </View>
      )}

      {/* Floating View Switcher (Map <-> List) */}
      <View style={styles.viewToggleWrapper}>
        <TouchableOpacity
          style={styles.viewTogglePill}
          onPress={() => setViewMode(viewMode === "map" ? "list" : "map")}
          activeOpacity={0.85}
        >
          {viewMode === "map" ? (
            <>
              <List size={16} color="#020617" />
              <Text style={styles.viewToggleText}>List View ({filteredStations.length})</Text>
            </>
          ) : (
            <>
              <Map size={16} color="#020617" />
              <Text style={styles.viewToggleText}>Map View</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Station Detail Bottom Sheet */}
      <StationDetailBottomSheet
        station={selectedStation}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onReserveSlot={(id) => api.reserveSlot(id)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  customMarker: {
    padding: 7,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  markerAvailable: {
    backgroundColor: colors.accent,
  },
  markerBusy: {
    backgroundColor: colors.warning,
  },
  recenterFab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 90,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 4,
  },
  viewToggleWrapper: {
    position: "absolute",
    bottom: spacing.lg,
    alignSelf: "center",
  },
  viewTogglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.full,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#020617",
  },
});
