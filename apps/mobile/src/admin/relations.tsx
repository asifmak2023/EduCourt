import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@eis/i18n";
import { useTheme } from "../theme/ThemeProvider";
import type { AdminRecord, DetailSection } from "./types";

interface Guardian {
  id: number;
  name: string;
  phone?: string | null;
  relationship?: string | null;
  is_primary?: boolean;
  is_emergency_contact?: boolean;
}

interface Enrollment {
  id: number;
  academic_year?: { name: string } | null;
  class_room?: { name: string } | null;
  section?: { name: string } | null;
  roll_number?: string | null;
  status?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
}

function asGuardians(item: AdminRecord): Guardian[] {
  return Array.isArray(item.guardians) ? (item.guardians as Guardian[]) : [];
}

function asEnrollments(item: AdminRecord): Enrollment[] {
  return Array.isArray(item.enrollments) ? (item.enrollments as Enrollment[]) : [];
}

export function GuardianList({ item }: { item: AdminRecord }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const guardians = asGuardians(item);

  if (guardians.length === 0) {
    return <Text style={[styles.empty, { color: colors.muted }]}>{t("admin.relations.noGuardians")}</Text>;
  }

  return (
    <View style={styles.list}>
      {guardians.map((guardian) => {
        const meta = [guardian.phone, guardian.relationship]
          .filter(Boolean)
          .join(" · ");
        const flags = [
          guardian.is_primary ? t("admin.relations.primary") : null,
          guardian.is_emergency_contact ? t("admin.relations.emergency") : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <View
            key={guardian.id}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {guardian.name}
            </Text>
            {meta ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>{meta}</Text>
            ) : null}
            {flags ? (
              <Text style={{ color: colors.accent, fontSize: 12 }}>{flags}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function EnrollmentList({ item }: { item: AdminRecord }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const enrollments = asEnrollments(item);

  if (enrollments.length === 0) {
    return <Text style={[styles.empty, { color: colors.muted }]}>{t("admin.relations.noEnrollments")}</Text>;
  }

  return (
    <View style={styles.list}>
      {enrollments.map((enrollment) => {
        const placement = [
          enrollment.class_room?.name,
          enrollment.section?.name,
        ]
          .filter(Boolean)
          .join(" / ");
        const detail = [
          enrollment.academic_year?.name,
          enrollment.status,
          enrollment.roll_number ? t("admin.relations.roll", { number: enrollment.roll_number }) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <View
            key={enrollment.id}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {placement || t("common.unassigned")}
            </Text>
            {detail ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>{detail}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function guardianSection(): DetailSection {
  return {
    title: "Guardians",
    render: (item) => <GuardianList item={item} />,
  };
}

export function enrollmentSection(): DetailSection {
  return {
    title: "Enrollments",
    render: (item) => <EnrollmentList item={item} />,
  };
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  empty: {
    fontSize: 13,
  },
});
