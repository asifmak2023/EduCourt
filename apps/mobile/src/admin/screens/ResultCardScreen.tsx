import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorText,
  GhostButton,
  SectionLabel,
  StatusPill,
} from "../../components/ui";
import { DataTable, StatGrid, type StatItem } from "../../components/table";
import { LookupField } from "../fields/LookupField";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";

interface ResultCard {
  student_id: number;
  exam_id: number;
  subjects: Record<string, unknown>[];
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string | null;
  failed_subjects: number;
  result: string;
}

export function ResultCardScreen() {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const tr = useTr();
  const [examId, setExamId] = useState<unknown>("");
  const [studentId, setStudentId] = useState<unknown>("");

  const loader = useCallback(async () => {
    if (!examId || !studentId) {
      return null;
    }
    const response = await apiFetch<{ data: ResultCard }>(
      `/v1/exams/${String(examId)}/students/${String(studentId)}/result-card`,
      { campusId }
    );
    return response.data;
  }, [examId, studentId, campusId]);

  const { data, loading, error, reload } = useAsync<ResultCard | null>(loader, [
    examId,
    studentId,
    campusId,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionLabel>{tr("Result card")}</SectionLabel>
        <LookupField label="Exam" lookup="exams" value={examId} onChange={setExamId} required />
        <LookupField label="Student" lookup="students" value={studentId} onChange={setStudentId} required />
      </Card>

      {!examId || !studentId ? (
        <EmptyState message={tr("Choose an exam and a student to view the result card.")} />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : error ? (
        <View style={{ marginTop: 16 }}>
          <ErrorText message={error} />
          <GhostButton label="Retry" onPress={reload} />
        </View>
      ) : !data ? (
        <EmptyState message={tr("No result available.")} />
      ) : (
        <>
          <Card>
            <View style={styles.resultHead}>
              <SectionLabel>{tr("Overall")}</SectionLabel>
              <StatusPill
                value={data.result}
                label={data.result === "pass" ? tr("Pass") : tr("Fail")}
              />
            </View>
            <StatGrid
              items={[
                { label: "Obtained", value: `${data.total_obtained} / ${data.total_max}` },
                { label: "Percentage", value: `${data.percentage}%` },
                { label: "Grade", value: data.grade ?? "-" },
                { label: "Failed subjects", value: data.failed_subjects },
              ] satisfies StatItem[]}
            />
          </Card>

          <Card>
            <SectionLabel>{tr("Subjects")}</SectionLabel>
            <DataTable
              columns={[
                { key: "subject", label: tr("Subject") },
                { key: "max_marks", label: tr("Max") },
                { key: "pass_marks", label: tr("Pass") },
                { key: "marks_obtained", label: tr("Obtained") },
                { key: "is_absent", label: tr("Absent") },
                { key: "passed", label: tr("Passed") },
                { key: "remarks", label: tr("Remarks") },
              ]}
              rows={data.subjects}
            />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  resultHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});
