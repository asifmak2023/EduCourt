import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../components/ui";
import { DataTable, type TableColumn } from "../components/table";
import { apiFetch } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { useTheme } from "../theme/ThemeProvider";
import type { AdminRecord, DetailSection } from "./types";

interface ChildListProps {
  endpoint: string;
  id: number;
  path: string;
  campusId: number | null;
  columns?: TableColumn[];
  emptyLabel?: string;
}

function ChildList({ endpoint, id, path, campusId, columns, emptyLabel }: ChildListProps) {
  const { colors } = useTheme();

  const loader = useCallback(async () => {
    const response = await apiFetch<{ data: Record<string, unknown>[] }>(
      `${endpoint}/${id}${path}`,
      { campusId }
    );
    return response.data ?? [];
  }, [endpoint, id, path, campusId]);

  const { data, loading, error } = useAsync<Record<string, unknown>[]>(loader, [
    endpoint,
    id,
    path,
    campusId,
  ]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={styles.loader} />;
  }
  if (error) {
    return <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>;
  }
  if (!data || data.length === 0) {
    return <EmptyState message={emptyLabel ?? "No records"} />;
  }

  return <DataTable rows={data} columns={columns} />;
}

export function childSection({
  endpoint,
  title,
  path,
  columns,
  emptyLabel,
}: {
  endpoint: string;
  title: string;
  path: string;
  columns?: TableColumn[];
  emptyLabel?: string;
}): DetailSection {
  return {
    title,
    render: (item: AdminRecord, context) => (
      <View>
        <ChildList
          endpoint={endpoint}
          id={Number(item.id)}
          path={path}
          campusId={context.campusId}
          columns={columns}
          emptyLabel={emptyLabel}
        />
      </View>
    ),
  };
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 12,
  },
});
