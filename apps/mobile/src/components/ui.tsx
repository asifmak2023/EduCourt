import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, config } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        config.glass ? { backgroundColor: colors.glassSurface } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>{children}</Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
        styles.primaryButton,
        { backgroundColor: colors.accent, opacity: disabled || loading ? 0.6 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accentForeground} />
      ) : (
        <Text style={[styles.primaryButtonText, { color: colors.accentForeground }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled = false,
  tone = "default",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  const { colors } = useTheme();
  const textColor = tone === "danger" ? colors.danger : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.ghostButton,
        { borderColor: colors.border, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.ghostButtonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 14 }}>
      {label ? (
        <SectionLabel>{label}</SectionLabel>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.foreground,
          },
        ]}
      />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { colors } = useTheme();

  return <Text style={[styles.empty, { color: colors.muted }]}>{message}</Text>;
}

export function ErrorText({ message }: { message: string }) {
  const { colors } = useTheme();

  return <Text style={[styles.error, { color: colors.danger }]}>{message}</Text>;
}

export function StatusPill({ value, label }: { value?: string | null; label?: string | null }) {
  const { colors } = useTheme();
  const normalized = (value ?? "").toLowerCase();

  const palette: Record<string, string> = {
    present: colors.success,
    paid: colors.success,
    pass: colors.success,
    active: colors.success,
    absent: colors.danger,
    fail: colors.danger,
    unpaid: colors.danger,
    late: "#d97706",
    partial: "#d97706",
    leave: colors.muted,
    excused: colors.muted,
  };

  const tint = palette[normalized] ?? colors.muted;

  return (
    <View style={[styles.pill, { borderColor: tint }]}>
      <Text style={[styles.pillText, { color: tint }]}>
        {label ?? value ?? "-"}
      </Text>
    </View>
  );
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <SectionLabel>{label}</SectionLabel>
      <Text
        style={[styles.metricValue, { color: tone ?? colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const textStyles: Record<string, TextStyle> = {
  muted: { fontSize: 13 },
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  ghostButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  empty: {
    fontSize: 14,
    paddingVertical: 12,
  },
  error: {
    marginTop: 10,
    fontSize: 14,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
