import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  EmptyState,
  ErrorText,
  GhostButton,
  SectionLabel,
} from "../../components/ui";
import { DataTable, StatGrid, type StatItem } from "../../components/table";
import { LookupField } from "../fields/LookupField";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";

interface TranscriptTerm {
  term: { id: number; name?: string };
  credits_registered: number;
  credits_graded: number;
  credits_earned: number;
  gpa: number | null;
  subjects: Record<string, unknown>[];
}

interface Transcript {
  student?: string;
  gpa: number | null;
  credits_earned: number;
  terms: TranscriptTerm[];
}

export function TranscriptScreen() {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const tr = useTr();
  const [studentId, setStudentId] = useState<unknown>("");

  const loader = useCallback(async () => {
    if (!studentId) {
      return null;
    }
    const response = await apiFetch<{ data: Transcript }>(
      `/v1/students/${String(studentId)}/transcript`,
      { campusId }
    );
    return response.data;
  }, [studentId, campusId]);

  const { data, loading, error, reload } = useAsync<Transcript | null>(loader, [studentId, campusId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionLabel>{tr("Transcript")}</SectionLabel>
        <LookupField label="Student" lookup="students" value={studentId} onChange={setStudentId} required />
      </Card>

      {!studentId ? (
        <EmptyState message={tr("Choose a student to view the transcript.")} />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : error ? (
        <View style={{ marginTop: 16 }}>
          <ErrorText message={error} />
          <GhostButton label="Retry" onPress={reload} />
        </View>
      ) : !data || data.terms.length === 0 ? (
        <EmptyState message={tr("No course registrations found for this student.")} />
      ) : (
        <>
          <Card>
            <StatGrid
              items={[
                { label: "Student", value: data.student ?? "-" },
                { label: "Cumulative GPA", value: data.gpa ?? "-" },
                { label: "Credits earned", value: data.credits_earned },
              ] satisfies StatItem[]}
            />
          </Card>

          {data.terms.map((term) => (
            <Card key={term.term.id}>
              <SectionLabel>{term.term.name ?? `${tr("Term")} #${term.term.id}`}</SectionLabel>
              <StatGrid
                items={[
                  { label: "GPA", value: term.gpa ?? "-" },
                  { label: "Registered", value: term.credits_registered },
                  { label: "Earned", value: term.credits_earned },
                ]}
              />
              <DataTable
                columns={[
                  { key: "subject", label: tr("Subject") },
                  { key: "credit_hours", label: tr("Credits") },
                  { key: "percentage", label: tr("Percent") },
                  { key: "grade", label: tr("Grade") },
                  { key: "grade_points", label: tr("Points") },
                  { key: "status", label: tr("Status") },
                ]}
                rows={term.subjects}
              />
            </Card>
          ))}
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
});
