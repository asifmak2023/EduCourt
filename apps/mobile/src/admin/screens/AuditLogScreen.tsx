import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  ErrorText,
  GhostButton,
  PrimaryButton,
  SectionLabel,
  TextField,
} from "../../components/ui";
import { DataTable, SelectFilter, type SelectOptionLike } from "../../components/table";
import { DateField } from "../fields/DateField";
import { buildQuery } from "../query";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTheme } from "../../theme/ThemeProvider";
import { useTr } from "../../lib/i18n";

interface AuditRow {
  id: number;
  log_name?: string | null;
  description?: string | null;
  event?: string | null;
  subject_type?: string | null;
  subject_id?: number | null;
  causer_name?: string | null;
  created_at?: string | null;
}

interface AuditMeta {
  current_page: number;
  last_page: number;
  total: number;
}

interface AppliedFilters {
  log_name: string;
  event: string;
  subject_type: string;
  search: string;
  from: string;
  to: string;
}

const EMPTY: AppliedFilters = {
  log_name: "",
  event: "",
  subject_type: "",
  search: "",
  from: "",
  to: "",
};

function toOptions(values: string[]): SelectOptionLike[] {
  return values.map((value) => ({ value, label: value }));
}

export function AuditLogScreen() {
  const { colors } = useTheme();
  const tr = useTr();
  const campusId = useCampusId();

  const [draft, setDraft] = useState<AppliedFilters>(EMPTY);
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY);
  const [page, setPage] = useState(1);

  const filtersLoader = useCallback(async () => {
    const response = await apiFetch<{
      data: { log_names: string[]; events: string[]; subject_types: string[] };
    }>("/v1/audit-logs/filters", { campusId });
    return response.data;
  }, [campusId]);
  const filters = useAsync(filtersLoader, [campusId]);

  const logsLoader = useCallback(async () => {
    const query = buildQuery({ ...applied, page, per_page: 25 });
    const response = await apiFetch<{ data: AuditRow[]; meta: AuditMeta }>(
      `/v1/audit-logs${query}`,
      { campusId }
    );
    return { rows: response.data, meta: response.meta };
  }, [applied, page, campusId]);
  const logs = useAsync<{ rows: AuditRow[]; meta: AuditMeta }>(logsLoader, [applied, page, campusId]);

  const apply = useCallback(() => {
    setPage(1);
    setApplied(draft);
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  }, []);

  const meta = logs.data?.meta;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionLabel>Filters</SectionLabel>
        <SelectFilter
          label="Log"
          value={draft.log_name}
          options={toOptions(filters.data?.log_names ?? [])}
          onChange={(value) => setDraft((current) => ({ ...current, log_name: value }))}
          anyLabel="All logs"
        />
        <SelectFilter
          label="Event"
          value={draft.event}
          options={toOptions(filters.data?.events ?? [])}
          onChange={(value) => setDraft((current) => ({ ...current, event: value }))}
          anyLabel="All events"
        />
        <SelectFilter
          label="Subject"
          value={draft.subject_type}
          options={toOptions(filters.data?.subject_types ?? [])}
          onChange={(value) => setDraft((current) => ({ ...current, subject_type: value }))}
          anyLabel="Any subject"
        />
        <TextField
          label="Search"
          value={draft.search}
          onChangeText={(value) => setDraft((current) => ({ ...current, search: value }))}
          placeholder="Description contains..."
          autoCapitalize="none"
        />
        <DateField
          label="From"
          mode="date"
          value={draft.from}
          onChange={(value) => setDraft((current) => ({ ...current, from: String(value ?? "") }))}
        />
        <DateField
          label="To"
          mode="date"
          value={draft.to}
          onChange={(value) => setDraft((current) => ({ ...current, to: String(value ?? "") }))}
        />
        <View style={styles.actions}>
          <PrimaryButton label="Apply" onPress={apply} />
          <GhostButton label="Reset" onPress={reset} />
        </View>
      </Card>

      <Card>
        <SectionLabel>Activity</SectionLabel>
        {logs.loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
        {logs.error ? <ErrorText message={logs.error} /> : null}
        {logs.data ? (
          <>
            <DataTable
              rows={logs.data.rows as unknown as Record<string, unknown>[]}
              columns={[
                { key: "created_at", label: "When" },
                { key: "log_name", label: "Log" },
                { key: "event", label: "Event" },
                { key: "description", label: "Description" },
                { key: "causer_name", label: "By" },
                { key: "subject_type", label: "Subject" },
              ]}
              emptyLabel="No activity found"
            />
            {meta ? (
              <View style={styles.pager}>
                <GhostButton
                  label="Prev"
                  onPress={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={meta.current_page <= 1}
                />
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {tr(`Page ${meta.current_page} of ${meta.last_page}`)} · {meta.total}
                </Text>
                <GhostButton
                  label="Next"
                  onPress={() => setPage((value) => Math.min(meta.last_page, value + 1))}
                  disabled={meta.current_page >= meta.last_page}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
});
