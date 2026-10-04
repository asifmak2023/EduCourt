import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { Card, ErrorText, GhostButton, SectionLabel } from "../components/ui";
import {
  DataTable,
  StatGrid,
  formatCellValue,
  type StatItem,
} from "../components/table";
import { apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { useAsync } from "../lib/useAsync";
import { useTheme } from "../theme/ThemeProvider";

type ReportPayload = Record<string, unknown> | Record<string, unknown>[];

function humanize(key: string): string {
  return key
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function scalarValue(value: unknown, key = ""): string | null {
  if (value === null || value === undefined || typeof value === "object") {
    return null;
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return formatCellValue(key, value);
}

export function ReportView({ endpoint }: { endpoint: string }) {
  const { colors } = useTheme();
  const campusId = useCampusId();

  const loader = useCallback(async () => {
    const response = await apiFetch<{ data: ReportPayload }>(endpoint, { campusId });
    return response.data;
  }, [endpoint, campusId]);

  const { data, loading, error, reload } = useAsync<ReportPayload>(loader, [endpoint, campusId]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />;
  }

  if (error) {
    return (
      <View style={{ marginTop: 16 }}>
        <ErrorText message={error} />
        <GhostButton label="Retry" onPress={reload} />
      </View>
    );
  }

  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return <DataTable rows={data as Record<string, unknown>[]} />;
  }

  const source = data as Record<string, unknown>;
  const metrics: StatItem[] = [];
  const tables: { label: string; rows: Record<string, unknown>[] }[] = [];
  const nested: { label: string; values: StatItem[] }[] = [];

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      const rows = value.filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      );
      tables.push({ label: humanize(key), rows });
      continue;
    }
    if (value !== null && typeof value === "object") {
      const values: StatItem[] = [];
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        const text = scalarValue(nestedValue, nestedKey);
        if (text !== null) {
          values.push({ label: `${humanize(key)} · ${humanize(nestedKey)}`, value: text });
        }
      }
      if (values.length > 0) {
        nested.push({ label: humanize(key), values });
      }
      continue;
    }
    const text = scalarValue(value, key);
    if (text !== null) {
      metrics.push({ label: humanize(key), value: text });
    }
  }

  return (
    <View>
      <StatGrid items={metrics} />
      {nested.map((group) => (
        <View key={group.label} style={{ marginTop: 16 }}>
          <SectionLabel>{group.label}</SectionLabel>
          <StatGrid items={group.values} />
        </View>
      ))}
      {tables.map((table) => (
        <Card key={table.label}>
          <SectionLabel>{table.label}</SectionLabel>
          <DataTable rows={table.rows} />
        </Card>
      ))}
    </View>
  );
}
