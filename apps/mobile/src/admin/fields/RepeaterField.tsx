import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "@eis/i18n";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { SectionLabel } from "../../components/ui";
import { Field } from "./Field";
import type { RepeaterFieldConfig } from "../types";

export function RepeaterField({
  field,
  rows,
  onChange,
  record,
}: {
  field: RepeaterFieldConfig;
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
  record: Record<string, unknown>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tr = useTr();
  const items = Array.isArray(rows) ? rows : [];

  const updateRow = (index: number, name: string, value: unknown) => {
    const next = items.map((row, position) =>
      position === index ? { ...row, [name]: value } : row
    );
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, position) => position !== index));
  };

  const addRow = () => {
    onChange([...items, field.emptyItem()]);
  };

  return (
    <View style={styles.container}>
      <SectionLabel>{tr(field.label)}</SectionLabel>
      {field.hint ? (
        <Text style={[styles.hint, { color: colors.muted }]}>{tr(field.hint)}</Text>
      ) : null}

      {items.map((row, index) => (
        <View
          key={index}
          style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={styles.cardHeader}>
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>
              {field.titleKey && row[field.titleKey]
                ? String(row[field.titleKey])
                : t("admin.repeater.item", { label: tr(field.label), index: index + 1 })}
            </Text>
            <Pressable onPress={() => removeRow(index)} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>{t("common.remove")}</Text>
            </Pressable>
          </View>

          {field.itemFields.map((itemField) => (
            <Field
              key={itemField.name}
              field={itemField}
              value={row[itemField.name]}
              onChange={(value) => updateRow(index, itemField.name, value)}
              record={row}
            />
          ))}
        </View>
      ))}

      <Pressable
        onPress={addRow}
        accessibilityRole="button"
        style={[styles.add, { borderColor: colors.accent }]}
      >
        <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 14 }}>
          {tr(field.addLabel)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  add: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
});
