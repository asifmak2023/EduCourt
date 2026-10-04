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
import { buildQuery, type QueryValue } from "./query";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasContent(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(isRecord);
  }
  if (isRecord(value)) {
    return Object.entries(value).some(
      ([key, item]) => scalarValue(item, key) !== null || hasContent(item)
    );
  }
  return scalarValue(value) !== null;
}

function ReportSection({ label, value }: { label: string; value: unknown }) {
  if (!hasContent(value)) {
    return null;
  }

  if (Array.isArray(value)) {
    const rows = value.filter(isRecord);
    return (
      <Card>
        <SectionLabel>{label}</SectionLabel>
        <DataTable rows={rows} />
      </Card>
    );
  }

  if (isRecord(value)) {
    const scalars: StatItem[] = [];
    const children: { label: string; value: unknown }[] = [];

    for (const [key, item] of Object.entries(value)) {
      const text = scalarValue(item, key);
      if (text !== null) {
        scalars.push({ label: humanize(key), value: text });
        continue;
      }
      children.push({ label: humanize(key), value: item });
    }

    return (
      <View style={{ marginTop: 16 }}>
        <SectionLabel>{label}</SectionLabel>
        <StatGrid items={scalars} />
        {children.map((child) => (
          <ReportSection key={child.label} label={child.label} value={child.value} />
        ))}
      </View>
    );
  }

  return null;
}

export function ReportView({
  endpoint,
  params,
}: {
  endpoint: string;
  params?: Record<string, QueryValue>;
}) {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const query = buildQuery(params ?? {});

  const loader = useCallback(async () => {
    const response = await apiFetch<{ data: ReportPayload }>(`${endpoint}${query}`, { campusId });
    return response.data;
  }, [endpoint, query, campusId]);

  const { data, loading, error, reload } = useAsync<ReportPayload>(loader, [endpoint, query, campusId]);

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
  const sections: { label: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(source)) {
    const text = scalarValue(value, key);
    if (text !== null) {
      metrics.push({ label: humanize(key), value: text });
      continue;
    }
    sections.push({ label: humanize(key), value });
  }

  return (
    <View>
      <StatGrid items={metrics} />
      {sections.map((section) => (
        <ReportSection key={section.label} label={section.label} value={section.value} />
      ))}
    </View>
  );
}
