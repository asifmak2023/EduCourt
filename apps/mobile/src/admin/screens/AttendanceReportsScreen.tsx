import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, PrimaryButton, SectionLabel } from "../../components/ui";
import { DateField } from "../fields/DateField";
import { ReportView } from "../ReportView";
import { useTheme } from "../../theme/ThemeProvider";
import { useTr } from "../../lib/i18n";

type Mode = "student" | "staff";

function monthStart(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
}

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function AttendanceReportsScreen() {
  const { colors } = useTheme();
  const tr = useTr();

  const [mode, setMode] = useState<Mode>("student");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [applied, setApplied] = useState({ from: monthStart(), to: today() });

  const endpoint =
    mode === "student" ? "/v1/attendance/students/report" : "/v1/attendance/staff/report";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.chips}>
        {(["student", "staff"] as Mode[]).map((value) => {
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
                {tr(value === "student" ? "Student report" : "Staff report")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <SectionLabel>Date range</SectionLabel>
        <DateField label="From" mode="date" value={from} onChange={(value) => setFrom(String(value ?? ""))} />
        <DateField label="To" mode="date" value={to} onChange={(value) => setTo(String(value ?? ""))} />
        <PrimaryButton label="Apply" onPress={() => setApplied({ from, to })} />
      </Card>

      <Card>
        <SectionLabel>{tr(mode === "student" ? "Student attendance report" : "Staff attendance report")}</SectionLabel>
        <ReportView
          key={`${mode}-${applied.from}-${applied.to}`}
          endpoint={endpoint}
          params={{ from: applied.from, to: applied.to }}
        />
      </Card>
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
});
