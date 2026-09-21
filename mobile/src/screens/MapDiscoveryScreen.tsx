import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import * as Linking from "expo-linking";
import { Map, List } from "lucide-react-native";

import { Station } from "../types";
import { api } from "../api/client";
import { colors, radius, spacing } from "../theme/theme";
import { HeaderBar } from "../components/HeaderBar";
import { FilterChipsBar } from "../components/FilterChipsBar";
import { StationCardMobile } from "../components/StationCardMobile";
import { StationDetailBottomSheet } from "../components/StationDetailBottomSheet";
import { LeafletMapView } from "../components/LeafletMapView";

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
          <LeafletMapView
            stations={filteredStations}
            selectedCity={selectedCity}
            onSelectStation={(station) => {
              setSelectedStation(station);
              setSheetVisible(true);
            }}
          />
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
