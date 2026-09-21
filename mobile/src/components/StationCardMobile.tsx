import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Zap, MapPin, Navigation } from "lucide-react-native";
import { Station } from "../types";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";

interface StationCardMobileProps {
  station: Station;
  onPress: () => void;
  onNavigate: () => void;
  isDark?: boolean;
}

export const StationCardMobile: React.FC<StationCardMobileProps> = ({
  station,
  onPress,
  onNavigate,
  isDark = true,
}) => {
  const colors = isDark ? darkColors : lightColors;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Network Badge */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.networkBadge,
            {
              backgroundColor: "rgba(0, 242, 254, 0.1)",
              borderColor: "rgba(0, 242, 254, 0.25)",
            },
          ]}
        >
          <Zap size={12} color="#00f2fe" />
          <Text style={[styles.networkText, { color: colors.accent }]} numberOfLines={1}>
            {station.network}
          </Text>
        </View>
        <Text style={[styles.cityText, { color: colors.frost }]}>📍 {station.city}</Text>
      </View>

      {/* Station Name */}
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
        {station.name}
      </Text>

      {/* Address */}
      <View style={styles.addressRow}>
        <MapPin size={13} color={colors.foregroundSubtle} />
        <Text style={[styles.addressText, { color: colors.foregroundMuted }]} numberOfLines={1}>
          {station.address}
        </Text>
      </View>

      {/* Speed & Ports Metrics */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: colors.backgroundInput,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.foregroundSubtle }]}>MAX SPEED</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>⚡ {station.maxPowerKw} kW</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.foregroundSubtle }]}>CHARGING BAYS</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            🔌 {station.totalPorts} Ports
          </Text>
        </View>
      </View>

      {/* Connectors & Directions Button */}
      <View style={styles.footerRow}>
        <View style={styles.connectorTags}>
          {station.connectors.slice(0, 2).map((conn, idx) => (
            <View
              key={idx}
              style={[
                styles.connectorBadge,
                {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.connectorText, { color: colors.frost }]}>{conn}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: colors.primary }]}
          onPress={onNavigate}
          activeOpacity={0.8}
        >
          <Navigation size={13} color="#020617" />
          <Text style={styles.navButtonText}>Directions ↗</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    maxWidth: "70%",
  },
  networkText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    marginVertical: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  addressText: {
    fontSize: 12,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 20,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  connectorTags: {
    flexDirection: "row",
    gap: 6,
  },
  connectorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  connectorText: {
    fontSize: 10,
    fontWeight: "700",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#020617",
  },
});
