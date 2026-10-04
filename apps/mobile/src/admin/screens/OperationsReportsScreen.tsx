import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, SectionLabel } from "../../components/ui";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { ReportView } from "../ReportView";

interface ReportDef {
  key: string;
  label: string;
  endpoint: string;
  permission: string;
}

const REPORTS: ReportDef[] = [
  { key: "inventory", label: "Inventory summary", endpoint: "/v1/inventory/reports/summary", permission: "inventory.view" },
  { key: "library", label: "Library summary", endpoint: "/v1/library/reports/summary", permission: "library.view" },
  { key: "transport", label: "Transport summary", endpoint: "/v1/transport/reports/summary", permission: "transport.view" },
  { key: "sports", label: "Sports summary", endpoint: "/v1/sports/reports/summary", permission: "sports.view" },
  { key: "canteen-low-stock", label: "Canteen low stock", endpoint: "/v1/canteen/reports/low-stock", permission: "canteen.view" },
  { key: "canteen-daily", label: "Canteen daily", endpoint: "/v1/canteen/reports/daily", permission: "canteen.export" },
  { key: "canteen-item", label: "Canteen item-wise", endpoint: "/v1/canteen/reports/item-wise", permission: "canteen.export" },
  { key: "canteen-pl", label: "Canteen profit/loss", endpoint: "/v1/canteen/reports/profit-loss", permission: "canteen.export" },
  { key: "canteen-wallets", label: "Canteen wallet summary", endpoint: "/v1/canteen/reports/wallet-summary", permission: "canteen.export" },
];

export function OperationsReportsScreen({ permissions }: { permissions: string[] }) {
  const { colors } = useTheme();
  const tr = useTr();

  const available = useMemo(
    () => REPORTS.filter((report) => permissions.includes(report.permission)),
    [permissions]
  );
  const [activeKey, setActiveKey] = useState<string>(available[0]?.key ?? "");
  const active = available.find((report) => report.key === activeKey) ?? available[0] ?? null;

  if (available.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState message="No reports available for your role." />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.chips}>
        {available.map((report) => {
          const isActive = active?.key === report.key;
          return (
            <Pressable
              key={report.key}
              onPress={() => setActiveKey(report.key)}
              style={[
                styles.chip,
                {
                  borderColor: isActive ? colors.accent : colors.border,
                  backgroundColor: isActive ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: isActive ? colors.accent : colors.muted, fontSize: 13, fontWeight: "600" }}>
                {tr(report.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {active ? (
        <Card>
          <SectionLabel>{tr(active.label)}</SectionLabel>
          <ReportView key={active.key} endpoint={active.endpoint} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
