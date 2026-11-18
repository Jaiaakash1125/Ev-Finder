import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { WifiOff } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";

interface OfflineBannerProps {
  visible?: boolean;
  message?: string;
  onRetry?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  visible = true,
  message = "Offline - saved data",
  onRetry,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <WifiOff size={15} color={colors.warning} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderBottomWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.warning,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.warning,
  },
});
