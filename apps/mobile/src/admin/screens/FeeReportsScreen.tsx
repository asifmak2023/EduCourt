import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, EmptyState, ErrorText, PrimaryButton, SectionLabel, StatusPill } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { formatMoney } from "../../lib/format";
import { useTheme } from "../../theme/ThemeProvider";
import { DateField } from "../fields/DateField";
import { LookupField } from "../fields/LookupField";

type Tab = "defaulters" | "collection" | "class";

interface DefaulterRow {
  student_id: number;
  student?: string;
  admission_no?: string;
  class?: string;
  section?: string;
  vouchers: number;
  outstanding: string;
  max_days_overdue: number;
  bucket: string;
}

interface CollectionMethod {
  method: string;
  count: number;
  total: string;
}

interface ClassRow {
  class_room_id: number | null;
  class?: string;
  students: number;
  vouchers: number;
  billed: string;
  collected: string;
  outstanding: string;
  collection_rate: number;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "defaulters", label: "Defaulters" },
  { key: "collection", label: "Collection" },
  { key: "class", label: "Class summary" },
];

export function FeeReportsScreen() {
  const { colors } = useTheme();
  const campusId = useCampusId();

  const [tab, setTab] = useState<Tab>("defaulters");
  const [academicYearId, setAcademicYearId] = useState<unknown>("");
  const [classRoomId, setClassRoomId] = useState<unknown>("");
  const [overdueOnly, setOverdueOnly] = useState(true);
  const [from, setFrom] = useState<unknown>("");
  const [to, setTo] = useState<unknown>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ label: string; value: string }[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoaded(false);
    try {
      if (tab === "defaulters") {
        const params = new URLSearchParams();
        if (academicYearId) params.set("academic_year_id", String(academicYearId));
        if (classRoomId) params.set("class_room_id", String(classRoomId));
        params.set("overdue_only", overdueOnly ? "1" : "0");
        const response = await apiFetch<{
          summary: { students: number; vouchers: number; outstanding: string };
          data: DefaulterRow[];
        }>(`/v1/fee-reports/defaulters?${params.toString()}`, { campusId });
        setSummary([
          { label: "Students", value: String(response.summary.students) },
          { label: "Vouchers", value: String(response.summary.vouchers) },
          { label: "Outstanding", value: formatMoney(response.summary.outstanding) },
        ]);
        setRows(response.data as unknown as Record<string, unknown>[]);
      } else if (tab === "collection") {
        const params = new URLSearchParams();
        if (from) params.set("from", String(from));
        if (to) params.set("to", String(to));
        const response = await apiFetch<{
          total: string;
          count: number;
          by_method: CollectionMethod[];
        }>(`/v1/fee-reports/collection?${params.toString()}`, { campusId });
        setSummary([
          { label: "Payments", value: String(response.count) },
          { label: "Collected", value: formatMoney(response.total) },
        ]);
        setRows(response.by_method as unknown as Record<string, unknown>[]);
      } else {
        const params = new URLSearchParams();
        if (academicYearId) params.set("academic_year_id", String(academicYearId));
        if (classRoomId) params.set("class_room_id", String(classRoomId));
        const response = await apiFetch<{
          summary: { classes: number; students: number; billed: string; collected: string; outstanding: string };
          data: ClassRow[];
        }>(`/v1/fee-reports/classes/summary?${params.toString()}`, { campusId });
        setSummary([
          { label: "Classes", value: String(response.summary.classes) },
          { label: "Billed", value: formatMoney(response.summary.billed) },
          { label: "Collected", value: formatMoney(response.summary.collected) },
          { label: "Outstanding", value: formatMoney(response.summary.outstanding) },
        ]);
        setRows(response.data as unknown as Record<string, unknown>[]);
      }
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load the report.");
    } finally {
      setLoading(false);
    }
  }, [tab, academicYearId, classRoomId, overdueOnly, from, to, campusId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setTab(item.key);
                setRows([]);
                setSummary([]);
                setLoaded(false);
                setError(null);
              }}
              style={[
                styles.tab,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 13, fontWeight: "600" }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <ErrorText message={error} /> : null}

      <Card>
        {tab !== "collection" ? (
          <>
            <LookupField
              label="Academic year"
              lookup="academicYears"
              value={academicYearId}
              onChange={setAcademicYearId}
            />
            <LookupField
              label="Class"
              lookup="classRooms"
              value={classRoomId}
              onChange={setClassRoomId}
            />
          </>
        ) : (
          <>
            <DateField label="From" mode="date" value={from} onChange={setFrom} />
            <DateField label="To" mode="date" value={to} onChange={setTo} />
          </>
        )}

        {tab === "defaulters" ? (
          <Pressable
            onPress={() => setOverdueOnly((previous) => !previous)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: overdueOnly }}
            style={styles.toggle}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: overdueOnly ? colors.accent : colors.border,
                  backgroundColor: overdueOnly ? colors.accent : "transparent",
                },
              ]}
            >
              {overdueOnly ? (
                <Text style={{ color: colors.accentForeground, fontSize: 12, fontWeight: "700" }}>x</Text>
              ) : null}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>Overdue only</Text>
          </Pressable>
        ) : null}

        <PrimaryButton label="Run report" onPress={() => void load()} loading={loading} />
      </Card>

      {summary.length > 0 ? (
        <View style={styles.summaryRow}>
          {summary.map((item) => (
            <View
              key={item.label}
              style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>
                {item.label}
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {loading && !loaded ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      {loaded ? (
        <View style={styles.results}>
          <SectionLabel>{`${rows.length} row${rows.length === 1 ? "" : "s"}`}</SectionLabel>
          {rows.length === 0 ? <EmptyState message="No data for this report." /> : null}
          {tab === "defaulters"
            ? (rows as unknown as DefaulterRow[]).map((row) => (
                <Card key={`${row.student_id}-${row.class ?? ""}`}>
                  <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                    {row.student ?? `Student #${row.student_id}`}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {[row.admission_no, row.class, row.section].filter(Boolean).join(" · ")}
                  </Text>
                  <View style={styles.resultMeta}>
                    <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                      {formatMoney(row.outstanding)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {row.vouchers} voucher(s) · {row.max_days_overdue} day(s) overdue
                    </Text>
                  </View>
                </Card>
              ))
            : null}
          {tab === "collection"
            ? (rows as unknown as CollectionMethod[]).map((row) => (
                <Card key={row.method}>
                  <View style={styles.resultMeta}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                      {row.method}
                    </Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                      {formatMoney(row.total)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    {row.count} payment(s)
                  </Text>
                </Card>
              ))
            : null}
          {tab === "class"
            ? (rows as unknown as ClassRow[]).map((row) => (
                <Card key={String(row.class_room_id ?? row.class)}>
                  <View style={styles.resultMeta}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                      {row.class ?? "Unassigned"}
                    </Text>
                    <StatusPill
                      value={row.collection_rate >= 100 ? "paid" : row.collection_rate > 0 ? "partial" : "unpaid"}
                      label={`${row.collection_rate}%`}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    {row.students} student(s) · billed {formatMoney(row.billed)}
                  </Text>
                  <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 4, fontWeight: "600" }}>
                    Collected {formatMoney(row.collected)} · Outstanding {formatMoney(row.outstanding)}
                  </Text>
                </Card>
              ))
            : null}
        </View>
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
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  metric: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
  },
  loader: {
    marginTop: 24,
  },
  results: {
    marginTop: 20,
    gap: 8,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
