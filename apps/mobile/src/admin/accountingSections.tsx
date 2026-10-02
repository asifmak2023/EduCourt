import { StyleSheet, Text, View } from "react-native";
import { Card, EmptyState } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../lib/format";
import type { AdminRecord, ColumnConfig, DetailSection } from "./types";
import { getPath } from "./display";

interface ColumnSpec {
  label: string;
  key?: string;
  format?: ColumnConfig["format"];
}

function RecordList({
  item,
  rowsKey,
  emptyMessage,
  columns,
}: {
  item: AdminRecord;
  rowsKey: string;
  emptyMessage: string;
  columns: ColumnSpec[];
}) {
  const { colors } = useTheme();
  const rows = Array.isArray(item[rowsKey]) ? (item[rowsKey] as AdminRecord[]) : [];

  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <View style={styles.list}>
      {rows.map((row, index) => (
        <Card key={String(row.id ?? index)}>
          <View style={styles.row}>
            {columns.map((column) => {
              const value = getPath(row, column.key);
              const display =
                value === null || value === undefined || value === ""
                  ? "-"
                  : column.format === "money"
                  ? formatMoney(value as string | number)
                  : String(value);
              return (
                <Text key={column.label} style={{ color: colors.muted, fontSize: 13 }}>
                  {column.label}:{" "}
                  <Text style={{ color: colors.foreground, fontWeight: "600" }}>{display}</Text>
                </Text>
              );
            })}
          </View>
        </Card>
      ))}
    </View>
  );
}

export const journalLinesSection: DetailSection = {
  title: "Lines",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="lines"
      emptyMessage="No journal lines."
      columns={[
        { label: "Account", key: "account.name" },
        { label: "Description", key: "description" },
        { label: "Debit", key: "debit", format: "money" },
        { label: "Credit", key: "credit", format: "money" },
      ]}
    />
  ),
};

export const expenseLinesSection: DetailSection = {
  title: "Lines",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="lines"
      emptyMessage="No expense lines."
      columns={[
        { label: "Category", key: "category.name" },
        { label: "Description", key: "description" },
        { label: "Amount", key: "amount", format: "money" },
      ]}
    />
  ),
};

export const budgetLinesSection: DetailSection = {
  title: "Lines",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="lines"
      emptyMessage="No budget lines."
      columns={[
        { label: "Account", key: "account.name" },
        { label: "Amount", key: "amount", format: "money" },
        { label: "Notes", key: "notes" },
      ]}
    />
  ),
};

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    gap: 4,
  },
});
