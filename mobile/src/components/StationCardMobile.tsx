import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Zap, MapPin, Navigation } from "lucide-react-native";
import { Station } from "../types";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";

interface StationCardMobileProps {
  station: Station;
  onPress: (station: Station) => void;
  onNavigate: (station: Station) => void;
  showDistance?: boolean;
  isDark?: boolean;
}

const STATUS_LABEL: Record<Station["status"], string> = {
  available: "Available",
  limited: "Limited",
  busy: "Busy",
  offline: "Offline",
};

const StationCardMobileComponent: React.FC<StationCardMobileProps> = ({
  station,
  onPress,
  onNavigate,
  showDistance = false,
  isDark = true,
}) => {
  const colors = isDark ? darkColors : lightColors;

  const statusColor =
    station.status === "available"
      ? colors.success
      : station.status === "offline"
        ? colors.destructive
        : colors.warning;

  const statusBg =
    station.status === "available"
      ? colors.successBg
      : station.status === "offline"
        ? colors.destructiveBg
        : colors.warningBg;

  const hasDistance =
    showDistance && typeof station.distanceKm === "number" && station.distanceKm >= 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
        },
      ]}
      onPress={() => onPress(station)}
      activeOpacity={0.85}
    >
      {/* Top Row: Network Badge + Status / Distance */}
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

        <View style={styles.topRightBadges}>
          {hasDistance ? (
            <View style={[styles.distancePill, { backgroundColor: colors.backgroundInput, borderColor: colors.border }]}>
              <Text style={[styles.distanceText, { color: colors.primary }]}>
                {station.distanceKm!.toFixed(1)} km
              </Text>
            </View>
          ) : null}

          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[station.status]}
            </Text>
          </View>
        </View>
      </View>

      {/* Station Name */}
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
        {station.name}
      </Text>

      {/* Address & City */}
      <View style={styles.addressRow}>
        <MapPin size={13} color={colors.foregroundSubtle} />
        <Text style={[styles.addressText, { color: colors.foregroundMuted }]} numberOfLines={1}>
          {station.address || station.city}
          {station.city && station.address && !station.address.toLowerCase().includes(station.city.toLowerCase())
            ? `, ${station.city}`
            : ""}
        </Text>
      </View>

      {/* Speed, Ports & Price Metrics */}
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
          <Text style={[styles.statLabel, { color: colors.foregroundSubtle }]}>MAX POWER</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {station.maxPowerKw} kW
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.foregroundSubtle }]}>TOTAL PORTS</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {station.totalPorts} {station.totalPorts === 1 ? "Port" : "Ports"}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.foregroundSubtle }]}>TARIFF</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            ₹{station.pricePerKwh}/kWh
          </Text>
        </View>
      </View>

      {/* Connectors & Directions Button */}
      <View style={styles.footerRow}>
        <View style={styles.connectorTags}>
          {station.connectors.slice(0, 3).map((conn, idx) => (
            <View
              key={`${conn}-${idx}`}
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
          onPress={(e) => {
            e.stopPropagation();
            onNavigate(station);
          }}
          activeOpacity={0.8}
        >
          <Navigation size={13} color="#020617" />
          <Text style={styles.navButtonText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export const StationCardMobile = memo(StationCardMobileComponent);

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
    gap: 8,
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
    flexShrink: 1,
  },
  networkText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  topRightBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distancePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
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
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 22,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: spacing.xs,
  },
  connectorTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
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
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#020617",
  },
});
