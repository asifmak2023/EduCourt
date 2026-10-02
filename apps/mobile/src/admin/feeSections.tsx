import { StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, StatusPill } from "../components/ui";
import { useTr } from "../lib/i18n";
import { useTheme } from "../theme/ThemeProvider";
import { formatDate, formatMoney } from "../lib/format";
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
  if (column.format === "date") {
    return formatDate(String(value));
  }
  return String(value);
}

function RecordList({
  item,
  rowsKey,
  emptyMessage,
  columns,
  statusKey,
}: {
  item: AdminRecord;
  rowsKey: string;
  emptyMessage: string;
  columns: ColumnSpec[];
  statusKey?: string;
}) {
  const { colors } = useTheme();
  const tr = useTr();
  const rows = Array.isArray(item[rowsKey]) ? (item[rowsKey] as AdminRecord[]) : [];

  if (rows.length === 0) {
    return <EmptyState message={tr(emptyMessage)} />;
  }

  return (
    <View style={styles.list}>
      {rows.map((row, index) => (
        <Card key={String(row.id ?? index)}>
          <View style={styles.row}>
            {columns.map((column) => (
              <Text key={column.label} style={{ color: colors.muted, fontSize: 13 }}>
                {tr(column.label)}:{" "}
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                  {renderValue(row, column)}
                </Text>
              </Text>
            ))}
          </View>
          {statusKey ? <StatusPill value={String(row[statusKey] ?? "")} /> : null}
        </Card>
      ))}
    </View>
  );
}

export const voucherLinesSection: DetailSection = {
  title: "Lines",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="lines"
      emptyMessage="No lines."
      columns={[
        { label: "Fee head", key: "fee_head.name" },
        { label: "Amount", key: "amount", format: "money" },
        { label: "Discount", key: "discount_amount", format: "money" },
        { label: "Net", key: "net_amount", format: "money" },
      ]}
    />
  ),
};

export const voucherPaymentsSection: DetailSection = {
  title: "Payments",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="payments"
      statusKey="status"
      emptyMessage="No payments recorded."
      columns={[
        { label: "Receipt", key: "receipt_no" },
        { label: "Date", key: "payment_date", format: "date" },
        { label: "Amount", key: "amount", format: "money" },
        { label: "Method", key: "method" },
      ]}
    />
  ),
};

export const feePlanItemsSection: DetailSection = {
  title: "Items",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="items"
      emptyMessage="No fee items."
      columns={[
        { label: "Fee head", key: "fee_head.name" },
        { label: "Amount", key: "amount", format: "money" },
      ]}
    />
  ),
};

export const feePlanInstallmentsSection: DetailSection = {
  title: "Installments",
  render: (item) => (
    <RecordList
      item={item}
      rowsKey="installments"
      emptyMessage="No installments."
      columns={[
        { label: "Label", key: "label" },
        { label: "Due", key: "due_date", format: "date" },
        { label: "Percent", key: "percentage" },
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
