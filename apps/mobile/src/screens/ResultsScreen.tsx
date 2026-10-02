import { useTranslation } from "@eis/i18n";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchResults } from "../lib/portal";
import { useAsync } from "../lib/useAsync";
import { Screen } from "../components/Screen";
import { Card, EmptyState, ErrorText, Metric, StatusPill } from "../components/ui";
import { formatDate } from "../lib/format";
import { useTheme } from "../theme/ThemeProvider";

export function ResultsScreen({ activeStudentId }: { activeStudentId: number | null }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data, loading, error, reload } = useAsync(
    () => fetchResults(activeStudentId),
    [activeStudentId]
  );

  const cards = data?.data ?? [];

  return (
    <Screen refreshing={loading && data !== null} onRefresh={reload}>
      {loading && data === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <ErrorText message={error} />
      ) : cards.length === 0 ? (
        <Card>
          <EmptyState message={t("results.empty")} />
        </Card>
      ) : (
        cards.map((card) => (
          <Card key={card.exam_id}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exam, { color: colors.foreground }]}>
                  {card.exam?.name ?? t("results.examHash", { id: card.exam_id })}
                </Text>
                {card.exam?.starts_on ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {formatDate(card.exam.starts_on)}
                    {card.exam.ends_on ? ` - ${formatDate(card.exam.ends_on)}` : ""}
                  </Text>
                ) : null}
              </View>
              <StatusPill value={card.result} label={card.grade ?? card.result} />
            </View>

            <View style={styles.metrics}>
              <Metric
                label={t("results.obtained")}
                value={`${card.total_obtained} / ${card.total_max}`}
              />
              <Metric
                label={t("results.percentage")}
                value={`${card.percentage}%`}
              />
              <Metric
                label={t("results.failed")}
                value={card.failed_subjects}
                tone={card.failed_subjects > 0 ? colors.danger : undefined}
              />
            </View>

            {card.subjects.map((subject) => (
              <View key={subject.exam_paper_id} style={styles.subjectRow}>
                <Text style={[styles.subjectName, { color: colors.foreground }]}>
                  {subject.subject ?? t("results.subject")}
                </Text>
                <Text
                  style={{
                    color: subject.passed ? colors.success : colors.danger,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {subject.is_absent || subject.marks_obtained === null
                    ? t("results.absent")
                    : `${subject.marks_obtained} / ${subject.max_marks}`}
                </Text>
              </View>
            ))}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exam: {
    fontSize: 16,
    fontWeight: "700",
  },
  metrics: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  subjectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
  },
  subjectName: {
    flexShrink: 1,
    fontSize: 14,
  },
});
