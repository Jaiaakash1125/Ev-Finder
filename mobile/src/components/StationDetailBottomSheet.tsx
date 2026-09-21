import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import * as Linking from "expo-linking";
import {
  X,
  Zap,
  Navigation,
  MapPin,
  Copy,
  Clock,
  CheckCircle,
  Coffee,
  Wifi,
  ShieldCheck,
  Calendar,
} from "lucide-react-native";
import { Station } from "../types";
import { colors, radius, spacing } from "../theme/theme";

interface StationDetailBottomSheetProps {
  station: Station | null;
  visible: boolean;
  onClose: () => void;
  onReserveSlot?: (stationId: string) => void;
}

export const StationDetailBottomSheet: React.FC<StationDetailBottomSheetProps> = ({
  station,
  visible,
  onClose,
  onReserveSlot,
}) => {
  const [copied, setCopied] = useState(false);
  const [reserved, setReserved] = useState(false);

  if (!station) return null;

  const handleOpenDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    Linking.openURL(url);
  };

  const handleCopyCoords = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReserve = () => {
    if (onReserveSlot) {
      onReserveSlot(station.id);
    }
    setReserved(true);
    Alert.alert(
      "Bay Reserved!",
      `Charging slot at ${station.name} held for 15 minutes. Head over!`,
      [{ text: "OK", onPress: () => setReserved(false) }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Top Drag Handle & Header */}
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View style={styles.networkTag}>
              <Text style={styles.networkText}>{station.network}</Text>
              <Text style={styles.cityText}>· 📍 {station.city}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.frost} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Title & Address */}
            <Text style={styles.title}>{station.name}</Text>
            <View style={styles.addressRow}>
              <MapPin size={14} color={colors.foregroundSubtle} />
              <Text style={styles.addressText}>{station.address}</Text>
            </View>

            {/* Big Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.primaryNavBtn} onPress={handleOpenDirections} activeOpacity={0.85}>
                <Navigation size={16} color="#020617" />
                <Text style={styles.primaryNavText}>Get Directions ↗</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryCopyBtn} onPress={handleCopyCoords} activeOpacity={0.85}>
                <Copy size={14} color={colors.primary} />
                <Text style={styles.secondaryCopyText}>
                  {copied ? "Copied!" : `GPS (${station.lat.toFixed(2)}, ${station.lng.toFixed(2)})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>MAX SPEED</Text>
                <Text style={styles.metricValue}>⚡ {station.maxPowerKw} kW</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>AVAILABLE BAYS</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  🔌 {station.freePorts} / {station.totalPorts} Free
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TARIFF</Text>
                <Text style={styles.metricValue}>₹{station.pricePerKwh}/kWh</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>HOURS</Text>
                <Text style={styles.metricValue}>🕒 {station.hours || "24×7"}</Text>
              </View>
            </View>

            {/* Connectors Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supported Connectors</Text>
              <View style={styles.connectorsRow}>
                {station.connectors.map((conn, idx) => (
                  <View key={idx} style={styles.connPill}>
                    <Zap size={13} color="#00f2fe" />
                    <Text style={styles.connText}>{conn}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Amenities Section */}
            {station.amenities && station.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Station Amenities</Text>
                <View style={styles.amenitiesRow}>
                  {station.amenities.map((item, idx) => (
                    <View key={idx} style={styles.amenityPill}>
                      <Text style={styles.amenityText}>✨ {item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Reserve Charging Bay CTA */}
            <TouchableOpacity style={styles.reserveButton} onPress={handleReserve} activeOpacity={0.85}>
              <Calendar size={18} color="#020617" />
              <Text style={styles.reserveButtonText}>Reserve Charging Bay (Free)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "85%",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.foregroundSubtle,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  networkTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  networkText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
  },
  cityText: {
    fontSize: 12,
    color: colors.frost,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bodyScroll: {
    marginTop: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  addressText: {
    fontSize: 13,
    color: colors.foregroundMuted,
    flex: 1,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryNavBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryNavText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#020617",
  },
  secondaryCopyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  secondaryCopyText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "rgba(56, 189, 248, 0.05)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: 3,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.frost,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  connectorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  connPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 242, 254, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  connText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  amenityText: {
    fontSize: 12,
    color: colors.foregroundMuted,
  },
  reserveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  reserveButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#020617",
  },
});
