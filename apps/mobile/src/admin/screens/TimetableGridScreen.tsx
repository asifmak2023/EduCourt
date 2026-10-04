import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Card,
  EmptyState,
  ErrorText,
  GhostButton,
  SectionLabel,
  StatusPill,
} from "../../components/ui";
import { LookupField } from "../fields/LookupField";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";

type Mode = "class" | "teacher";

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

interface Slot {
  id: number;
  day_of_week: number;
  period: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  section: string;
  is_published: boolean;
}

export function TimetableGridScreen() {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const tr = useTr();

  const [mode, setMode] = useState<Mode>("class");
  const [classId, setClassId] = useState<unknown>("");
  const [sectionId, setSectionId] = useState<unknown>("");
  const [teacherId, setTeacherId] = useState<unknown>("");

  const loader = useCallback(async () => {
    if (mode === "class") {
      if (!classId) {
        return [] as Slot[];
      }
      const query = new URLSearchParams();
      if (sectionId) {
        query.set("section_id", String(sectionId));
      }
      const suffix = query.toString();
      const response = await apiFetch<{ data: Record<string, unknown>[] }>(
        `/v1/timetable/classes/${String(classId)}${suffix ? `?${suffix}` : ""}`,
        { campusId }
      );
      return mapSlots(response.data);
    }
    if (!teacherId) {
      return [] as Slot[];
    }
    const response = await apiFetch<{ data: Record<string, unknown>[] }>(
      `/v1/timetable/teachers/${String(teacherId)}`,
      { campusId }
    );
    return mapSlots(response.data);
  }, [mode, classId, sectionId, teacherId, campusId]);

  const { data, loading, error, reload } = useAsync<Slot[]>(loader, [
    mode,
    classId,
    sectionId,
    teacherId,
    campusId,
  ]);
  const slots = data ?? [];

  const days = Array.from(new Set(slots.map((slot) => slot.day_of_week))).sort((a, b) => a - b);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.chips}>
        {(["class", "teacher"] as Mode[]).map((value) => {
          const active = mode === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 13, fontWeight: "600" }}>
                {tr(value === "class" ? "By class" : "By teacher")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <SectionLabel>{tr("Timetable")}</SectionLabel>
        {mode === "class" ? (
          <>
            <LookupField label="Class" lookup="classRooms" value={classId} onChange={setClassId} required />
            <LookupField
              label="Section"
              lookup="sections"
              value={sectionId}
              onChange={setSectionId}
              dependsValue={classId || null}
            />
          </>
        ) : (
          <LookupField label="Teacher" lookup="staffUsers" value={teacherId} onChange={setTeacherId} required />
        )}
      </Card>

      {(mode === "class" && !classId) || (mode === "teacher" && !teacherId) ? (
        <EmptyState message={tr("Choose a class or teacher to view the timetable.")} />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : error ? (
        <View style={{ marginTop: 16 }}>
          <ErrorText message={error} />
          <GhostButton label="Retry" onPress={reload} />
        </View>
      ) : slots.length === 0 ? (
        <EmptyState message={tr("No timetable slots found.")} />
      ) : (
        days.map((day) => (
          <Card key={day}>
            <SectionLabel>{tr(DAY_NAMES[day] ?? `Day ${day}`)}</SectionLabel>
            {slots
              .filter((slot) => slot.day_of_week === day)
              .map((slot) => (
                <View key={slot.id} style={[styles.slot, { borderColor: colors.border }]}>
                  <View style={styles.slotHead}>
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }}>
                      {slot.subject || "-"}
                    </Text>
                    {slot.is_published ? null : <StatusPill value="draft" label={tr("Draft")} />}
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {[slot.period, slot.time].filter(Boolean).join(" · ")}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                    {[slot.teacher, slot.room, slot.section].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              ))}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function relationName(value: unknown, key: string): string {
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  return String(record[key] ?? record.name ?? "");
}

function mapSlots(rows: Record<string, unknown>[]): Slot[] {
  return rows.map((row) => {
    const period = row.period as Record<string, unknown> | null;
    const starts = period ? String(period.starts_at ?? "").slice(0, 5) : "";
    const ends = period ? String(period.ends_at ?? "").slice(0, 5) : "";
    return {
      id: Number(row.id),
      day_of_week: Number(row.day_of_week ?? 0),
      period: period ? String(period.name ?? "") : "",
      time: starts && ends ? `${starts}-${ends}` : "",
      subject: relationName(row.subject, "name"),
      teacher: relationName(row.teacher, "name"),
      room: relationName(row.room, "name"),
      section: relationName(row.section, "name"),
      is_published: Boolean(row.is_published),
    };
  });
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  slot: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  slotHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});
