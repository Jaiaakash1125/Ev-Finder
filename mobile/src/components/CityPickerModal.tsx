import React, { useMemo, useState, useCallback, memo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { X, Search, MapPin, Check } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";

interface CityPickerModalProps {
  visible: boolean;
  onClose: () => void;
  cities: string[];
  loading: boolean;
  error: string | null;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onRetryLoad?: () => void;
}

interface CityRowProps {
  city: string;
  isSelected: boolean;
  onSelect: (city: string) => void;
}

const CityRow = memo(({ city, isSelected, onSelect }: CityRowProps) => (
  <TouchableOpacity
    style={[styles.cityRow, isSelected && styles.cityRowSelected]}
    onPress={() => onSelect(city)}
    activeOpacity={0.75}
  >
    <Text style={[styles.cityText, isSelected && styles.cityTextSelected]}>{city}</Text>
    {isSelected ? <Check size={16} color={colors.primary} /> : null}
  </TouchableOpacity>
));

export const CityPickerModal: React.FC<CityPickerModalProps> = ({
  visible,
  onClose,
  cities,
  loading,
  error,
  selectedCity,
  onSelectCity,
  onRetryLoad,
}) => {
  const [filterText, setFilterText] = useState("");

  const filteredCities = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const list = ["All India", ...cities];
    if (!q) return list;
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [cities, filterText]);

  const handlePick = useCallback(
    (city: string) => {
      onSelectCity(city);
      setFilterText("");
      onClose();
    },
    [onSelectCity, onClose]
  );

  const renderCityItem = useCallback(
    ({ item }: { item: string }) => (
      <CityRow city={item} isSelected={selectedCity === item} onSelect={handlePick} />
    ),
    [selectedCity, handlePick]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.title}>Select City</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.frost} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color={colors.foregroundSubtle} />
            <TextInput
              style={styles.searchInput}
              value={filterText}
              onChangeText={setFilterText}
              placeholder="Search cities..."
              placeholderTextColor={colors.foregroundSubtle}
              autoCorrect={false}
            />
            {filterText.length > 0 ? (
              <TouchableOpacity onPress={() => setFilterText("")}>
                <X size={15} color={colors.foregroundSubtle} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>Loading cities...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              {onRetryLoad ? (
                <TouchableOpacity style={styles.retryBtn} onPress={onRetryLoad}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={renderCityItem}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <Text style={styles.statusText}>No matching cities</Text>
                </View>
              }
            />
          )}
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
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    height: "75%",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  cityRowSelected: {
    backgroundColor: colors.backgroundInput,
  },
  cityText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  cityTextSelected: {
    color: colors.primary,
    fontWeight: "800",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  statusText: {
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.destructive,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accentForeground,
  },
});
