import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { Field } from "./Field";
import type { GroupFieldConfig } from "../types";

export function GroupField({
  field,
  values,
  enabled,
  onToggle,
  onChange,
  record,
}: {
  field: GroupFieldConfig;
  values: Record<string, unknown>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onChange: (values: Record<string, unknown>) => void;
  record: Record<string, unknown>;
}) {
  const { colors } = useTheme();
  const tr = useTr();
  const nested = values ?? {};

  const update = (name: string, value: unknown) => {
    onChange({ ...nested, [name]: value });
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onToggle(!enabled)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: enabled }}
        style={styles.toggleRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: enabled ? colors.accent : colors.border,
              backgroundColor: enabled ? colors.accent : "transparent",
            },
          ]}
        >
          {enabled ? (
            <Text style={{ color: colors.accentForeground, fontSize: 12, fontWeight: "700" }}>x</Text>
          ) : null}
        </View>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
          {tr(field.toggleLabel)}
        </Text>
      </Pressable>

      {field.hint ? (
        <Text style={[styles.hint, { color: colors.muted }]}>{tr(field.hint)}</Text>
      ) : null}

      {enabled ? (
        <View style={[styles.body, { borderColor: colors.border }]}>
          {field.fields.map((nestedField) => (
            <Field
              key={nestedField.name}
              field={nestedField}
              value={nested[nestedField.name]}
              onChange={(value) => update(nestedField.name, value)}
              record={{ ...record, ...nested }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
  },
  body: {
    marginTop: 4,
    borderLeftWidth: 1,
    paddingLeft: 14,
  },
});
