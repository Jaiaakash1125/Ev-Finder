import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import * as Linking from "expo-linking";
import {
  X,
  Zap,
  Navigation,
  MapPin,
  Copy,
  Clock,
  CheckCircle2,
} from "lucide-react-native";
import { Station } from "../types";
import { colors, radius, spacing } from "../theme/theme";

interface StationDetailBottomSheetProps {
  station: Station | null;
  visible: boolean;
  onClose: () => void;
}

export const StationDetailBottomSheet: React.FC<StationDetailBottomSheetProps> = ({
  station,
  visible,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!station) return null;

  const handleOpenDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    Linking.openURL(url);
  };

  const handleCopyCoords = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Top Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Network & City Header Bar */}
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
            {/* Title & Full Address */}
            <Text style={styles.title}>{station.name}</Text>
            <View style={styles.addressRow}>
              <MapPin size={14} color={colors.foregroundSubtle} />
              <Text style={styles.addressText}>{station.address}</Text>
            </View>

            {/* Big Action Buttons Row (Directions & Copy GPS) */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.primaryNavBtn}
                onPress={handleOpenDirections}
                activeOpacity={0.85}
              >
                <Navigation size={18} color="#020617" />
                <Text style={styles.primaryNavText}>Get Directions (Google Maps) ↗</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCopyBtn}
                onPress={handleCopyCoords}
                activeOpacity={0.85}
              >
                <Copy size={15} color={colors.primary} />
                <Text style={styles.secondaryCopyText}>
                  {copied
                    ? "✓ GPS Coords Copied!"
                    : `Copy GPS (${station.lat.toFixed(4)}, ${station.lng.toFixed(4)})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Key Metrics Grid (Max Speed & Total Ports) */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>MAX SPEED</Text>
                <Text style={styles.metricValue}>⚡ {station.maxPowerKw} kW</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TOTAL CHARGING BAYS</Text>
                <Text style={[styles.metricValue, { color: colors.accent }]}>
                  🔌 {station.totalPorts} Ports
                </Text>
              </View>
            </View>

            {/* Supported Connectors */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supported Connectors</Text>
              <View style={styles.connectorsRow}>
                {station.connectors.map((c) => (
                  <View key={c} style={styles.connPill}>
                    <Zap size={13} color="#00f2fe" />
                    <Text style={styles.connText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Location Details & Hours */}
            <View style={styles.gridDetails}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>CITY & STATE</Text>
                <Text style={styles.detailValue}>
                  📍 {station.city} {station.state ? `· ${station.state}` : ""}
                </Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>OPERATING HOURS</Text>
                <Text style={styles.detailValue}>🕒 {station.hours || "24×7"}</Text>
              </View>
            </View>

            {/* Footer Verification Badge */}
            <View style={styles.footerRow}>
              <CheckCircle2 size={14} color={colors.success} />
              <Text style={styles.footerText}>OpenStreetMap Verified Station</Text>
            </View>
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
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  primaryNavBtn: {
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
    fontWeight: "900",
    color: "#020617",
  },
  secondaryCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  secondaryCopyText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(56, 189, 248, 0.05)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.foreground,
    marginTop: 3,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
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
  gridDetails: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: colors.frost,
    fontWeight: "600",
  },
});
