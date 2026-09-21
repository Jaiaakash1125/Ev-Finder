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
import { stations as fallbackStations } from "../data/stations";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";
import { HeaderBar } from "../components/HeaderBar";
import { FilterChipsBar } from "../components/FilterChipsBar";
import { StationCardMobile } from "../components/StationCardMobile";
import { StationDetailBottomSheet } from "../components/StationDetailBottomSheet";
import { LeafletMapView } from "../components/LeafletMapView";
import { FilterModal, FilterState } from "../components/FilterModal";

export const MapDiscoveryScreen: React.FC = () => {
  // Theme State (Dark by default, switchable to Light)
  const [isDark, setIsDark] = useState<boolean>(true);
  const colors = isDark ? darkColors : lightColors;

  // Station Data State
  const [allStations, setAllStations] = useState<Station[]>(fallbackStations);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    city: "All India",
    minPowerKw: 0,
    connector: null,
    network: null,
    onlyAvailable: false,
  });

  // Modal Visibility States
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);

  useEffect(() => {
    loadLiveXamppStations();
  }, []);

  const loadLiveXamppStations = async () => {
    try {
      const res = await fetchStations();
      if (res.data && res.data.length > 0) {
        setAllStations(res.data);
      }
    } catch (err) {
      console.warn("Using fallback dataset:", err);
    }
  };

  const handleCityChange = (city: string) => {
    setFilters((prev) => ({ ...prev, city }));
  };

  const handleToggleFastDc = () => {
    setFilters((prev) => ({
      ...prev,
      minPowerKw: prev.minPowerKw >= 50 ? 0 : 50,
    }));
  };

  const handleToggleAvailable = () => {
    setFilters((prev) => ({
      ...prev,
      onlyAvailable: !prev.onlyAvailable,
    }));
  };

  const handleSelectConnector = (connector: string | null) => {
    setFilters((prev) => ({ ...prev, connector }));
  };

  // Filter stations based on city, search, speed, availability, network, and connectors
  const filteredStations = useMemo(() => {
    return allStations.filter((s) => {
      // 1. City Filter
      if (filters.city && filters.city !== "All India") {
        if (s.city.toLowerCase() !== filters.city.toLowerCase()) {
          return false;
        }
      }

      // 2. Fast DC / Power Filter (kW)
      if (filters.minPowerKw > 0 && s.maxPowerKw < filters.minPowerKw) {
        return false;
      }

      // 3. Availability Filter
      if (filters.onlyAvailable && s.status !== "available") {
        return false;
      }

      // 4. Connector Filter
      if (filters.connector) {
        if (!s.connectors.some((c) => c.toLowerCase().includes(filters.connector!.toLowerCase()))) {
          return false;
        }
      }

      // 5. Network Brand Filter
      if (filters.network) {
        if (!s.network.toLowerCase().includes(filters.network.toLowerCase())) {
          return false;
        }
      }

      // 6. Search Text Filter
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
  }, [allStations, filters, searchQuery]);

  const activeFilterCount = [
    filters.city !== "All India",
    filters.minPowerKw > 0,
    filters.connector !== null,
    filters.network !== null,
    filters.onlyAvailable,
  ].filter(Boolean).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Search & Brand Header with Theme Toggle & Working Filter Button */}
      <HeaderBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFilters={() => setFilterModalVisible(true)}
        stationCount={filteredStations.length}
        currentCity={filters.city}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        activeFilterCount={activeFilterCount}
      />

      {/* Horizontal Quick Filter Chips */}
      <FilterChipsBar
        onlyFastDc={filters.minPowerKw >= 50}
        onToggleFastDc={handleToggleFastDc}
        onlyAvailable={filters.onlyAvailable}
        onToggleAvailable={handleToggleAvailable}
        selectedConnector={filters.connector}
        onSelectConnector={handleSelectConnector}
        selectedCity={filters.city}
        onSelectCity={handleCityChange}
        isDark={isDark}
      />

      {/* Main Content: Map or List View */}
      {viewMode === "map" ? (
        <View style={styles.mapContainer}>
          <LeafletMapView
            stations={filteredStations}
            selectedCity={filters.city}
            onSelectStation={(station) => {
              setSelectedStation(station);
              setSheetVisible(true);
            }}
            isDark={isDark}
          />
        </View>
      ) : (
        <View style={[styles.listContainer, { backgroundColor: colors.background }]}>
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
                  isDark={isDark}
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
          style={[styles.viewTogglePill, { backgroundColor: colors.primary }]}
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

      {/* Filter Modal Drawer */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={() =>
          setFilters({
            city: "All India",
            minPowerKw: 0,
            connector: null,
            network: null,
            onlyAvailable: false,
          })
        }
        totalMatchingStations={filteredStations.length}
        isDark={isDark}
      />

      {/* Station Detail Bottom Sheet */}
      <StationDetailBottomSheet
        station={selectedStation}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        isDark={isDark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.full,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#020617",
  },
});
