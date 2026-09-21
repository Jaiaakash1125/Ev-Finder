import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Zap, Search, SlidersHorizontal, MapPin } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onOpenFilters: () => void;
  stationCount: number;
  currentCity: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenFilters,
  stationCount,
  currentCity,
}) => {
  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Zap size={18} color="#00f2fe" fill="#00f2fe" />
          </View>
          <View>
            <Text style={styles.brandTitle}>
              EV<Text style={styles.brandAccent}>FINDER</Text>
            </Text>
            <Text style={styles.brandSubtitle}>INDIA CHARGING NETWORK</Text>
          </View>
        </View>

        {/* Live Stations Badge */}
        <View style={styles.statusBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusText}>{stationCount} LIVE</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.foregroundMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${currentCity} or brand...`}
          placeholderTextColor={colors.foregroundSubtle}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        <TouchableOpacity style={styles.filterButton} onPress={onOpenFilters} activeOpacity={0.7}>
          <SlidersHorizontal size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: colors.primary,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.frost,
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.success,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundCardSolid,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
  },
  filterButton: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
});
