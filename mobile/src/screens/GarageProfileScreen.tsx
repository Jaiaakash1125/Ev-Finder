import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { User, Car, Heart, Shield, Plus, Zap, Trash2, LogOut } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";
import { api } from "../api/client";
import { Station, UserProfile } from "../types";

interface GarageProfileScreenProps {
  onOpenAuth: () => void;
}

export const GarageProfileScreen: React.FC<GarageProfileScreenProps> = ({ onOpenAuth }) => {
  const [profile, setProfile] = useState<UserProfile | null>({
    id: "usr_demo_1",
    phone: "+919876543210",
    email: "evdriver@example.com",
    fullName: "Jai Aakash",
    avatarUrl: "",
    vehicles: [
      {
        id: "v1",
        brand: "Tata",
        model: "Nexon EV Long Range",
        connectorType: "CCS2",
        batteryKwh: 40.5,
        regNumber: "KA-01-EV-2026",
      },
      {
        id: "v2",
        brand: "Ather",
        model: "450X Gen 3",
        connectorType: "Ather Dot / Type 2",
        batteryKwh: 3.7,
        regNumber: "KA-05-EZ-4500",
      },
    ],
    favorites: ["st-1", "st-5"],
  });

  const [favorites, setFavorites] = useState<Station[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await api.getFavorites();
      setFavorites(res.data || []);
    } catch {
      // ignore
    }
  };

  const handleAddVehicle = () => {
    Alert.alert("Add EV Vehicle", "Select brand: Tata, MG, Ather, Ola, Hyundai, Mahindra", [
      {
        text: "Add Tata Punch.ev",
        onPress: () => {
          if (!profile) return;
          const newV = {
            id: `v_${Date.now()}`,
            brand: "Tata",
            model: "Punch.ev Long Range",
            connectorType: "CCS2",
            batteryKwh: 35,
            regNumber: "DL-03-EV-1001",
          };
          setProfile({ ...profile, vehicles: [...profile.vehicles, newV] });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <User size={24} color="#00f2fe" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile?.fullName || "EV Driver"}</Text>
          <Text style={styles.phone}>{profile?.phone || "Not Logged In"}</Text>
        </View>
        <TouchableOpacity style={styles.authBtn} onPress={onOpenAuth} activeOpacity={0.8}>
          <Text style={styles.authBtnText}>Account</Text>
        </TouchableOpacity>
      </View>

      {/* EV Garage Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Car size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>My EV Garage</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddVehicle}>
          <Plus size={14} color="#020617" />
          <Text style={styles.addBtnText}>Add EV</Text>
        </TouchableOpacity>
      </View>

      {profile?.vehicles.map((v) => (
        <View key={v.id} style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Text style={styles.vehicleBrand}>{v.brand}</Text>
            {v.regNumber && <Text style={styles.vehiclePlate}>{v.regNumber}</Text>}
          </View>
          <Text style={styles.vehicleModel}>{v.model}</Text>

          <View style={styles.vehicleSpecsRow}>
            <View style={styles.specBadge}>
              <Zap size={12} color={colors.accent} />
              <Text style={styles.specText}>{v.connectorType}</Text>
            </View>
            <View style={styles.specBadge}>
              <Text style={styles.specText}>🔋 {v.batteryKwh} kWh</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Saved Favorites Section */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <View style={styles.sectionTitleRow}>
          <Heart size={18} color={colors.destructive} fill={colors.destructive} />
          <Text style={styles.sectionTitle}>Saved Charging Hubs</Text>
        </View>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No saved favorite stations yet.</Text>
          <Text style={styles.emptySubtext}>Tap the heart icon on any charging station to bookmark it here.</Text>
        </View>
      ) : (
        favorites.map((st) => (
          <View key={st.id} style={styles.favCard}>
            <Text style={styles.favName}>{st.name}</Text>
            <Text style={styles.favAddress}>{st.city} · {st.network}</Text>
            <Text style={styles.favSpeed}>⚡ {st.maxPowerKw} kW Fast DC</Text>
          </View>
        ))
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 242, 254, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.foreground,
  },
  phone: {
    fontSize: 13,
    color: colors.frost,
    marginTop: 2,
  },
  authBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: 0.3,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#020617",
  },
  vehicleCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleBrand: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
  },
  vehiclePlate: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSubtle,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleModel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
    marginVertical: 4,
  },
  vehicleSpecsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  specBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  specText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  emptyCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.foregroundSubtle,
    textAlign: "center",
    marginTop: 4,
  },
  favCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  favName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
  },
  favAddress: {
    fontSize: 12,
    color: colors.frost,
    marginTop: 2,
  },
  favSpeed: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 4,
  },
});
