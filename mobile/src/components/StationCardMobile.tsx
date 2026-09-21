import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Zap, MapPin, Navigation } from "lucide-react-native";
import { Station } from "../types";
import { colors, radius, spacing } from "../theme/theme";

interface StationCardMobileProps {
  station: Station;
  onPress: () => void;
  onNavigate: () => void;
}

export const StationCardMobile: React.FC<StationCardMobileProps> = ({
  station,
  onPress,
  onNavigate,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Network Badge */}
      <View style={styles.topRow}>
        <View style={styles.networkBadge}>
          <Zap size={12} color="#00f2fe" />
          <Text style={styles.networkText} numberOfLines={1}>
            {station.network}
          </Text>
        </View>
        <Text style={styles.cityText}>📍 {station.city}</Text>
      </View>

      {/* Station Name */}
      <Text style={styles.name} numberOfLines={1}>
        {station.name}
      </Text>

      {/* Address */}
      <View style={styles.addressRow}>
        <MapPin size={13} color={colors.foregroundSubtle} />
        <Text style={styles.addressText} numberOfLines={1}>
          {station.address}
        </Text>
      </View>

      {/* Speed & Ports Metrics */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>MAX SPEED</Text>
          <Text style={styles.statValue}>⚡ {station.maxPowerKw} kW</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>CHARGING BAYS</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            🔌 {station.totalPorts} Ports
          </Text>
        </View>
      </View>

      {/* Connectors & Directions Button */}
      <View style={styles.footerRow}>
        <View style={styles.connectorTags}>
          {station.connectors.slice(0, 2).map((conn, idx) => (
            <View key={idx} style={styles.connectorBadge}>
              <Text style={styles.connectorText}>{conn}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.navButton} onPress={onNavigate} activeOpacity={0.8}>
          <Navigation size={13} color="#020617" />
          <Text style={styles.navButtonText}>Directions ↗</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#00f2fe",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
    backgroundColor: "rgba(0, 242, 254, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    maxWidth: "70%",
  },
  networkText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
  },
  cityText: {
    fontSize: 11,
    color: colors.frost,
    fontWeight: "600",
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
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
    color: colors.foregroundMuted,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(56, 189, 248, 0.04)",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.borderSubtle,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.foregroundSubtle,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.foreground,
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  connectorText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.frost,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
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
