import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  Search,
  X,
  Zap,
  ArrowRight,
  Info,
  Check,
  HelpCircle,
} from "lucide-react-native";

import type { MainTabParamList } from "../navigation/types";
import {
  CONNECTORS_DATA,
  CONNECTOR_CATEGORIES,
  type ConnectorCategory,
  type ConnectorInfo,
} from "../constants/connectors";
import { colors, radius, spacing } from "../theme/theme";
import { EmptyState } from "../components/EmptyState";

type ConnectorsNavProp = BottomTabNavigationProp<MainTabParamList, "Connectors">;

function getCategoryLabel(category: ConnectorCategory): string {
  switch (category) {
    case "dc_fast":
      return "DC Ultra Fast";
    case "ac_normal":
      return "AC Standard";
    case "light_ev":
      return "Light EV (2W/3W)";
    case "standard_socket":
      return "Universal Socket";
  }
}

function getCategoryBadgeColor(category: ConnectorCategory): string {
  switch (category) {
    case "dc_fast":
      return colors.accent;
    case "ac_normal":
      return colors.success;
    case "light_ev":
      return colors.warning;
    case "standard_socket":
      return colors.primary;
  }
}

interface ConnectorCardProps {
  connector: ConnectorInfo;
  onOpenSpecs: (connector: ConnectorInfo) => void;
  onFindStations: (filterQuery: string) => void;
}

const ConnectorCard = memo(({ connector, onOpenSpecs, onFindStations }: ConnectorCardProps) => {
  const badgeColor = getCategoryBadgeColor(connector.category);

  return (
    <View style={styles.card}>
      {/* Photo Banner */}
      <View style={styles.imageContainer}>
        <Image source={connector.image} style={styles.connectorImage} resizeMode="cover" />
        <View style={[styles.categoryBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.categoryBadgeText}>{getCategoryLabel(connector.category)}</Text>
        </View>
        <View style={styles.powerBadge}>
          <Zap size={12} color={colors.accent} />
          <Text style={styles.powerBadgeText}>Up to {connector.maxPowerKw} kW</Text>
        </View>
      </View>

      {/* Title & Code */}
      <Text style={styles.cardTitle}>{connector.name}</Text>
      <Text style={styles.cardCode}>{connector.codeName}</Text>
      <Text style={styles.cardSummary}>{connector.summary}</Text>

      {/* Key Specs 2x2 Grid */}
      <View style={styles.specsGrid}>
        <View style={styles.specCell}>
          <Text style={styles.specLabel}>CHARGE TIME</Text>
          <Text style={styles.specValue}>{connector.typicalChargeTime}</Text>
        </View>
        <View style={styles.specCell}>
          <Text style={styles.specLabel}>VOLTAGE</Text>
          <Text style={styles.specValue}>{connector.voltageRange}</Text>
        </View>
        <View style={styles.specCell}>
          <Text style={styles.specLabel}>MAX CURRENT</Text>
          <Text style={styles.specValue}>{connector.maxCurrent}</Text>
        </View>
        <View style={styles.specCell}>
          <Text style={styles.specLabel}>INDIA ADOPTION</Text>
          <Text style={[styles.specValue, { color: colors.accent }]}>
            {connector.popularityInIndia}
          </Text>
        </View>
      </View>

      {/* Top Compatible Vehicles */}
      <View style={styles.vehiclesBlock}>
        <Text style={styles.vehiclesTitle}>COMPATIBLE VEHICLES</Text>
        {connector.compatibleVehicles.slice(0, 3).map((veh, idx) => (
          <View key={idx} style={styles.vehicleRow}>
            <Check size={12} color={colors.accent} />
            <Text style={styles.vehicleText} numberOfLines={1}>
              {veh}
            </Text>
          </View>
        ))}
        {connector.compatibleVehicles.length > 3 ? (
          <Text style={styles.moreVehicles}>
            + {connector.compatibleVehicles.length - 3} more vehicle groups
          </Text>
        ) : null}
      </View>

      {/* Card Footer Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.specsBtn}
          onPress={() => onOpenSpecs(connector)}
          activeOpacity={0.8}
        >
          <Info size={14} color={colors.foreground} />
          <Text style={styles.specsBtnText}>Full Specs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.findBtn}
          onPress={() => onFindStations(connector.filterQuery)}
          activeOpacity={0.85}
        >
          <Text style={styles.findBtnText}>Find Stations</Text>
          <ArrowRight size={14} color={colors.accentForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export const ConnectorsScreen: React.FC = () => {
  const navigation = useNavigation<ConnectorsNavProp>();

  const [selectedCategory, setSelectedCategory] = useState<"all" | ConnectorCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeConnector, setActiveConnector] = useState<ConnectorInfo | null>(null);

  const filteredConnectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CONNECTORS_DATA.filter((c) => {
      if (selectedCategory !== "all" && c.category !== selectedCategory) return false;
      if (q) {
        return (
          c.name.toLowerCase().includes(q) ||
          c.codeName.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.standardNorm.toLowerCase().includes(q) ||
          c.compatibleVehicles.some((v) => v.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const handleFindStations = useCallback(
    (connectorQuery: string) => {
      setActiveConnector(null);
      navigation.navigate("Stations", {
        connector: connectorQuery,
        city: "All India",
        query: "",
      });
    },
    [navigation]
  );

  const handleOpenSpecs = useCallback((connector: ConnectorInfo) => {
    setActiveConnector(connector);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Zap size={13} color={colors.accent} />
            <Text style={styles.badgeText}>EV Hardware Specs</Text>
          </View>
          <Text style={styles.title}>
            EV Connector & Plug Guide <Text style={styles.titleAccent}>India</Text>
          </Text>
          <Text style={styles.subtitle}>
            Understand every charging standard across 2-wheelers, 4-wheelers, and fleets in India — with photos, pin layouts, speeds, and compatible EVs.
          </Text>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Search size={16} color={colors.foregroundSubtle} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by car, scooter, or plug (e.g. Nexon, Ather, CCS2)..."
            placeholderTextColor={colors.foregroundSubtle}
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color={colors.foregroundSubtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CONNECTOR_CATEGORIES.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.categoryPill, active && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(tab.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Connector Cards */}
        {filteredConnectors.length === 0 ? (
          <EmptyState
            compact
            title="No matching connectors"
            message="Try searching for CCS2, Type 2, Ather, Nexon, or reset the category filter."
            actionLabel="Reset search"
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
          />
        ) : (
          <View style={styles.cardsList}>
            {filteredConnectors.map((c) => (
              <ConnectorCard
                key={c.id}
                connector={c}
                onOpenSpecs={handleOpenSpecs}
                onFindStations={handleFindStations}
              />
            ))}
          </View>
        )}

        {/* FAQ Cards */}
        <View style={styles.faqSection}>
          <View style={styles.faqCard}>
            <View style={styles.faqHeader}>
              <HelpCircle size={16} color={colors.accent} />
              <Text style={styles.faqTitle}>Which connector does my EV use?</Text>
            </View>
            <Text style={styles.faqBody}>
              Nearly all 4-wheeler EVs sold in India since 2021 (Tata Nexon/Punch/Curvv, Mahindra XUV400, MG ZS EV/Windsor, Hyundai, BYD) use CCS2 for DC fast charging and Type 2 for home/destination AC charging. Electric 2-wheelers use either BIS LECCS (Ather, Vida) or standard 15A sockets (Ola, TVS, Chetak).
            </Text>
          </View>

          <View style={styles.faqCard}>
            <View style={styles.faqHeader}>
              <Zap size={16} color={colors.accent} />
              <Text style={styles.faqTitle}>AC vs DC charging explained</Text>
            </View>
            <Text style={styles.faqBody}>
              AC Charging uses your vehicle's onboard charger (OBC) to convert AC to DC — best for gentle overnight or workplace charging. DC Fast Charging bypasses the onboard converter and feeds direct current straight into the battery at up to 350 kW.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Full Specs Modal */}
      <Modal
        visible={activeConnector !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveConnector(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActiveConnector(null)}
          />

          {activeConnector ? (
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {activeConnector.name}
                  </Text>
                  <Text style={styles.modalCode}>{activeConnector.codeName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActiveConnector(null)}
                >
                  <X size={18} color={colors.frost} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <Image
                  source={activeConnector.image}
                  style={styles.modalImage}
                  resizeMode="cover"
                />

                <Text style={styles.modalSectionTitle}>OVERVIEW & STANDARD</Text>
                <Text style={styles.modalBody}>{activeConnector.summary}</Text>
                <Text style={styles.modalStandard}>Standard: {activeConnector.standardNorm}</Text>

                <Text style={styles.modalSectionTitle}>PIN CONFIGURATION</Text>
                <View style={styles.pinBox}>
                  <Text style={styles.pinText}>{activeConnector.pinDescription}</Text>
                </View>

                <Text style={styles.modalSectionTitle}>COMPATIBLE VEHICLES</Text>
                <View style={styles.modalVehicles}>
                  {activeConnector.compatibleVehicles.map((v, i) => (
                    <View key={i} style={styles.modalVehicleChip}>
                      <Text style={styles.modalVehicleText}>{v}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.prosCard}>
                  <Text style={styles.prosTitle}>Key Advantages</Text>
                  {activeConnector.pros.map((p, i) => (
                    <Text key={i} style={styles.prosItem}>
                      + {p}
                    </Text>
                  ))}
                </View>

                <View style={styles.consCard}>
                  <Text style={styles.consTitle}>Tradeoffs & Limitations</Text>
                  {activeConnector.cons.map((item, i) => (
                    <Text key={i} style={styles.consItem}>
                      - {item}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.modalFindBtn}
                  onPress={() => handleFindStations(activeConnector.filterQuery)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalFindBtnText}>
                    Find {activeConnector.filterQuery} Stations
                  </Text>
                  <ArrowRight size={15} color={colors.accentForeground} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 242, 254, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  titleAccent: {
    color: colors.accent,
  },
  subtitle: {
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
    marginTop: spacing.xs + 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundCardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },
  categoryRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  categoryTextActive: {
    color: colors.accentForeground,
    fontWeight: "900",
  },
  cardsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  imageContainer: {
    position: "relative",
    height: 185,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#020617",
    marginBottom: spacing.md,
  },
  connectorImage: {
    width: "100%",
    height: "100%",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#020617",
    textTransform: "uppercase",
  },
  powerBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(8, 12, 20, 0.88)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  powerBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.accent,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
  },
  cardCode: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSubtle,
    marginTop: 2,
  },
  cardSummary: {
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  specCell: {
    width: "47%",
  },
  specLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.6,
  },
  specValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 2,
  },
  vehiclesBlock: {
    marginTop: spacing.md,
    gap: 4,
  },
  vehiclesTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vehicleText: {
    flex: 1,
    fontSize: 12,
    color: colors.foreground,
  },
  moreVehicles: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  specsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  specsBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.foreground,
  },
  findBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  findBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.accentForeground,
  },
  faqSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  faqCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  faqTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.foreground,
    flex: 1,
  },
  faqBody: {
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "88%",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.foreground,
  },
  modalCode: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  modalScroll: {
    marginTop: spacing.md,
  },
  modalImage: {
    width: "100%",
    height: 170,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.foregroundSubtle,
    letterSpacing: 0.7,
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
  },
  modalBody: {
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 19,
  },
  modalStandard: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    marginTop: 6,
  },
  pinBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pinText: {
    fontSize: 12,
    color: colors.foreground,
    lineHeight: 18,
  },
  modalVehicles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  modalVehicleChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalVehicleText: {
    fontSize: 12,
    color: colors.foreground,
  },
  prosCard: {
    marginTop: spacing.md,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  prosTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.success,
    marginBottom: 2,
  },
  prosItem: {
    fontSize: 12,
    color: colors.foreground,
    lineHeight: 18,
  },
  consCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  consTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.warning,
    marginBottom: 2,
  },
  consItem: {
    fontSize: 12,
    color: colors.foreground,
    lineHeight: 18,
  },
  modalFindBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  modalFindBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.accentForeground,
  },
});
