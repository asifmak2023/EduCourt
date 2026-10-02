import { useState } from "react";
import { useTranslation } from "@eis/i18n";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTr } from "../../lib/i18n";
import { useTheme } from "../../theme/ThemeProvider";
import { formatDate } from "../../lib/format";
import { toText } from "./common";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIsoDate(value: unknown): Date {
  const text = toText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date();
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DateField({
  label,
  mode,
  value,
  onChange,
  error,
  required,
}: {
  label: string;
  mode: "date" | "time";
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  required?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseIsoDate(value));
  const [hour, setHour] = useState(() => {
    const match = /^(\d{2}):/.exec(toText(value));
    return match ? Number(match[1]) : 8;
  });
  const [minute, setMinute] = useState(() => {
    const match = /:(\d{2})/.exec(toText(value));
    return match ? Number(match[2]) : 0;
  });

  const text = toText(value);
  const display = mode === "date" ? (text ? formatDate(text) : "") : text;

  function openPicker() {
    setCursor(parseIsoDate(value));
    const match = /^(\d{2}):(\d{2})/.exec(toText(value));
    if (match) {
      setHour(Number(match[1]));
      setMinute(Number(match[2]));
    }
    setOpen(true);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>
        {tr(label)}
        {required ? " *" : ""}
      </Text>

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        style={[
          styles.control,
          { borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Text style={{ color: display ? colors.foreground : colors.muted, fontSize: 15 }}>
          {display || (mode === "date" ? "YYYY-MM-DD" : "HH:MM")}
        </Text>
      </Pressable>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            {mode === "date" ? (
              <>
                <View style={styles.header}>
                  <Pressable onPress={() => setCursor(new Date(year, month - 1, 1))} style={styles.navButton}>
                    <Text style={[styles.navText, { color: colors.accent }]}>{"<"}</Text>
                  </Pressable>
                  <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                    {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </Text>
                  <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} style={styles.navButton}>
                    <Text style={[styles.navText, { color: colors.accent }]}>{">"}</Text>
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAYS.map((day) => (
                    <Text key={day} style={[styles.weekLabel, { color: colors.muted }]}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {cells.map((day, index) => {
                    if (day === null) {
                      return <View key={`blank-${index}`} style={styles.cell} />;
                    }
                    const iso = toIsoDate(new Date(year, month, day));
                    const active = iso === text;
                    return (
                      <Pressable
                        key={iso}
                        onPress={() => {
                          onChange(iso);
                          setOpen(false);
                        }}
                        style={styles.cell}
                      >
                        <View
                          style={[
                            styles.dayDot,
                            active ? { backgroundColor: colors.accent } : null,
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? colors.accentForeground : colors.foreground,
                              fontSize: 14,
                            }}
                          >
                            {day}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeHeader, { color: colors.muted }]}>{t("admin.field.hour")}</Text>
                    <FlatList
                      data={Array.from({ length: 24 }, (_, index) => index)}
                      keyExtractor={(item) => `h-${item}`}
                      style={{ maxHeight: 300 }}
                      renderItem={({ item }) => {
                        const active = item === hour;
                        return (
                          <Pressable
                            onPress={() => setHour(item)}
                            style={[styles.timeCell, active ? { backgroundColor: colors.accentSoft } : null]}
                          >
                            <Text style={{ color: active ? colors.accent : colors.foreground }}>
                              {pad(item)}
                            </Text>
                          </Pressable>
                        );
                      }}
                    />
                  </View>

                  <View style={styles.timeColumn}>
                    <Text style={[styles.timeHeader, { color: colors.muted }]}>{t("admin.field.minute")}</Text>
                    <FlatList
                      data={Array.from({ length: 12 }, (_, index) => index * 5)}
                      keyExtractor={(item) => `m-${item}`}
                      style={{ maxHeight: 300 }}
                      renderItem={({ item }) => {
                        const active = item === minute;
                        return (
                          <Pressable
                            onPress={() => setMinute(item)}
                            style={[styles.timeCell, active ? { backgroundColor: colors.accentSoft } : null]}
                          >
                            <Text style={{ color: active ? colors.accent : colors.foreground }}>
                              {pad(item)}
                            </Text>
                          </Pressable>
                        );
                      }}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    onChange(`${pad(hour)}:${pad(minute)}`);
                    setOpen(false);
                  }}
                  style={[styles.doneButton, { backgroundColor: colors.accent }]}
                >
                  <Text style={{ color: colors.accentForeground, fontWeight: "600" }}>
                    {t("common.done")}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 16,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  control: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: "center",
  },
  error: {
    marginTop: 6,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    borderRadius: 14,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  navButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  navText: {
    fontSize: 18,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeHeader: {
    fontSize: 12,
    textAlign: "center",
    paddingBottom: 6,
  },
  timeCell: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  doneButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
});
