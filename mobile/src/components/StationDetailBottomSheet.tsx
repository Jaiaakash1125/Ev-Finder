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
  CheckCircle2,
} from "lucide-react-native";
import { Station } from "../types";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";

interface StationDetailBottomSheetProps {
  station: Station | null;
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const StationDetailBottomSheet: React.FC<StationDetailBottomSheetProps> = ({
  station,
  visible,
  onClose,
  isDark = true,
}) => {
  const [copied, setCopied] = useState(false);
  const colors = isDark ? darkColors : lightColors;

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

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Drag Handle */}
          <View style={[styles.dragHandle, { backgroundColor: colors.foregroundSubtle }]} />

          {/* Network & City Header Bar */}
          <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.networkTag}>
              <Text style={[styles.networkText, { color: colors.accent }]}>{station.network}</Text>
              <Text style={[styles.cityText, { color: colors.frost }]}>· 📍 {station.city}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.frost} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Title & Full Address */}
            <Text style={[styles.title, { color: colors.foreground }]}>{station.name}</Text>
            <View style={styles.addressRow}>
              <MapPin size={14} color={colors.foregroundSubtle} />
              <Text style={[styles.addressText, { color: colors.foregroundMuted }]}>
                {station.address}
              </Text>
            </View>

            {/* Big Action Buttons Row (Directions & Copy GPS) */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.primaryNavBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenDirections}
                activeOpacity={0.85}
              >
                <Navigation size={18} color="#020617" />
                <Text style={styles.primaryNavText}>Get Directions (Google Maps) ↗</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryCopyBtn,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleCopyCoords}
                activeOpacity={0.85}
              >
                <Copy size={15} color={colors.primary} />
                <Text style={[styles.secondaryCopyText, { color: colors.primary }]}>
                  {copied
                    ? "✓ GPS Coords Copied!"
                    : `Copy GPS (${station.lat.toFixed(4)}, ${station.lng.toFixed(4)})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Key Metrics Grid (Max Speed & Total Ports) */}
            <View style={styles.metricsGrid}>
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.foregroundSubtle }]}>MAX SPEED</Text>
                <Text style={[styles.metricValue, { color: colors.foreground }]}>⚡ {station.maxPowerKw} kW</Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.foregroundSubtle }]}>TOTAL CHARGING BAYS</Text>
                <Text style={[styles.metricValue, { color: colors.accent }]}>
                  🔌 {station.totalPorts} Ports
                </Text>
              </View>
            </View>

            {/* Supported Connectors */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.frost }]}>Supported Connectors</Text>
              <View style={styles.connectorsRow}>
                {station.connectors.map((c) => (
                  <View
                    key={c}
                    style={[
                      styles.connPill,
                      {
                        backgroundColor: "rgba(0, 242, 254, 0.08)",
                        borderColor: "rgba(0, 242, 254, 0.25)",
                      },
                    ]}
                  >
                    <Zap size={13} color="#00f2fe" />
                    <Text style={[styles.connText, { color: colors.foreground }]}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Location Details & Hours */}
            <View style={styles.gridDetails}>
              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.foregroundSubtle }]}>CITY & STATE</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  📍 {station.city} {station.state ? `· ${station.state}` : ""}
                </Text>
              </View>
              <View
                style={[
                  styles.detailBox,
                  {
                    backgroundColor: colors.backgroundInput,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.foregroundSubtle }]}>OPERATING HOURS</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  🕒 {station.hours || "24×7"}
                </Text>
              </View>
            </View>

            {/* Footer Verification Badge */}
            <View style={[styles.footerRow, { borderTopColor: colors.borderSubtle }]}>
              <CheckCircle2 size={14} color={colors.success} />
              <Text style={[styles.footerText, { color: colors.frost }]}>
                OpenStreetMap Verified Station
              </Text>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: "85%",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
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
  },
  networkTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  networkText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cityText: {
    fontSize: 12,
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
    paddingVertical: 14,
    borderRadius: radius.lg,
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
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  secondaryCopyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
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
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  connText: {
    fontSize: 13,
    fontWeight: "700",
  },
  gridDetails: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailBox: {
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginBottom: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
