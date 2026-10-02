import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={{ marginTop: 14 }}
    >
      {students.map((student) => {
        const active = student.id === activeId;

        return (
          <Pressable
            key={student.id}
            onPress={() => onSelect(student.id)}
            accessibilityRole="button"
            style={[
              styles.pill,
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
            >
              {student.full_name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
