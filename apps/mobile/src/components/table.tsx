import type { ReactNode } from "react";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyState, SectionLabel } from "./ui";
import { getPath } from "../admin/display";
import { formatDate, formatMoney } from "../lib/format";
import { useTr } from "../lib/i18n";
import { useTheme } from "../theme/ThemeProvider";

export interface SelectOptionLike {
  value: string | number;
  label: string;
}

export function SelectFilter({
  label,
  value,
  options,
  onChange,
  anyLabel = "Any",
}: {
  label: string;
  value: string;
  options: SelectOptionLike[];
  onChange: (value: string) => void;
  anyLabel?: string;
}) {
  const { colors } = useTheme();
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => String(option.value) === value);

  return (
    <View style={styles.field}>
      <SectionLabel>{tr(label)}</SectionLabel>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.control, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={{ color: selected ? colors.foreground : colors.muted, fontSize: 15 }}>
          {selected ? tr(selected.label) : tr(anyLabel)}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={() => undefined}
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{tr(label)}</Text>
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <Pressable
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={[styles.option, value === "" ? { backgroundColor: colors.accentSoft } : null]}
              >
                <Text style={{ color: value === "" ? colors.accent : colors.foreground, fontSize: 15 }}>
                  {tr(anyLabel)}
                </Text>
              </Pressable>
              {options.map((option) => {
                const active = String(option.value) === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => {
                      onChange(String(option.value));
                      setOpen(false);
                    }}
                    style={[styles.option, active ? { backgroundColor: colors.accentSoft } : null]}
                  >
                    <Text style={{ color: active ? colors.accent : colors.foreground, fontSize: 15 }}>
                      {tr(option.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export interface StatItem {
  label: string;
  value: string | number;
  tone?: string;
}

export function StatGrid({ items }: { items: StatItem[] }) {
  const { colors } = useTheme();
  const tr = useTr();

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.statGrid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.stat, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>
            {tr(item.label)}
          </Text>
          <Text
            style={{ color: item.tone ?? colors.foreground, fontSize: 18, fontWeight: "700", marginTop: 4 }}
            numberOfLines={1}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export interface TableColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
}

function humanize(key: string): string {
  return key
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isMoneyKey(key: string): boolean {
  return /(amount|total|revenue|cost|price|fare|fee|balance|outstanding|billed|collected|discount|profit|budget|salary|value)/.test(
    key
  );
}

function isDateKey(key: string): boolean {
  return /(_on$|_at$|date|dob)/.test(key);
}

export function formatCellValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return isMoneyKey(key) ? formatMoney(value) : String(value);
  }
  if (typeof value === "object") {
    return "-";
  }
  if (isMoneyKey(key)) {
    return formatMoney(value as string);
  }
  if (isDateKey(key)) {
    return formatDate(String(value));
  }
  return String(value);
}

export function autoColumns(rows: Record<string, unknown>[]): TableColumn[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key.endsWith("_id") || key === "id") {
        continue;
      }
      if (typeof row[key] === "object" && row[key] !== null) {
        continue;
      }
      if (!keys.includes(key)) {
        keys.push(key);
      }
      if (keys.length >= 8) {
        break;
      }
    }
    if (keys.length >= 8) {
      break;
    }
  }
  return keys.map((key) => ({ key, label: humanize(key) }));
}

export function DataTable({
  columns,
  rows,
  emptyLabel = "No records",
  keyOf,
}: {
  columns?: TableColumn[];
  rows: Record<string, unknown>[];
  emptyLabel?: string;
  keyOf?: (row: Record<string, unknown>, index: number) => string;
}) {
  const { colors } = useTheme();
  const tr = useTr();
  const resolved = columns && columns.length > 0 ? columns : autoColumns(rows);

  if (rows.length === 0) {
    return <EmptyState message={tr(emptyLabel)} />;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { borderColor: colors.border }]}>
        <View style={[styles.headerRow, { backgroundColor: colors.surface }]}>
          {resolved.map((column) => (
            <View key={column.key} style={styles.cell}>
              <Text style={[styles.headText, { color: colors.muted }]}>{column.label}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, index) => (
          <View
            key={keyOf ? keyOf(row, index) : String(row.id ?? index)}
            style={[
              styles.bodyRow,
              { borderTopColor: colors.border, backgroundColor: index % 2 ? "transparent" : colors.surface },
            ]}
          >
            {resolved.map((column) => (
              <View key={column.key} style={styles.cell}>
                {column.render ? (
                  column.render(row)
                ) : (
                  <Text style={{ color: colors.foreground, fontSize: 13 }}>
                    {formatCellValue(column.key, getPath(row, column.key))}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 14,
  },
  control: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 14,
    padding: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    padding: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 8,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  stat: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    flexGrow: 1,
  },
  table: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
  },
  bodyRow: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  cell: {
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  headText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
