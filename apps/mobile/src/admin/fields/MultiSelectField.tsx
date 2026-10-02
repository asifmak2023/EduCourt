import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import type { SelectOption } from "../types";

export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  error,
  required,
}: {
  label: string;
  options: SelectOption[];
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
}) {
  const { colors } = useTheme();
  const tr = useTr();
  const selected = Array.isArray(value) ? value.map(String) : [];

  const toggle = (optionValue: string) => {
    const next = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange(next);
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>
        {tr(label)}
        {required ? " *" : ""}
      </Text>
      <View style={styles.row}>
        {options.map((option) => {
          const active = selected.includes(String(option.value));
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => toggle(String(option.value))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 14 }}>
                {tr(option.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 16,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
  },
});
