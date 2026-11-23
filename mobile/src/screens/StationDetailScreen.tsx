import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  RefreshControl,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  MapPin,
  Navigation,
  Share2,
  Zap,
  Clock,
  Star,
  Info,
} from "lucide-react-native";

import type { Station } from "../types";
import type { RootStackParamList } from "../navigation/types";
import {
  fetchStationById,
  getErrorMessage,
  isAbortError,
} from "../api/stationsApi";
import { colors, radius, spacing } from "../theme/theme";
import { openStationDirections } from "../utils/maps";
import { LeafletMapView } from "../components/LeafletMapView";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";

type Props = NativeStackScreenProps<RootStackParamList, "StationDetail">;

const STATUS_LABEL: Record<Station["status"], string> = {
  available: "Available",
  limited: "Limited",
  busy: "Busy",
  offline: "Offline",
};

export const StationDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { stationId, station: initialStation } = route.params;

  const [station, setStation] = useState<Station | null>(initialStation || null);
  const [loading, setLoading] = useState<boolean>(!initialStation);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false, signal?: AbortSignal) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!station) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await fetchStationById(stationId, signal);
        setStation(data);
        navigation.setOptions({ title: data.name });
      } catch (err) {
        if (!isAbortError(err)) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [stationId, navigation, station]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(false, controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const mapCenter = useMemo(
    () =>
      station
        ? { lat: station.lat, lng: station.lng, zoom: 15, key: 1 }
        : undefined,
    [station?.lat, station?.lng]
  );

  const singleStationList = useMemo(() => (station ? [station] : []), [station]);

  const handleShare = async () => {
    if (!station) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
    try {
      await Share.share({
        title: station.name,
        message: `${station.name} (${station.network})\n${station.address}${
          station.city ? `, ${station.city}` : ""
        }\nMax Power: ${station.maxPowerKw} kW · Connectors: ${station.connectors.join(", ")}\n${mapsUrl}`,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  if (loading && !station) {
    return <LoadingState message="Loading station details..." />;
  }

  if (error && !station) {
    return (
      <ErrorState
        title="Can't load station"
        message={error}
        onRetry={() => loadData(false)}
      />
    );
  }

  if (!station) {
    return <EmptyState title="Station not found" message="This station could not be loaded." />;
  }

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

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top badges: Network + Status */}
        <View style={styles.badgeRow}>
          <View style={styles.networkBadge}>
            <Zap size={12} color={colors.accent} />
            <Text style={styles.networkText}>{station.network}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[station.status]}
            </Text>
          </View>
        </View>

        {/* Station Name & Address */}
        <Text style={styles.title}>{station.name}</Text>

        <View style={styles.addressRow}>
          <MapPin size={15} color={colors.foregroundSubtle} style={styles.addressIcon} />
          <Text style={styles.addressText}>
            {station.address}
            {station.city && !station.address.toLowerCase().includes(station.city.toLowerCase())
              ? `, ${station.city}`
              : ""}
            {station.state ? `, ${station.state}` : ""}
            {station.pincode ? ` - ${station.pincode}` : ""}
          </Text>
        </View>

        {/* Primary Action Buttons: Get Directions + Share */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={() => openStationDirections(station.lat, station.lng, station.name)}
            activeOpacity={0.85}
          >
            <Navigation size={17} color={colors.accentForeground} />
            <Text style={styles.directionsText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Share2 size={17} color={colors.primary} />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Demo data hint */}
        <View style={styles.demoHint}>
          <Info size={14} color={colors.foregroundMuted} />
          <Text style={styles.demoHintText}>
            Tariff and rating values shown are representative sample data.
          </Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL PORTS</Text>
            <Text style={[styles.metricValue, { color: colors.accent }]}>
              {station.totalPorts} {station.totalPorts === 1 ? "Port" : "Ports"}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>MAX POWER</Text>
            <Text style={styles.metricValue}>{station.maxPowerKw} kW</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PRICE</Text>
            <Text style={styles.metricValue}>₹{station.pricePerKwh}/kWh</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>RATING</Text>
            <View style={styles.ratingValueRow}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.metricValue}>
                {station.rating > 0 ? station.rating.toFixed(1) : "—"}
              </Text>
              <Text style={styles.reviewCountSmall}>({station.reviews})</Text>
            </View>
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.infoCard}>
          <View style={styles.hoursRow}>
            <Clock size={16} color={colors.primary} />
            <View>
              <Text style={styles.infoLabel}>OPERATING HOURS</Text>
              <Text style={styles.infoValue}>{station.hours || "24×7"}</Text>
            </View>
          </View>
        </View>

        {/* Connectors */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Connectors</Text>
          <View style={styles.chipWrap}>
            {station.connectors.map((c, idx) => (
              <View key={`${c}-${idx}`} style={styles.connectorChip}>
                <Zap size={13} color={colors.accent} />
                <Text style={styles.connectorChipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Amenities */}
        {station.amenities.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.chipWrap}>
              {station.amenities.map((a, idx) => (
                <View key={`${a}-${idx}`} style={styles.amenityChip}>
                  <Text style={styles.amenityChipText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Small Map Preview */}
        <View style={styles.sectionCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Location Preview</Text>
            <Text style={styles.coordsText}>
              {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
            </Text>
          </View>
          <View style={styles.mapPreviewContainer}>
            <LeafletMapView
              stations={singleStationList}
              center={mapCenter}
              onSelectStation={() => {}}
              isDark
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 242, 254, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  networkText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  directionsBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  shareText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  demoHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  demoHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
    marginTop: 4,
  },
  ratingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  reviewCountSmall: {
    fontSize: 12,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.foreground,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  connectorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 242, 254, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  connectorChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  amenityChip: {
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  amenityChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coordsText: {
    fontSize: 11,
    color: colors.foregroundSubtle,
    fontWeight: "600",
  },
  mapPreviewContainer: {
    height: 200,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
