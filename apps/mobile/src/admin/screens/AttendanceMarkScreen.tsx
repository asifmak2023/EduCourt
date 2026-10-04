import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
  PrimaryButton,
  SectionLabel,
  StatusPill,
  TextField,
} from "../../components/ui";
import { DateField } from "../fields/DateField";
import { LookupField } from "../fields/LookupField";
import { apiFetch } from "../../lib/api";
import { useCampusId } from "../../lib/campus";
import { useAsync } from "../../lib/useAsync";
import { useTheme } from "../../theme/ThemeProvider";

export type AttendanceMode = "student" | "staff";

export function StudentAttendanceMarkScreen() {
  return <AttendanceMarkScreen mode="student" />;
}

export function StaffAttendanceMarkScreen() {
  return <AttendanceMarkScreen mode="staff" />;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

interface RosterRow {
  id: number;
  name: string;
  code?: string | null;
}

interface MarkState {
  status: string;
  remarks: string;
  checkIn: string;
  checkOut: string;
}

const DEFAULT_MARK: MarkState = { status: "present", remarks: "", checkIn: "", checkOut: "" };

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function AttendanceMarkScreen({ mode }: { mode: AttendanceMode }) {
  const { colors } = useTheme();
  const campusId = useCampusId();
  const isStudent = mode === "student";

  const [date, setDate] = useState<string>(today());
  const [classId, setClassId] = useState<unknown>("");
  const [sectionId, setSectionId] = useState<unknown>("");
  const [marks, setMarks] = useState<Record<number, MarkState>>({});
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loader = useCallback(async () => {
    if (isStudent && !classId) {
      return [] as RosterRow[];
    }
    if (isStudent) {
      const query = new URLSearchParams({ class_room_id: String(classId), per_page: "200" });
      if (sectionId) {
        query.set("section_id", String(sectionId));
      }
      const response = await apiFetch<{ data: Record<string, unknown>[] }>(
        `/v1/students?${query.toString()}`,
        { campusId }
      );
      return response.data.map((item) => ({
        id: Number(item.id),
        name: String(item.full_name ?? ""),
        code: item.admission_no ? String(item.admission_no) : null,
      }));
    }
    const response = await apiFetch<{ data: Record<string, unknown>[] }>(
      "/v1/users?per_page=200",
      { campusId }
    );
    return response.data.map((item) => ({
      id: Number(item.id),
      name: String(item.name ?? ""),
      code: item.employee_code ? String(item.employee_code) : null,
    }));
  }, [isStudent, classId, sectionId, campusId]);

  const roster = useAsync<RosterRow[]>(loader, [isStudent, classId, sectionId, campusId]);
  const rows = roster.data ?? [];

  const markFor = (id: number): MarkState => marks[id] ?? DEFAULT_MARK;

  const patch = (id: number, next: Partial<MarkState>) => {
    setMarks((current) => ({ ...current, [id]: { ...(current[id] ?? DEFAULT_MARK), ...next } }));
  };

  const setAll = (status: string) => {
    setMarks((current) => {
      const next: Record<number, MarkState> = { ...current };
      for (const row of rows) {
        next[row.id] = { ...(current[row.id] ?? DEFAULT_MARK), status };
      }
      return next;
    });
  };

  const submit = useCallback(async () => {
    if (rows.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    const records = rows.map((row) => {
      const mark = markFor(row.id);
      if (isStudent) {
        return {
          student_id: row.id,
          status: mark.status,
          ...(mark.remarks ? { remarks: mark.remarks } : {}),
        };
      }
      return {
        user_id: row.id,
        status: mark.status,
        ...(mark.checkIn ? { check_in: mark.checkIn } : {}),
        ...(mark.checkOut ? { check_out: mark.checkOut } : {}),
        ...(mark.remarks ? { remarks: mark.remarks } : {}),
      };
    });

    const endpoint = isStudent ? "/v1/attendance/students/bulk" : "/v1/attendance/staff/bulk";
    const body: Record<string, unknown> = { attendance_date: date, records };
    if (isStudent) {
      body.class_room_id = classId ? Number(classId) : null;
      if (sectionId) {
        body.section_id = Number(sectionId);
      }
    }

    try {
      await apiFetch(endpoint, { method: "POST", body, campusId });
      setNotice(`Marked ${records.length} ${isStudent ? "student(s)" : "staff member(s)"} for ${date}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save attendance.");
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, marks, date, classId, sectionId, isStudent, campusId]);

  const pickerRow = rows.find((row) => row.id === pickerFor) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionLabel>{isStudent ? "Register" : "Staff attendance"}</SectionLabel>
        <DateField label="Date" mode="date" value={date} onChange={(value) => setDate(String(value ?? ""))} required />
        {isStudent ? (
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
        ) : null}
      </Card>

      {notice ? <Text style={{ color: colors.success, fontWeight: "600" }}>{notice}</Text> : null}
      {error ? <ErrorText message={error} /> : null}

      <Card>
        <View style={styles.headerRow}>
          <SectionLabel>{`${isStudent ? "Students" : "Staff"} (${rows.length})`}</SectionLabel>
          {rows.length > 0 ? (
            <View style={styles.quickRow}>
              <GhostButton label="All present" onPress={() => setAll("present")} />
              <GhostButton label="All absent" onPress={() => setAll("absent")} />
            </View>
          ) : null}
        </View>

        {isStudent && !classId ? (
          <EmptyState message="Choose a class to load the register." />
        ) : roster.loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
        ) : rows.length === 0 ? (
          <EmptyState message="No records found." />
        ) : (
          rows.map((row) => {
            const mark = markFor(row.id);
            return (
              <View key={row.id} style={[styles.row, { borderColor: colors.border }]}>
                <View style={styles.rowHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>{row.name}</Text>
                    {row.code ? (
                      <Text style={{ color: colors.muted, fontSize: 12, fontFamily: "monospace" }}>{row.code}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => setPickerFor(row.id)}
                    accessibilityRole="button"
                    style={[styles.statusPill, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                  >
                    <StatusPill value={mark.status} label={STATUS_OPTIONS.find((o) => o.value === mark.status)?.label ?? mark.status} />
                  </Pressable>
                </View>

                {isStudent ? (
                  <TextField
                    value={mark.remarks}
                    onChangeText={(value) => patch(row.id, { remarks: value })}
                    placeholder="Remarks (optional)"
                  />
                ) : (
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <TextField
                        label="Check in"
                        value={mark.checkIn}
                        onChangeText={(value) => patch(row.id, { checkIn: value })}
                        placeholder="HH:MM"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextField
                        label="Check out"
                        value={mark.checkOut}
                        onChangeText={(value) => patch(row.id, { checkOut: value })}
                        placeholder="HH:MM"
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        {rows.length > 0 ? (
          <PrimaryButton label="Save attendance" onPress={() => void submit()} loading={busy} />
        ) : null}
      </Card>

      <Modal visible={pickerFor !== null} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerFor(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{pickerRow?.name ?? "Status"}</Text>
            {STATUS_OPTIONS.map((option) => {
              const active = pickerRow ? markFor(pickerRow.id).status === option.value : false;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (pickerFor !== null) {
                      patch(pickerFor, { status: option.value });
                    }
                    setPickerFor(null);
                  }}
                  style={[styles.option, active ? { backgroundColor: colors.accentSoft } : null]}
                >
                  <Text style={{ color: active ? colors.accent : colors.foreground, fontSize: 15 }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 14,
    padding: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    padding: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 8,
  },
});
