import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Card, EmptyState, ErrorText, GhostButton, SectionLabel } from "../../components/ui";
import { DataTable } from "../../components/table";
import { LookupField } from "../fields/LookupField";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";

export function MeritListScreen() {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const tr = useTr();
  const [examId, setExamId] = useState<unknown>("");
  const [classId, setClassId] = useState<unknown>("");

  const loader = useCallback(async () => {
    if (!examId || !classId) {
      return [] as Record<string, unknown>[];
    }
    const response = await apiFetch<{ data: Record<string, unknown>[] }>(
      `/v1/exams/${String(examId)}/merit-list?class_room_id=${String(classId)}`,
      { campusId }
    );
    return response.data;
  }, [examId, classId, campusId]);

  const { data, loading, error, reload } = useAsync<Record<string, unknown>[]>(loader, [
    examId,
    classId,
    campusId,
  ]);
  const rows = data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionLabel>{tr("Merit list")}</SectionLabel>
        <LookupField label="Exam" lookup="exams" value={examId} onChange={setExamId} required />
        <LookupField label="Class" lookup="classRooms" value={classId} onChange={setClassId} required />
      </Card>

      {!examId || !classId ? (
        <EmptyState message={tr("Choose an exam and a class to view the merit list.")} />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : error ? (
        <View style={{ marginTop: 16 }}>
          <ErrorText message={error} />
          <GhostButton label="Retry" onPress={reload} />
        </View>
      ) : (
        <Card>
          <SectionLabel>{`${tr("Ranked students")} (${rows.length})`}</SectionLabel>
          <DataTable
            columns={[
              { key: "rank", label: tr("Rank") },
              { key: "student", label: tr("Student") },
              { key: "total_obtained", label: tr("Total") },
              { key: "percentage", label: tr("Percent") },
              { key: "grade", label: tr("Grade") },
            ]}
            rows={rows}
          />
        </Card>
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
});
