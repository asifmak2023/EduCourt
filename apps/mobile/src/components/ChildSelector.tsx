import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { StudentSummary } from "../lib/api";

export function ChildSelector({
  students,
  activeId,
  onSelect,
}: {
  students: StudentSummary[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const { colors } = useTheme();

  if (students.length <= 1) {
    return null;
  }

  return (
    <View style={styles.list}>
      {students.map((student) => {
        const active = student.id === activeId;
        const enrollment = student.enrollments?.[0];

        return (
          <Pressable
            key={student.id}
            onPress={() => onSelect(student.id)}
            accessibilityRole="button"
            style={[
              styles.row,
              {
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accentSoft : colors.surface,
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.accent : colors.foreground,
                fontWeight: "600",
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {student.full_name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>
              {enrollment?.class_room?.name
                ? `${enrollment.class_room.name}${
                    enrollment.section?.name ? `-${enrollment.section.name}` : ""
                  }`
                : student.admission_no}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
    gap: 6,
  },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
