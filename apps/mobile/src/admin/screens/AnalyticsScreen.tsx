import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, PrimaryButton, SectionLabel } from "../../components/ui";
import { DateField } from "../fields/DateField";
import { LookupField } from "../fields/LookupField";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { ReportView } from "../ReportView";

type Selector = "none" | "exam" | "student";

interface ReportDef {
  key: string;
  label: string;
  endpoint: string;
  selector?: Selector;
  dateRange?: boolean;
}

const REPORTS: ReportDef[] = [
  { key: "dashboard", label: "Campus dashboard", endpoint: "/v1/reports/campus-dashboard" },
  { key: "progress", label: "Progress", endpoint: "/v1/reports/progress", dateRange: true },
  { key: "attendance", label: "Attendance summary", endpoint: "/v1/reports/attendance", dateRange: true },
  { key: "results", label: "Exam results", endpoint: "/v1/reports/results", selector: "exam" },
  { key: "staff", label: "Staff summary", endpoint: "/v1/reports/staff", dateRange: true },
  { key: "yearly", label: "Student yearly", endpoint: "/v1/reports/students", selector: "student" },
  { key: "financial", label: "Financial summary", endpoint: "/v1/reports/financial", dateRange: true },
  { key: "payroll", label: "Payroll summary", endpoint: "/v1/reports/payroll", dateRange: true },
];

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function monthStart() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
}

export function AnalyticsScreen() {
  const { colors } = useTheme();
  const tr = useTr();
  const [activeKey, setActiveKey] = useState(REPORTS[0].key);
  const active = REPORTS.find((report) => report.key === activeKey) ?? REPORTS[0];

  const [examId, setExamId] = useState<unknown>("");
  const [studentId, setStudentId] = useState<unknown>("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [applied, setApplied] = useState({ from: monthStart(), to: today() });

  const endpoint = useMemo(() => {
    if (active.selector === "exam") {
      return examId ? `${active.endpoint}/${String(examId)}` : null;
    }
    if (active.selector === "student") {
      return studentId ? `${active.endpoint}/${String(studentId)}/yearly` : null;
    }
    return active.endpoint;
  }, [active, examId, studentId]);

  const params = active.dateRange ? { from: applied.from, to: applied.to } : {};

  const reset = (key: string) => {
    setActiveKey(key);
    setExamId("");
    setStudentId("");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.chips}>
        {REPORTS.map((report) => {
          const isActive = active.key === report.key;
          return (
            <Pressable
              key={report.key}
              onPress={() => reset(report.key)}
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

      {active.selector === "exam" ? (
        <Card>
          <SectionLabel>{tr(active.label)}</SectionLabel>
          <LookupField label="Exam" lookup="exams" value={examId} onChange={setExamId} required />
        </Card>
      ) : null}

      {active.selector === "student" ? (
        <Card>
          <SectionLabel>{tr(active.label)}</SectionLabel>
          <LookupField label="Student" lookup="students" value={studentId} onChange={setStudentId} required />
        </Card>
      ) : null}

      {active.dateRange ? (
        <Card>
          <SectionLabel>{tr("Date range")}</SectionLabel>
          <DateField label="From" mode="date" value={from} onChange={(value) => setFrom(String(value ?? ""))} />
          <DateField label="To" mode="date" value={to} onChange={(value) => setTo(String(value ?? ""))} />
          <PrimaryButton label={tr("Apply")} onPress={() => setApplied({ from, to })} />
        </Card>
      ) : null}

      {active.selector && !endpoint ? (
        <EmptyState message={tr("Choose a record to run this report.")} />
      ) : endpoint ? (
        <Card>
          <SectionLabel>{tr(active.label)}</SectionLabel>
          <ReportView
            key={`${active.key}-${endpoint}-${params.from ?? ""}-${params.to ?? ""}`}
            endpoint={endpoint}
            params={params}
          />
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
