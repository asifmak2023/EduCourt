import { useCallback } from "react";
import { useTranslation, type MessageKey } from "@eis/i18n";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  apiFetch,
  type AuthUser,
  type CampusDashboard,
  type MonthlyTotal,
  type StudentSummary,
} from "../lib/api";
import { useCampusId } from "../lib/campus";
import { formatMoney } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { Screen } from "../components/Screen";
import { Avatar } from "../components/Avatar";
import {
  Card,
  EmptyState,
  ErrorText,
  GhostButton,
  Metric,
  SectionLabel,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

const ADMISSION_FUNNEL = [
  "enquiry",
  "applied",
  "under_review",
  "approved",
  "enrolled",
  "rejected",
] as const;

const ADMISSION_LABELS: Record<string, MessageKey> = {
  enquiry: "status.enquiry",
  applied: "status.applied",
  under_review: "status.underReview",
  approved: "status.approved",
  enrolled: "status.enrolled",
  rejected: "status.rejected",
};

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

function HorizontalBars({
  data,
  formatValue,
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
}) {
  const { colors } = useTheme();
  const max = data.reduce((peak, point) => Math.max(peak, point.value), 0);

  return (
    <View style={styles.bars}>
      {data.map((point) => {
        const ratio = max > 0 ? point.value / max : 0;

        return (
          <View key={point.label} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.muted }]} numberOfLines={1}>
              {point.label}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(ratio * 100, point.value > 0 ? 4 : 0)}%`,
                    backgroundColor: point.color ?? colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: colors.foreground }]} numberOfLines={1}>
              {formatValue ? formatValue(point.value) : point.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ProportionBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const { colors } = useTheme();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return <EmptyState message="-" />;
  }

  return (
    <View style={{ marginTop: 12 }}>
      <View style={[styles.proportionTrack, { backgroundColor: colors.surfaceSecondary }]}>
        {segments.map((segment) => (
          <View
            key={segment.label}
            style={{
              flex: segment.value,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {segment.label} {segment.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function reportPermission(user: AuthUser): boolean {
  return user.permissions.some((permission) => permission.startsWith("report."));
}

export function DashboardScreen({
  user,
  students,
}: {
  user: AuthUser;
  students: StudentSummary[];
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const campusId = useCampusId();
  const canViewReports = reportPermission(user);

  const loader = useCallback(async () => {
    const response = await apiFetch<{ data: CampusDashboard }>(
      "/v1/reports/campus-dashboard",
      { campusId }
    );
    return response.data;
  }, [campusId]);

  const { data, loading, error, reload } = useAsync<CampusDashboard>(
    canViewReports ? loader : null,
    [canViewReports, campusId]
  );

  const modules = Array.from(
    new Set(user.permissions.map((permission) => permission.split(".")[0]))
  ).sort();

  const collections: BarDatum[] = (data?.collections_by_month ?? []).map(
    (month: MonthlyTotal) => ({
      label: month.label,
      value: month.total,
    })
  );
  const hasCollections = collections.some((point) => point.value > 0);

  const gender = data?.students_by_gender ?? [];
  const girls = gender.find((item) => item.gender === "female")?.total ?? 0;
  const boys = gender.find((item) => item.gender === "male")?.total ?? 0;
  const hasGender = girls + boys > 0;

  const funnel: BarDatum[] = ADMISSION_FUNNEL.map((status) => ({
    label: t(ADMISSION_LABELS[status]),
    value: data?.admissions_by_status?.[status] ?? 0,
    color: colors.accent,
  }));
  const hasFunnel = funnel.some((point) => point.value > 0);

  const showReports = canViewReports;

  return (
    <Screen
      refreshing={loading}
      onRefresh={canViewReports ? reload : undefined}
    >
      <Card>
        <SectionLabel>{t("dashboard.signedInAs")}</SectionLabel>
        <View style={styles.identity}>
          <Avatar name={user.name} photoUrl={user.photo_url} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.value, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{user.email}</Text>
          </View>
        </View>
      </Card>

      {showReports ? (
        loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : error ? (
          <Card>
            <ErrorText message={error} />
            <GhostButton label={t("common.retry")} onPress={reload} />
          </Card>
        ) : data ? (
          <>
            <View style={styles.metricsRow}>
              {data.students_active !== undefined ? (
                <Metric label={t("dashboard.activeStudents")} value={data.students_active} />
              ) : null}
              {data.staff_employed !== undefined ? (
                <Metric label={t("dashboard.staffEmployed")} value={data.staff_employed} />
              ) : null}
              {data.outstanding_fees !== undefined ? (
                <Metric
                  label={t("dashboard.outstandingFees")}
                  value={formatMoney(data.outstanding_fees)}
                  tone={colors.danger}
                />
              ) : null}
            </View>

            {data.collections_by_month ? (
              <Card>
                <SectionLabel>{t("dashboard.feeCollectionTrend")}</SectionLabel>
                <Text style={[styles.chartHint, { color: colors.muted }]}>
                  {t("dashboard.collectionTrendHint")}
                </Text>
                {hasCollections ? (
                  <HorizontalBars data={collections} formatValue={formatMoney} />
                ) : (
                  <EmptyState message={t("dashboard.noMovement")} />
                )}
              </Card>
            ) : null}

            {data.students_by_gender ? (
              <Card>
                <SectionLabel>{t("dashboard.studentsByGender")}</SectionLabel>
                {hasGender ? (
                  <ProportionBar
                    segments={[
                      { label: t("gender.male"), value: boys, color: colors.accent },
                      {
                        label: t("gender.female"),
                        value: girls,
                        color: colors.success,
                      },
                    ]}
                  />
                ) : (
                  <EmptyState message={t("dashboard.noMovement")} />
                )}
              </Card>
            ) : null}

            {data.admissions_by_status ? (
              <Card>
                <SectionLabel>{t("dashboard.admissionsPipeline")}</SectionLabel>
                {hasFunnel ? (
                  <HorizontalBars data={funnel} />
                ) : (
                  <EmptyState message={t("dashboard.noMovement")} />
                )}
              </Card>
            ) : null}
          </>
        ) : null
      ) : null}

      {students.length > 0 ? (
        <Card>
          <SectionLabel>
            {students.length > 1 ? t("dashboard.yourChildren") : t("dashboard.student")}
          </SectionLabel>
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
        <SectionLabel>{t("dashboard.roles")}</SectionLabel>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {user.roles.join(", ") || "-"}
        </Text>
      </Card>

      <Card>
        <SectionLabel>{t("dashboard.accessibleModules")}</SectionLabel>
        {modules.length > 0 ? (
          <Text style={[styles.modules, { color: colors.foreground }]}>
            {modules.join(", ")}
          </Text>
        ) : (
          <EmptyState message={t("dashboard.noModules")} />
        )}
      </Card>

      <View style={styles.metricsRow}>
        <Metric label={t("dashboard.roles")} value={user.roles.length} />
        <Metric label={t("dashboard.modules")} value={modules.length} />
        <Metric
          label={
            students.length > 1 ? t("dashboard.children") : t("dashboard.studentRecords")
          }
          value={students.length}
        />
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
  chartHint: {
    marginTop: 6,
    fontSize: 12,
  },
  bars: {
    marginTop: 14,
    gap: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    width: 72,
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  barValue: {
    minWidth: 48,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
  },
  proportionTrack: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
