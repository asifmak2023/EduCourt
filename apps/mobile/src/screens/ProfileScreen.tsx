import { StyleSheet, Text, View } from "react-native";
import type { AuthUser } from "../lib/api";
import { Screen } from "../components/Screen";
import { ProfilePhotoCard } from "../components/ProfilePhotoCard";
import { Card, GhostButton, SectionLabel } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

export function ProfileScreen({
  user,
  onUserChange,
  onSignOut,
}: {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const { colors } = useTheme();
  const canManagePhoto = user.permissions.includes("user.photo");

  const rows: { label: string; value: string }[] = [
    { label: "Email", value: user.email },
    { label: "Phone", value: user.phone ?? "-" },
    { label: "Employee code", value: user.employee_code ?? "-" },
    { label: "Job title", value: user.job_title ?? "-" },
    { label: "Campus", value: user.campus?.name ?? "-" },
    { label: "Institution", value: user.institution?.name ?? "-" },
  ];

  return (
    <Screen>
      <ProfilePhotoCard
        endpoint={`/v1/users/${user.id}/photo`}
        name={user.name}
        photoUrl={user.photo_url ?? null}
        canManage={canManagePhoto}
        onChanged={(photoUrl) => onUserChange({ ...user, photo_url: photoUrl })}
        hint="JPG, PNG or WebP, up to 5 MB. Used as your avatar across the portal."
      />

      <Card>
        <SectionLabel>Account</SectionLabel>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: colors.foreground }]}>
              {row.value}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionLabel>Roles</SectionLabel>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>
          {user.roles.join(", ") || "-"}
        </Text>
      </Card>

      <View style={{ marginTop: 8 }}>
        <GhostButton label="Sign out" tone="danger" onPress={onSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
});
