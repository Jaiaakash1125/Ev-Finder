import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, spacing } from "../theme/theme";

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <ActivityIndicator size={compact ? "small" : "large"} color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  compact: {
    flex: 0,
    paddingVertical: spacing.xl,
    backgroundColor: "transparent",
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foregroundMuted,
    textAlign: "center",
  },
});
