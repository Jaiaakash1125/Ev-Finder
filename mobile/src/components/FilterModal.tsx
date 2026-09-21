import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { X, Check, Zap, SlidersHorizontal, RotateCcw } from "lucide-react-native";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";

export interface FilterState {
  city: string;
  minPowerKw: number;
  connector: string | null;
  network: string | null;
  onlyAvailable: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  totalMatchingStations: number;
  isDark: boolean;
}

const CITIES = [
  "All India",
  "Bengaluru",
  "New Delhi",
  "Mumbai",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Chandigarh",
  "Lucknow",
  "Surat",
  "Indore",
  "Coimbatore",
  "Goa",
  "Nagpur",
  "Vadodara",
];

const SPEED_TIERS = [
  { label: "All Speeds", minKw: 0 },
  { label: "⚡ Fast DC (≥50 kW)", minKw: 50 },
  { label: "⚡ Rapid (≥100 kW)", minKw: 100 },
  { label: "⚡ Ultra (≥150 kW)", minKw: 150 },
  { label: "⚡ Hyper (≥240 kW)", minKw: 240 },
];

const CONNECTORS = [
  { id: "CCS2", label: "CCS2 (DC Fast)" },
  { id: "Type 2", label: "Type 2 AC" },
  { id: "CHAdeMO", label: "CHAdeMO" },
  { id: "GB/T", label: "GB/T" },
];

const NETWORKS = [
  "Tata Power EZ Charge",
  "Jio-bp pulse",
  "Statiq",
  "Ather Grid",
  "BPCL eDrive",
  "Zeon Charging",
  "Charge Zone",
  "GLIDA",
  "Relux Electric",
  "Magenta ChargeGrid",
  "Kazam EV",
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  totalMatchingStations,
  isDark,
}) => {
  const colors = isDark ? darkColors : lightColors;
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const activeCount = [
    localFilters.city !== "All India",
    localFilters.minPowerKw > 0,
    localFilters.connector !== null,
    localFilters.network !== null,
    localFilters.onlyAvailable,
  ].filter(Boolean).length;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultState: FilterState = {
      city: "All India",
      minPowerKw: 0,
      connector: null,
      network: null,
      onlyAvailable: false,
    };
    setLocalFilters(defaultState);
    onResetFilters();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerLeft}>
              <SlidersHorizontal size={18} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Filter Stations</Text>
              {activeCount > 0 && (
                <View style={[styles.activeBadge, { backgroundColor: "rgba(56, 189, 248, 0.15)", borderColor: colors.primary }]}>
                  <Text style={[styles.activeBadgeText, { color: colors.primary }]}>
                    {activeCount} active
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.frost} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* 1. City / Region */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.frost }]}>CITY / REGION</Text>
              <View style={styles.chipRow}>
                {CITIES.map((city) => {
                  const active = localFilters.city === city;
                  return (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primary : colors.backgroundInput,
                          borderColor: active ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setLocalFilters({ ...localFilters, city })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#020617" : colors.foreground },
                          active && styles.boldText,
                        ]}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Speed / Charging Speed Tiers */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.frost }]}>CHARGING SPEED TIER</Text>
              <View style={styles.chipRow}>
                {SPEED_TIERS.map((tier) => {
                  const active = localFilters.minPowerKw === tier.minKw;
                  return (
                    <TouchableOpacity
                      key={tier.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.accent : colors.backgroundInput,
                          borderColor: active ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setLocalFilters({ ...localFilters, minPowerKw: tier.minKw })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#020617" : colors.foreground },
                          active && styles.boldText,
                        ]}
                      >
                        {tier.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Supported Connector Type */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.frost }]}>CONNECTOR TYPE</Text>
              <View style={styles.chipRow}>
                {CONNECTORS.map((c) => {
                  const active = localFilters.connector === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primary : colors.backgroundInput,
                          borderColor: active ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          connector: active ? null : c.id,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#020617" : colors.foreground },
                          active && styles.boldText,
                        ]}
                      >
                        🔌 {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Live Availability */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.frost }]}>AVAILABILITY</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor: !localFilters.onlyAvailable
                        ? colors.primary
                        : colors.backgroundInput,
                      borderColor: !localFilters.onlyAvailable ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, onlyAvailable: false })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: !localFilters.onlyAvailable ? "#020617" : colors.foreground },
                      !localFilters.onlyAvailable && styles.boldText,
                    ]}
                  >
                    Show All Stations
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor: localFilters.onlyAvailable
                        ? colors.success
                        : colors.backgroundInput,
                      borderColor: localFilters.onlyAvailable ? colors.success : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, onlyAvailable: true })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: localFilters.onlyAvailable ? "#020617" : colors.foreground },
                      localFilters.onlyAvailable && styles.boldText,
                    ]}
                  >
                    🟢 Available Free Only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. Network Brand */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.frost }]}>CHARGING NETWORK</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor: localFilters.network === null
                        ? colors.primary
                        : colors.backgroundInput,
                      borderColor: localFilters.network === null ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, network: null })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: localFilters.network === null ? "#020617" : colors.foreground },
                      localFilters.network === null && styles.boldText,
                    ]}
                  >
                    All Networks
                  </Text>
                </TouchableOpacity>

                {NETWORKS.map((net) => {
                  const active = localFilters.network === net;
                  return (
                    <TouchableOpacity
                      key={net}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.accent : colors.backgroundInput,
                          borderColor: active ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          network: active ? null : net,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#020617" : colors.foreground },
                          active && styles.boldText,
                        ]}
                      >
                        ⚡ {net}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={[styles.footerRow, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.borderSubtle }]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={15} color={colors.frost} />
              <Text style={[styles.resetText, { color: colors.frost }]}>Reset All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>
                Show {totalMatchingStations} Stations
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  scrollBody: {
    marginTop: spacing.md,
    maxHeight: 450,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  boldText: {
    fontWeight: "900",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "700",
  },
  applyBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#020617",
  },
});
