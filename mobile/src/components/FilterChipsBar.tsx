import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Zap, CheckCircle2, ShieldAlert, Clock, Sliders } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";

interface FilterChipsBarProps {
  onlyFastDc: boolean;
  onToggleFastDc: () => void;
  onlyAvailable: boolean;
  onToggleAvailable: () => void;
  selectedConnector: string | null;
  onSelectConnector: (c: string | null) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

const CITIES = ["All India", "Bengaluru", "New Delhi", "Mumbai", "Hyderabad", "Chennai", "Pune", "Kolkata"];

export const FilterChipsBar: React.FC<FilterChipsBarProps> = ({
  onlyFastDc,
  onToggleFastDc,
  onlyAvailable,
  onToggleAvailable,
  selectedConnector,
  onSelectConnector,
  selectedCity,
  onSelectCity,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Fast DC Filter Chip */}
        <TouchableOpacity
          style={[styles.chip, onlyFastDc && styles.activeChip]}
          onPress={onToggleFastDc}
          activeOpacity={0.7}
        >
          <Zap size={14} color={onlyFastDc ? colors.accentForeground : colors.primary} />
          <Text style={[styles.chipText, onlyFastDc && styles.activeChipText]}>⚡ Fast DC (≥50kW)</Text>
        </TouchableOpacity>

        {/* Available Now Filter Chip */}
        <TouchableOpacity
          style={[styles.chip, onlyAvailable && styles.activeChipSuccess]}
          onPress={onToggleAvailable}
          activeOpacity={0.7}
        >
          <CheckCircle2 size={14} color={onlyAvailable ? "#020617" : colors.success} />
          <Text style={[styles.chipText, onlyAvailable && styles.activeChipSuccessText]}>🟢 Available Free</Text>
        </TouchableOpacity>

        {/* CCS2 Plug Chip */}
        <TouchableOpacity
          style={[styles.chip, selectedConnector === "CCS2" && styles.activeChip]}
          onPress={() => onSelectConnector(selectedConnector === "CCS2" ? null : "CCS2")}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selectedConnector === "CCS2" && styles.activeChipText]}>🔌 CCS2</Text>
        </TouchableOpacity>

        {/* Type 2 Plug Chip */}
        <TouchableOpacity
          style={[styles.chip, selectedConnector === "Type 2" && styles.activeChip]}
          onPress={() => onSelectConnector(selectedConnector === "Type 2" ? null : "Type 2")}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selectedConnector === "Type 2" && styles.activeChipText]}>🔌 Type 2 AC</Text>
        </TouchableOpacity>

        {/* City Filter Chips */}
        {CITIES.map((city) => {
          const isActive = selectedCity === city;
          return (
            <TouchableOpacity
              key={city}
              style={[styles.cityChip, isActive && styles.activeCityChip]}
              onPress={() => onSelectCity(city)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cityChipText, isActive && styles.activeCityChipText]}>{city}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activeChipSuccess: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  activeChipText: {
    color: "#020617",
  },
  activeChipSuccessText: {
    color: "#020617",
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  activeCityChip: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.frost,
  },
  activeCityChipText: {
    color: colors.primary,
    fontWeight: "800",
  },
});
