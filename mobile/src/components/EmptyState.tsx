import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SearchX } from "lucide-react-native";
import { colors, radius, spacing } from "../theme/theme";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No stations found",
  message = "Try adjusting your search or clearing active filters.",
  actionLabel,
  onAction,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.iconWrap}>
        <SearchX size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
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
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
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
    maxWidth: 300,
  },
  actionBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.borderActive,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});
