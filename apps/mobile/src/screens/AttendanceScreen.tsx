import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchAttendance } from "../lib/portal";
import { useAsync } from "../lib/useAsync";
import { Screen } from "../components/Screen";
import { Card, EmptyState, ErrorText, Metric, SectionLabel, StatusPill } from "../components/ui";
import { formatDate } from "../lib/format";
import { useTheme } from "../theme/ThemeProvider";

export function AttendanceScreen({ activeStudentId }: { activeStudentId: number | null }) {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useAsync(
    () => fetchAttendance(activeStudentId),
    [activeStudentId]
  );

  return (
    <Screen refreshing={loading && data !== null} onRefresh={reload}>
      {loading && data === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <ErrorText message={error} />
      ) : data ? (
        <>
          <Card>
            <SectionLabel>
              Summary ({data.summary.from} to {data.summary.to})
            </SectionLabel>
            <View style={styles.metrics}>
              <Metric label="Present" value={data.summary.present} tone={colors.success} />
              <Metric label="Absent" value={data.summary.absent} tone={colors.danger} />
              <Metric label="Late" value={data.summary.late} />
              <Metric label="Leave" value={data.summary.leave} />
            </View>
          </Card>

          <Card>
            <SectionLabel>Recent records</SectionLabel>
            {data.data.length === 0 ? (
              <EmptyState message="No attendance recorded in this period." />
            ) : (
              data.data.map((record) => (
                <View key={record.id} style={styles.record}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recordDate, { color: colors.foreground }]}>
                      {formatDate(record.attendance_date)}
                    </Text>
                    {record.remarks ? (
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {record.remarks}
                      </Text>
                    ) : null}
                  </View>
                  <StatusPill value={record.status} label={record.status_label} />
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 12,
  },
  record: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: "600",
  },
});
