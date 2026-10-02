import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchTimetable } from "../lib/portal";
import { useAsync } from "../lib/useAsync";
import type { TimetableSlot } from "../lib/api";
import { Screen } from "../components/Screen";
import { Card, EmptyState, ErrorText, SectionLabel } from "../components/ui";
import { dayName, periodTime } from "../lib/format";
import { useTheme } from "../theme/ThemeProvider";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 7];

export function TimetableScreen({ activeStudentId }: { activeStudentId: number | null }) {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useAsync(
    () => fetchTimetable(activeStudentId),
    [activeStudentId]
  );

  const slots = data ?? [];
  const byDay = new Map<number, TimetableSlot[]>();
  slots.forEach((slot) => {
    const list = byDay.get(slot.day_of_week) ?? [];
    list.push(slot);
    byDay.set(slot.day_of_week, list);
  });

  return (
    <Screen refreshing={loading && data !== null} onRefresh={reload}>
      {loading && data === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <ErrorText message={error} />
      ) : slots.length === 0 ? (
        <Card>
          <EmptyState message="No published timetable for this student yet." />
        </Card>
      ) : (
        DAY_ORDER.filter((day) => byDay.has(day)).map((day) => (
          <Card key={day}>
            <SectionLabel>{dayName(day)}</SectionLabel>
            {(byDay.get(day) ?? []).map((slot) => (
              <View key={slot.id} style={styles.slot}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subject, { color: colors.foreground }]}>
                    {slot.subject?.name ?? "Free period"}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {[
                      slot.period?.name,
                      periodTime(slot.period?.start_time, slot.period?.end_time),
                      slot.room?.name,
                      slot.teacher?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
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
  slot: {
    flexDirection: "row",
    marginTop: 12,
  },
  subject: {
    fontSize: 15,
    fontWeight: "600",
  },
});
