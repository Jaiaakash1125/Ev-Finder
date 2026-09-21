import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Navigation, Zap, BatteryCharging, ArrowDown, MapPin } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";
import { api } from "../api/client";
import { RoutePlanResult } from "../types";

export const RoutePlannerScreen: React.FC = () => {
  const [originCity, setOriginCity] = useState("Bengaluru");
  const [destCity, setDestCity] = useState("Chennai");
  const [currentSoc, setCurrentSoc] = useState("65");
  const [batterySize, setBatterySize] = useState("40.5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoutePlanResult | null>(null);

  const handlePlanRoute = async () => {
    setLoading(true);
    try {
      // Demo coordinates
      const coords: Record<string, { lat: number; lng: number }> = {
        Bengaluru: { lat: 12.9716, lng: 77.5946 },
        Chennai: { lat: 13.0827, lng: 80.2707 },
        Mumbai: { lat: 19.076, lng: 72.8777 },
        Pune: { lat: 18.5204, lng: 73.8567 },
        Hyderabad: { lat: 17.385, lng: 78.4867 },
        "New Delhi": { lat: 28.6139, lng: 77.209 },
      };

      const orig = coords[originCity] || coords["Bengaluru"];
      const dest = coords[destCity] || coords["Chennai"];

      const res = await api.planRoute({
        origin: orig,
        destination: dest,
        vehicle: {
          batteryKwh: Number(batterySize) || 40.5,
          currentSocPercent: Number(currentSoc) || 65,
          efficiencyKmPerKwh: 6.5,
        },
      });

      setResult(res.data);
    } catch (e) {
      console.warn("Route planning error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Navigation size={22} color="#00f2fe" />
        </View>
        <Text style={styles.title}>EV Highway Corridor Planner</Text>
        <Text style={styles.subtitle}>Calculate optimal fast-charging stops along your route</Text>
      </View>

      {/* Input Card */}
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>STARTING POINT</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={16} color={colors.primary} />
            <TextInput
              style={styles.input}
              value={originCity}
              onChangeText={setOriginCity}
              placeholder="e.g. Bengaluru"
              placeholderTextColor={colors.foregroundSubtle}
            />
          </View>
        </View>

        <View style={styles.connectorLine}>
          <ArrowDown size={16} color={colors.frost} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESTINATION</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={16} color={colors.accent} />
            <TextInput
              style={styles.input}
              value={destCity}
              onChangeText={setDestCity}
              placeholder="e.g. Chennai"
              placeholderTextColor={colors.foregroundSubtle}
            />
          </View>
        </View>

        {/* Vehicle Battery Inputs */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>CURRENT SOC (%)</Text>
            <View style={styles.inputWrapper}>
              <BatteryCharging size={16} color={colors.success} />
              <TextInput
                style={styles.input}
                value={currentSoc}
                onChangeText={setCurrentSoc}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>BATTERY SIZE (KWH)</Text>
            <View style={styles.inputWrapper}>
              <Zap size={16} color={colors.warning} />
              <TextInput
                style={styles.input}
                value={batterySize}
                onChangeText={setBatterySize}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Plan Route CTA */}
        <TouchableOpacity style={styles.planButton} onPress={handlePlanRoute} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <Zap size={18} color="#020617" />
              <Text style={styles.planButtonText}>Plan Highway Charging Stops</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Result Section */}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Trip Breakdown</Text>

          <View style={styles.statsSummary}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>DISTANCE</Text>
              <Text style={styles.statBoxValue}>{result.totalDistanceKm} km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>DRIVE TIME</Text>
              <Text style={styles.statBoxValue}>{Math.floor(result.estimatedDriveTimeMinutes / 60)}h {result.estimatedDriveTimeMinutes % 60}m</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>DESTINATION SOC</Text>
              <Text style={[styles.statBoxValue, { color: colors.success }]}>
                {result.arrivalDestinationSocPercent}%
              </Text>
            </View>
          </View>

          {/* Recommended Stops */}
          {result.recommendedStops.map((stop, idx) => (
            <View key={idx} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopBadge}>
                  <Text style={styles.stopBadgeText}>STOP #{stop.stopNumber}</Text>
                </View>
                <Text style={styles.stopTime}>⚡ {stop.chargeTimeMinutes} mins charge</Text>
              </View>

              <Text style={styles.stopStationName}>{stop.station.name}</Text>
              <Text style={styles.stopStationNetwork}>{stop.station.network} · {stop.station.city}</Text>

              <View style={styles.socChargeBar}>
                <Text style={styles.socText}>Arrive with {stop.estimatedArrivalSoc}%</Text>
                <Text style={styles.socArrow}>➔</Text>
                <Text style={[styles.socText, { color: colors.success }]}>Charge to {stop.targetChargeSoc}%</Text>
              </View>

              <Text style={styles.stopCost}>Estimated Cost: ₹{stop.estimatedCostInr}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  connectorLine: {
    alignItems: "center",
    marginVertical: 2,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  planButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  planButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#020617",
  },
  resultContainer: {
    marginTop: spacing.xl,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.foreground,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsSummary: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.foregroundSubtle,
  },
  statBoxValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 4,
  },
  stopCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  stopBadge: {
    backgroundColor: "rgba(0, 242, 254, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  stopBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
  },
  stopTime: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  stopStationName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 2,
  },
  stopStationNetwork: {
    fontSize: 12,
    color: colors.frost,
    marginBottom: spacing.sm,
  },
  socChargeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 8,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  socText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  socArrow: {
    color: colors.primary,
  },
  stopCost: {
    fontSize: 11,
    color: colors.foregroundSubtle,
    fontWeight: "600",
  },
});
