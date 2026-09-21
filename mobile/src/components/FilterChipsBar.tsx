import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Zap, CheckCircle2 } from "lucide-react-native";
import { darkColors, lightColors, radius, spacing } from "../theme/theme";

interface FilterChipsBarProps {
  onlyFastDc: boolean;
  onToggleFastDc: () => void;
  onlyAvailable: boolean;
  onToggleAvailable: () => void;
  selectedConnector: string | null;
  onSelectConnector: (c: string | null) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  isDark?: boolean;
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
  isDark = true,
}) => {
  const colors = isDark ? darkColors : lightColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Fast DC Filter Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: onlyFastDc ? colors.primary : colors.backgroundCardSolid,
              borderColor: onlyFastDc ? colors.primary : colors.border,
            },
          ]}
          onPress={onToggleFastDc}
          activeOpacity={0.7}
        >
          <Zap size={14} color={onlyFastDc ? "#020617" : colors.primary} />
          <Text
            style={[
              styles.chipText,
              { color: onlyFastDc ? "#020617" : colors.foregroundMuted },
              onlyFastDc && styles.boldText,
            ]}
          >
            ⚡ Fast DC (≥50kW)
          </Text>
        </TouchableOpacity>

        {/* Available Now Filter Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: onlyAvailable ? colors.success : colors.backgroundCardSolid,
              borderColor: onlyAvailable ? colors.success : colors.border,
            },
          ]}
          onPress={onToggleAvailable}
          activeOpacity={0.7}
        >
          <CheckCircle2 size={14} color={onlyAvailable ? "#020617" : colors.success} />
          <Text
            style={[
              styles.chipText,
              { color: onlyAvailable ? "#020617" : colors.foregroundMuted },
              onlyAvailable && styles.boldText,
            ]}
          >
            🟢 Available Free
          </Text>
        </TouchableOpacity>

        {/* CCS2 Plug Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: selectedConnector === "CCS2" ? colors.primary : colors.backgroundCardSolid,
              borderColor: selectedConnector === "CCS2" ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onSelectConnector(selectedConnector === "CCS2" ? null : "CCS2")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              { color: selectedConnector === "CCS2" ? "#020617" : colors.foregroundMuted },
              selectedConnector === "CCS2" && styles.boldText,
            ]}
          >
            🔌 CCS2
          </Text>
        </TouchableOpacity>

        {/* Type 2 Plug Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: selectedConnector === "Type 2" ? colors.primary : colors.backgroundCardSolid,
              borderColor: selectedConnector === "Type 2" ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onSelectConnector(selectedConnector === "Type 2" ? null : "Type 2")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              { color: selectedConnector === "Type 2" ? "#020617" : colors.foregroundMuted },
              selectedConnector === "Type 2" && styles.boldText,
            ]}
          >
            🔌 Type 2 AC
          </Text>
        </TouchableOpacity>

        {/* City Filter Chips */}
        {CITIES.map((city) => {
          const isActive = selectedCity === city;
          return (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityChip,
                {
                  backgroundColor: isActive ? "rgba(56, 189, 248, 0.15)" : colors.backgroundInput,
                  borderColor: isActive ? colors.primary : colors.borderSubtle,
                },
              ]}
              onPress={() => onSelectCity(city)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cityChipText,
                  { color: isActive ? colors.primary : colors.frost },
                  isActive && styles.boldText,
                ]}
              >
                {city}
              </Text>
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
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
