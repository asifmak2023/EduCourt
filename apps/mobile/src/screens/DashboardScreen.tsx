import { StyleSheet, Text, View } from "react-native";
import type { AuthUser, StudentSummary } from "../lib/api";
import { Screen } from "../components/Screen";
import { Avatar } from "../components/Avatar";
import { Card, EmptyState, Metric, SectionLabel } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

export function DashboardScreen({
  user,
  students,
}: {
  user: AuthUser;
  students: StudentSummary[];
}) {
  const { colors } = useTheme();

  const modules = Array.from(
    new Set(user.permissions.map((permission) => permission.split(".")[0]))
  ).sort();

  return (
    <Screen>
      <Card>
        <SectionLabel>Signed in as</SectionLabel>
        <View style={styles.identity}>
          <Avatar name={user.name} photoUrl={user.photo_url} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.value, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{user.email}</Text>
          </View>
        </View>
      </Card>

      {students.length > 0 ? (
        <Card>
          <SectionLabel>{students.length > 1 ? "Your children" : "Student"}</SectionLabel>
          {students.map((student) => {
            const enrollment = student.enrollments?.[0];

            return (
              <View key={student.id} style={styles.child}>
                <Text style={[styles.childName, { color: colors.foreground }]}>
                  {student.full_name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {student.admission_no}
                  {enrollment?.class_room?.name
                    ? ` · ${enrollment.class_room.name}${
                        enrollment.section?.name ? `-${enrollment.section.name}` : ""
                      }`
                    : ""}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <SectionLabel>Roles</SectionLabel>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {user.roles.join(", ") || "-"}
        </Text>
      </Card>

      <Card>
        <SectionLabel>Accessible modules</SectionLabel>
        {modules.length > 0 ? (
          <Text style={[styles.modules, { color: colors.foreground }]}>
            {modules.join(", ")}
          </Text>
        ) : (
          <EmptyState message="No modules assigned." />
        )}
      </Card>

      <View style={styles.metricsRow}>
        <Metric label="Roles" value={user.roles.length} />
        <Metric label="Modules" value={modules.length} />
        <Metric label={students.length > 1 ? "Children" : "Student records"} value={students.length} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  identity: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  child: {
    marginTop: 12,
  },
  childName: {
    fontSize: 15,
    fontWeight: "600",
  },
  modules: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textTransform: "capitalize",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
});
