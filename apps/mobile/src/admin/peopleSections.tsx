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

function renderValue(item: AdminRecord, column: ColumnSpec): string {
  const value = getPath(item, column.key);
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (column.format === "money") {
    return formatMoney(value as string | number);
  }
  return String(value);
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
            {columns.map((column) => (
              <Text key={column.label} style={{ color: colors.muted, fontSize: 13 }}>
                {column.label}:{" "}
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                  {renderValue(row, column)}
                </Text>
              </Text>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

export const staffSalaryItemsSection: DetailSection = {
  title: "Components",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="items"
      emptyMessage="No salary components."
      columns={[
        { label: "Component", key: "component.name" },
        { label: "Amount", key: "amount", format: "money" },
        { label: "Percentage", key: "percentage" },
      ]}
    />
  ),
};

export const payrollPayslipsSection: DetailSection = {
  title: "Payslips",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="payslips"
      emptyMessage="No payslips generated."
      columns={[
        { label: "Staff", key: "staff_member.full_name" },
        { label: "Gross", key: "gross", format: "money" },
        { label: "Deductions", key: "deductions", format: "money" },
        { label: "Net", key: "net", format: "money" },
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
