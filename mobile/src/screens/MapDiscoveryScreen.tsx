import React, { useState, useEffect, useMemo } from "react";
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
import { fetchStations } from "../api/client";
import { colors, radius, spacing } from "../theme/theme";
import { HeaderBar } from "../components/HeaderBar";
import { FilterChipsBar } from "../components/FilterChipsBar";
import { StationCardMobile } from "../components/StationCardMobile";
import { StationDetailBottomSheet } from "../components/StationDetailBottomSheet";
import { LeafletMapView } from "../components/LeafletMapView";

export const MapDiscoveryScreen: React.FC = () => {
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Filters State (1:1 identical to PC website)
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [selectedCity, setSelectedCity] = useState<string>("All India");
  const [onlyFastDc, setOnlyFastDc] = useState<boolean>(false);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  // Selected Station for Bottom Sheet
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    setLoading(true);
    try {
      // Calls XAMPP MySQL get_stations.php exactly like the PC website
      const res = await fetchStations();
      setAllStations(res.data || []);
      setIsLiveDb(res.isLiveDb);
    } catch (err) {
      console.warn("Error loading stations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
  };

  // Filter stations based on city, search, fast DC, availability, and connectors
  const filteredStations = useMemo(() => {
    return allStations.filter((s) => {
      // 1. City Filter
      if (selectedCity && selectedCity !== "All India") {
        if (s.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      // 2. Fast DC Filter (>= 50kW)
      if (onlyFastDc && s.maxPowerKw < 50) {
        return false;
      }

      // 3. Availability Filter
      if (onlyAvailable && s.status !== "available") {
        return false;
      }

      // 4. Connector Filter
      if (selectedConnector) {
        if (!s.connectors.some((c) => c.toLowerCase().includes(selectedConnector.toLowerCase()))) {
          return false;
        }
      }

      // 5. Search Text Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesAddr = s.address.toLowerCase().includes(q);
        const matchesNet = s.network.toLowerCase().includes(q);
        const matchesCity = s.city.toLowerCase().includes(q);
        if (!matchesName && !matchesAddr && !matchesNet && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [allStations, selectedCity, onlyFastDc, onlyAvailable, selectedConnector, searchQuery]);

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
