import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";
import { Map, Route, Car, Shield } from "lucide-react-native";

import { colors, radius, spacing } from "./src/theme/theme";
import { api } from "./src/api/client";
import { MapDiscoveryScreen } from "./src/screens/MapDiscoveryScreen";
import { RoutePlannerScreen } from "./src/screens/RoutePlannerScreen";
import { GarageProfileScreen } from "./src/screens/GarageProfileScreen";
import { AuthModal } from "./src/screens/AuthModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<"map" | "route" | "garage">("map");
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    api.init();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Main Tab Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === "map" && <MapDiscoveryScreen />}
        {activeTab === "route" && <RoutePlannerScreen />}
        {activeTab === "garage" && (
          <GarageProfileScreen onOpenAuth={() => setAuthModalVisible(true)} />
        )}
      </View>

      {/* Sleek Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "map" && styles.activeTabItem]}
          onPress={() => setActiveTab("map")}
          activeOpacity={0.8}
        >
          <Map size={20} color={activeTab === "map" ? colors.primary : colors.foregroundMuted} />
          <Text style={[styles.tabLabel, activeTab === "map" && styles.activeTabLabel]}>
            Explore Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "route" && styles.activeTabItem]}
          onPress={() => setActiveTab("route")}
          activeOpacity={0.8}
        >
          <Route size={20} color={activeTab === "route" ? colors.primary : colors.foregroundMuted} />
          <Text style={[styles.tabLabel, activeTab === "route" && styles.activeTabLabel]}>
            Corridors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "garage" && styles.activeTabItem]}
          onPress={() => setActiveTab("garage")}
          activeOpacity={0.8}
        >
          <Car size={20} color={activeTab === "garage" ? colors.primary : colors.foregroundMuted} />
          <Text style={[styles.tabLabel, activeTab === "garage" && styles.activeTabLabel]}>
            Garage
          </Text>
        </TouchableOpacity>
      </View>

      {/* Auth Modal */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    gap: 4,
  },
  activeTabItem: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: "800",
  },
});
