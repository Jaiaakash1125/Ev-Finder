import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Zap, Search, SlidersHorizontal, Sun, Moon } from "lucide-react-native";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onOpenFilters: () => void;
  stationCount: number;
  currentCity: string;
  isDark: boolean;
  onToggleTheme: () => void;
  activeFilterCount?: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenFilters,
  stationCount,
  currentCity,
  isDark,
  onToggleTheme,
  activeFilterCount = 0,
}) => {
  const colors = isDark ? darkColors : lightColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.borderSubtle }]}>
      {/* Brand Header */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, { backgroundColor: "rgba(0, 242, 254, 0.12)", borderColor: "rgba(0, 242, 254, 0.3)" }]}>
            <Zap size={18} color="#00f2fe" fill="#00f2fe" />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>
              EV<Text style={{ color: colors.primary }}>FINDER</Text>
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.frost }]}>INDIA CHARGING NETWORK</Text>
          </View>
        </View>

        {/* Right side: Live Badge + Theme Toggle */}
        <View style={styles.topRightGroup}>
          <View style={[styles.statusBadge, { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }]}>
            <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, { color: colors.success }]}>{stationCount} LIVE</Text>
          </View>

          {/* Theme Switcher Button (Sun / Moon) */}
          <TouchableOpacity
            style={[
              styles.themeBtn,
              {
                backgroundColor: colors.backgroundCardSolid,
                borderColor: colors.border,
              },
            ]}
            onPress={onToggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Theme"
          >
            {isDark ? (
              <Sun size={17} color="#f59e0b" fill="#f59e0b" />
            ) : (
              <Moon size={17} color="#4338ca" fill="#4338ca" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar with Working Filter Button */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.backgroundCardSolid,
            borderColor: colors.border,
          },
        ]}
      >
        <Search size={18} color={colors.foregroundMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={`Search ${currentCity} or brand...`}
          placeholderTextColor={colors.foregroundSubtle}
          value={searchQuery}
          onChangeText={onSearchChange}
        />

        {/* Working Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFilterCount > 0 ? colors.primary : "rgba(56, 189, 248, 0.12)",
            },
          ]}
          onPress={onOpenFilters}
          activeOpacity={0.7}
        >
          <SlidersHorizontal
            size={16}
            color={activeFilterCount > 0 ? "#020617" : colors.primary}
          />
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
    borderBottomWidth: 1,
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
    width: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  topRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  filterButton: {
    padding: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
