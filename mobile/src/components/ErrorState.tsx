import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Can't reach server",
  message = "Check your internet connection and verify the API server is running.",
  onRetry,
  retryLabel = "Retry",
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.iconWrap}>
        <AlertTriangle size={28} color={colors.destructive} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <RefreshCw size={16} color={colors.accentForeground} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  },
  compact: {
    flex: 0,
    paddingVertical: spacing.xl,
    backgroundColor: "transparent",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.destructiveBg,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.accentForeground,
  },
});
