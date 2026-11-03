"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation, type MessageKey } from "@eis/i18n";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import { Icon } from "@/components/Icons";
import { AttendanceOverview } from "@/components/AttendanceOverview";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/lib/format";
import { visibleSections } from "@/lib/nav";
import { roleSummary } from "@/lib/roles";
import { useTr } from "@/lib/i18n";
import {
  ChartCard,
  ChartEmpty,
  DonutChart,
  EqualizerChart,
  GroupedBarsChart,
  ProportionBar,
  RadialGauge,
  SparkBars,
  TrendChart,
  useChartColors,
} from "@/components/Charts";
import type {
  Campus,
  CampusDashboard,
  InstitutionOverview,
  PlatformOverview,
  TimetableSlot,
} from "@/lib/types";

type Mode = "platform" | "institution" | "campus" | "teacher" | "general";

const STATUS_KEYS: Record<string, MessageKey> = {
  enquiry: "status.enquiry",
  applied: "status.applied",
  under_review: "status.underReview",
  approved: "status.approved",
  rejected: "status.rejected",
  enrolled: "status.enrolled",
  unpaid: "status.unpaid",
  partial: "status.partial",
  paid: "status.paid",
  void: "status.void",
};

const ADMISSION_FUNNEL = [
  "enquiry",
  "applied",
  "under_review",
  "approved",
  "enrolled",
] as const;

function compactCurrency(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function modeFor(user: AuthUser): Mode {
  if (user.roles.includes("platform_admin")) {
    return "platform";
  }

  if (user.roles.includes("institution_head")) {
    return "institution";
  }

  if (user.permissions.includes("report.view")) {
    return "campus";
  }

  if (user.permissions.includes("timetable.view")) {
    return "teacher";
  }

  return "general";
}

function todayIsoWeekday(): number {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
}

function greetingKey(): MessageKey {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "dashboard.greeting.morning";
  }

  if (hour < 17) {
    return "dashboard.greeting.afternoon";
  }

  return "dashboard.greeting.evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [campus, setCampus] = useState<CampusDashboard | null>(null);
  const [platform, setPlatform] = useState<PlatformOverview | null>(null);
  const [institution, setInstitution] = useState<InstitutionOverview | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusFilter, setCampusFilter] = useState<number | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mode = user ? modeFor(user) : null;
  const selectedCampus = campuses.find((item) => item.id === campusFilter) ?? null;

  useEffect(() => {
    if (!user || modeFor(user) !== "institution") {
      return;
    }

    let active = true;

    const loadCampuses = async () => {
      try {
        const response = await apiFetch<{ data: Campus[] }>(
          "/v1/campuses?per_page=200"
        );

        if (active) {
          setCampuses(response.data);
        }
      } catch {
        if (active) {
          setCampuses([]);
        }
      }
    };

    void loadCampuses();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const resolved = modeFor(user);

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (resolved === "platform") {
          const response = await apiFetch<{ data: PlatformOverview }>(
            "/v1/reports/platform-overview"
          );

          if (active) {
            setPlatform(response.data);
          }
        } else if (resolved === "institution") {
          if (campusFilter) {
            const response = await apiFetch<{ data: CampusDashboard }>(
              "/v1/reports/campus-dashboard",
              { campusId: campusFilter }
            );

            if (active) {
              setCampus(response.data);
              setInstitution(null);
            }
          } else {
            const response = await apiFetch<{ data: InstitutionOverview }>(
              "/v1/reports/institution-overview"
            );

            if (active) {
              setInstitution(response.data);
              setCampus(null);
            }
          }
        } else if (resolved === "campus") {
          const response = await apiFetch<{ data: CampusDashboard }>(
            "/v1/reports/campus-dashboard"
          );

          if (active) {
            setCampus(response.data);
          }
        } else if (resolved === "teacher") {
          const response = await apiFetch<{ data: TimetableSlot[] }>(
            "/v1/timetable/me"
          );

          if (active) {
            setSlots(response.data);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : "dashboard.loadError"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [user, campusFilter]);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t(greetingKey())}, \u2068${user.name.split(" ")[0]}\u2069`}
        description={`${selectedCampus?.name ?? user.campus?.name ?? t("dashboard.allCampuses")} - ${roleSummary(user.roles, t)}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {mode === "institution" && campuses.length > 0 ? (
              <select
                value={campusFilter ?? ""}
                onChange={(event) =>
                  setCampusFilter(
                    event.target.value === "" ? null : Number(event.target.value)
                  )
                }
                className="rounded-full border border-border-secondary bg-surface px-3 py-1.5 text-sm text-foreground"
              >
                <option value="">{t("dashboard.allCampuses")}</option>
                {campuses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : null}
            <span dir="ltr" className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted ring-1 ring-border-secondary">
              {formatDate(new Date().toISOString())}
            </span>
          </div>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? <Spinner label="dashboard.loading" /> : null}

      {!loading && mode === "platform" && platform ? (
        <PlatformView overview={platform} />
      ) : null}

      {!loading && mode === "institution" && institution && !campusFilter ? (
        <InstitutionView overview={institution} />
      ) : null}

      {!loading && (mode === "campus" || (mode === "institution" && campusFilter)) && campus ? (
        <CampusView dashboard={campus} />
      ) : null}

      {!loading && mode === "teacher" ? (
        <TeacherView slots={slots} twoFactorEnabled={user.two_factor_enabled} />
      ) : null}

      {!loading && mode === "general" ? <GeneralView user={user} /> : null}

      {!loading && mode !== "platform" && user.permissions.includes("attendance.view") ? (
        <AttendanceOverview campusId={mode === "institution" ? campusFilter : undefined} />
      ) : null}
    </div>
  );
}

function PlatformView({ overview }: { overview: PlatformOverview }) {
  const { t } = useTranslation();
  const colors = useChartColors();

  const compared = [...overview.institutions]
    .sort((a, b) => b.students - a.students)
    .slice(0, 8)
    .map((institution) => ({
      label: institution.code || institution.name,
      students: institution.students,
      staff: institution.staff,
    }));

  const distribution = compared.map((item) => ({
    label: item.label,
    value: item.students,
  }));

  const campusDistribution = [...overview.institutions]
    .sort((a, b) => b.campuses - a.campuses)
    .slice(0, 6)
    .map((institution) => ({
      label: institution.code || institution.name,
      value: institution.campuses,
    }));

  const coverage =
    overview.totals.institutions > 0
      ? Math.round(overview.totals.campuses / overview.totals.institutions)
      : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="dashboard.institutions"
          value={formatNumber(overview.totals.institutions)}
          icon={<Icon name="building" />}
        />
        <StatCard
          label="dashboard.campuses"
          value={formatNumber(overview.totals.campuses)}
          icon={<Icon name="grid" />}
        />
        <StatCard
          label="dashboard.students"
          value={formatNumber(overview.totals.students)}
          icon={<Icon name="users" />}
        />
        <StatCard
          label="dashboard.staff"
          value={formatNumber(overview.totals.staff)}
          icon={<Icon name="idCard" />}
        />
        <StatCard
          label="dashboard.activeEnrollments"
          value={formatNumber(overview.totals.active_enrollments)}
          icon={<Icon name="clipboard" />}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-12 xl:items-stretch">
        <ChartCard
          title="dashboard.institutionsCompare"
          description="dashboard.institutionsCompareHint"
          className="xl:col-span-8"
          action={
            <span className="lw-pill bg-surface-secondary text-muted">
              {t("dashboard.telemetry")}
            </span>
          }
        >
          <GroupedBarsChart
            data={compared}
            series={[
              { key: "students", label: t("dashboard.students"), color: colors["--accent"] },
              { key: "staff", label: t("dashboard.staff"), color: colors["--coral"] },
            ]}
            height={288}
          />
        </ChartCard>

        <div className="flex flex-col gap-3 xl:col-span-4">
          <TelemetryTile
            className="flex-1"
            title={t("dashboard.students")}
            value={formatNumber(overview.totals.students)}
            caption={t("dashboard.institutionsCompareHint")}
            data={distribution}
            accent={colors["--mint"]}
            footer={
              <div className="relative flex items-center justify-between gap-2 pt-3 text-[11px] text-white/55">
                <span>
                  {formatNumber(overview.totals.institutions)} {t("dashboard.institutions")}
                </span>
                <span className="font-semibold text-mint">
                  {formatNumber(overview.totals.active_enrollments)}{" "}
                  {t("dashboard.activeEnrollments")}
                </span>
              </div>
            }
          />

          <div className="lw-amber relative overflow-hidden rounded-3xl p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-white/25 blur-2xl"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-foreground/70">
                  {t("dashboard.campuses")}
                </p>
                <p className="lw-kpi-value mt-1 text-3xl text-amber-foreground">
                  {formatNumber(overview.totals.campuses)}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-foreground/70">
                  {t("dashboard.staffPerCampus")}
                </p>
              </div>
              <RadialGauge
                value={coverage}
                max={Math.max(coverage, 4)}
                label={`${coverage}`}
                color="#11141f"
                size={64}
              />
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <AmberMetric
                label={t("dashboard.students")}
                value={formatNumber(overview.totals.students)}
              />
              <AmberMetric
                label={t("dashboard.staff")}
                value={formatNumber(overview.totals.staff)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
        <ChartCard
          title="dashboard.campuses"
          description="dashboard.campusesPerInstitution"
          className="lg:col-span-7"
        >
          <SparkBars
            data={campusDistribution}
            formatValue={(value) => formatNumber(value)}
            color={colors["--accent"]}
          />
        </ChartCard>

        <Card className="flex flex-col justify-between p-6 lg:col-span-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {t("dashboard.overview")}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {t("dashboard.platformSummary")}
            </p>
          </div>
          <dl className="mt-5 space-y-2.5 text-sm">
            <Row
              label="dashboard.institutions"
              value={formatNumber(overview.totals.institutions)}
            />
            <Row
              label="dashboard.campuses"
              value={formatNumber(overview.totals.campuses)}
            />
            <Row
              label="dashboard.students"
              value={formatNumber(overview.totals.students)}
            />
            <Row
              label="dashboard.staff"
              value={formatNumber(overview.totals.staff)}
            />
            <Row
              label="dashboard.activeEnrollments"
              value={formatNumber(overview.totals.active_enrollments)}
            />
          </dl>
        </Card>
      </section>

      <Card>
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t("dashboard.institutions")}</h2>
          <Link
            href="/dashboard/institutions"
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            {t("common.manage")}
          </Link>
        </div>
        {overview.institutions.length === 0 ? (
          <EmptyState message="dashboard.noInstitutions" />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label={t("dashboard.institutions")}>
                <Table.Header>
                  <Table.Column isRowHeader>{t("dashboard.institution")}</Table.Column>
                  <Table.Column>{t("dashboard.code")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.campuses")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.students")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.staff")}</Table.Column>
                </Table.Header>
                <Table.Body>
                {overview.institutions.map((institution) => (
                  <Table.Row key={institution.id} className="hover:bg-surface-secondary" id={institution.id}>
                    <Table.Cell className="text-foreground">{institution.name}</Table.Cell>
                    <Table.Cell className="text-muted">{institution.code ?? "-"}</Table.Cell>
                    <Table.Cell className="text-right">{institution.campuses}</Table.Cell>
                    <Table.Cell className="text-right">{institution.students}</Table.Cell>
                    <Table.Cell className="text-right">{institution.staff}</Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function InstitutionView({ overview }: { overview: InstitutionOverview }) {
  const { t } = useTranslation();
  const colors = useChartColors();

  const compared = [...overview.campuses]
    .sort((a, b) => b.students - a.students)
    .slice(0, 8)
    .map((campus) => ({
      label: campus.code || campus.name,
      students: campus.students,
      staff: campus.staff,
    }));

  const collectionByCampus = [...overview.campuses]
    .sort((a, b) => b.fees_collected_this_month - a.fees_collected_this_month)
    .slice(0, 8)
    .map((campus) => ({
      label: campus.code || campus.name,
      value: campus.fees_collected_this_month,
    }));

  const outstandingByCampus = [...overview.campuses]
    .sort((a, b) => b.outstanding_fees - a.outstanding_fees)
    .slice(0, 6)
    .map((campus) => ({
      label: campus.code || campus.name,
      value: campus.outstanding_fees,
    }));

  const billed =
    overview.totals.fees_collected_this_month + overview.totals.outstanding_fees;
  const recoveryRate =
    billed > 0
      ? Math.round(
          (overview.totals.fees_collected_this_month / billed) * 100
        )
      : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="dashboard.campuses"
          value={formatNumber(overview.totals.campuses)}
          icon={<Icon name="building" />}
        />
        <StatCard
          label="dashboard.students"
          value={formatNumber(overview.totals.students)}
          icon={<Icon name="users" />}
        />
        <StatCard
          label="dashboard.staff"
          value={formatNumber(overview.totals.staff)}
          icon={<Icon name="idCard" />}
        />
        <StatCard
          label="dashboard.activeEnrollments"
          value={formatNumber(overview.totals.active_enrollments)}
          icon={<Icon name="clipboard" />}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-12 xl:items-stretch">
        <ChartCard
          title="dashboard.campusesCompare"
          description="dashboard.campusesCompareHint"
          className="xl:col-span-8"
          action={
            <span className="lw-pill bg-surface-secondary text-muted">
              {t("dashboard.telemetry")}
            </span>
          }
        >
          <GroupedBarsChart
            data={compared}
            series={[
              { key: "students", label: t("dashboard.students"), color: colors["--accent"] },
              { key: "staff", label: t("dashboard.staff"), color: colors["--coral"] },
            ]}
            height={288}
          />
        </ChartCard>

        <div className="flex flex-col gap-3 xl:col-span-4">
          <TelemetryTile
            className="flex-1"
            title={t("dashboard.collectedThisMonth")}
            value={formatCurrency(overview.totals.fees_collected_this_month)}
            caption={t("dashboard.campusCollectionsHint")}
            data={collectionByCampus}
            accent={colors["--mint"]}
            footer={
              <div className="relative flex items-center justify-between gap-2 pt-3 text-[11px] text-white/55">
                <span>
                  {formatNumber(overview.totals.unpaid_vouchers)}{" "}
                  {t("dashboard.unpaidVouchersShort")}
                </span>
                <Link
                  href="/dashboard/reports/financial"
                  className="font-semibold text-mint hover:underline"
                >
                  {t("dashboard.reports")}
                </Link>
              </div>
            }
          />

          <div className="lw-amber relative overflow-hidden rounded-3xl p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-white/25 blur-2xl"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-foreground/70">
                  {t("dashboard.feeRecovery")}
                </p>
                <p className="lw-kpi-value mt-1 text-3xl text-amber-foreground">
                  {recoveryRate}%
                </p>
                <p className="mt-1 text-xs font-medium text-amber-foreground/70">
                  {t("dashboard.feeRecoveryHint")}
                </p>
              </div>
              <RadialGauge
                value={recoveryRate}
                max={100}
                label={`${recoveryRate}%`}
                color="#11141f"
                size={64}
              />
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <AmberMetric
                label={t("dashboard.collected")}
                value={formatCurrency(overview.totals.fees_collected_this_month)}
              />
              <AmberMetric
                label={t("dashboard.outstandingFees")}
                value={formatCurrency(overview.totals.outstanding_fees)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
        <Card className="p-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {t("dashboard.outstandingFees")}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {t("dashboard.outstandingByCampus")}
              </p>
            </div>
            <span className="lw-pill bg-surface-secondary text-muted">
              {t("dashboard.overview")}
            </span>
          </div>
          <div className="mt-5">
            {outstandingByCampus.some((row) => row.value > 0) ? (
              <SparkBars
                data={outstandingByCampus}
                formatValue={(value) => formatCurrency(value)}
                color={colors["--danger"]}
              />
            ) : (
              <p className="py-8 text-center text-xs text-muted">
                {t("dashboard.noChartData")}
              </p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 lg:col-span-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {t("dashboard.campuses")}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {t("dashboard.institutionSummary")}
            </p>
          </div>
          <dl className="mt-5 space-y-2.5 text-sm">
            <Row
              label="dashboard.students"
              value={formatNumber(overview.totals.students)}
            />
            <Row
              label="dashboard.staff"
              value={formatNumber(overview.totals.staff)}
            />
            <Row
              label="dashboard.campuses"
              value={formatNumber(overview.totals.campuses)}
            />
            <Row
              label="dashboard.outstandingFees"
              value={formatCurrency(overview.totals.outstanding_fees)}
            />
          </dl>
        </Card>
      </section>

      <Card>
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t("dashboard.campuses")}</h2>
        </div>
        {overview.campuses.length === 0 ? (
          <EmptyState message="dashboard.noCampuses" />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label={t("dashboard.campuses")}>
                <Table.Header>
                  <Table.Column isRowHeader>{t("dashboard.campus")}</Table.Column>
                  <Table.Column>{t("dashboard.code")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.students")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.staff")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.outstandingFees")}</Table.Column>
                  <Table.Column className="text-right">{t("dashboard.collectedThisMonth")}</Table.Column>
                </Table.Header>
                <Table.Body>
                {overview.campuses.map((campus) => (
                  <Table.Row key={campus.id} className="hover:bg-surface-secondary" id={campus.id}>
                    <Table.Cell className="text-foreground">{campus.name}</Table.Cell>
                    <Table.Cell className="text-muted">{campus.code ?? "-"}</Table.Cell>
                    <Table.Cell className="text-right">{campus.students}</Table.Cell>
                    <Table.Cell className="text-right">{campus.staff}</Table.Cell>
                    <Table.Cell className="text-right">{formatCurrency(campus.outstanding_fees)}</Table.Cell>
                    <Table.Cell className="text-right">{formatCurrency(campus.fees_collected_this_month)}</Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CampusView({ dashboard }: { dashboard: CampusDashboard }) {
  const { t } = useTranslation();
  const colors = useChartColors();
  const girls = dashboard.students_by_gender.find((item) => item.gender === "female")?.total ?? 0;
  const boys = dashboard.students_by_gender.find((item) => item.gender === "male")?.total ?? 0;

  const collections = (dashboard.collections_by_month ?? []).map((month) => ({
    label: month.label,
    value: month.total,
  }));

  const admissionFunnel = ADMISSION_FUNNEL.map((status) => ({
    label: t(STATUS_KEYS[status]),
    value: dashboard.admissions_by_status?.[status] ?? 0,
  }));

  const admissionTotal = admissionFunnel.reduce(
    (sum, point) => sum + point.value,
    0
  );
  const collectedPeak = collections.reduce(
    (max, point) => Math.max(max, point.value),
    0
  );
  const latestCollection = collections.at(-1)?.value ?? 0;
  const billed = dashboard.fees_collected_this_month + dashboard.outstanding_fees;
  const recoveryRate = billed > 0
    ? Math.round((dashboard.fees_collected_this_month / billed) * 100)
    : 0;
  const collectionValues = collections.map((point) => point.value);
  const hasCollectionMovement = collectionValues.some((value) => value > 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Headline strip: the four numbers that frame the rest of the page. */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="dashboard.activeStudents"
          value={formatNumber(dashboard.students_active)}
          hint={t("dashboard.boysGirls", { boys, girls })}
          icon={<Icon name="users" />}
        />
        <StatCard
          label="dashboard.staffEmployed"
          value={formatNumber(dashboard.staff_employed)}
          hint={t("dashboard.activeEnrollments")}
          icon={<Icon name="idCard" />}
        />
        <StatCard
          label="dashboard.outstandingFees"
          value={formatCurrency(dashboard.outstanding_fees)}
          tone="danger"
          hint={t("dashboard.unpaidVouchers", { count: dashboard.unpaid_vouchers })}
          icon={<Icon name="receipt" />}
        />
        <StatCard
          label="dashboard.collectedThisMonth"
          value={formatCurrency(dashboard.fees_collected_this_month)}
          tone="positive"
          hint={
            latestCollection > 0
              ? t("dashboard.latestCollection", {
                  amount: formatCurrency(latestCollection),
                })
              : undefined
          }
          visual={
            <RadialGauge
              value={recoveryRate}
              max={100}
              label={`${recoveryRate}%`}
              color={colors["--mint"]}
            />
          }
        />
      </section>

      {/* Analytics anchor: hero collection trend paired with live telemetry. */}
      <section className="grid gap-3 xl:grid-cols-12 xl:items-stretch">
        <ChartCard
          title="dashboard.feeCollectionTrend"
          description="dashboard.collectionTrendHint"
          className="xl:col-span-8"
          action={
            <Link
              href="/dashboard/reports/financial"
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:text-foreground"
            >
              {t("dashboard.reports")}
              <Icon name="arrowUp" className="h-3 w-3 rotate-90" />
            </Link>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors["--accent"] }}
                  />
                  <span className="text-muted">{t("dashboard.collected")}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(dashboard.fees_collected_this_month)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors["--coral"] }}
                  />
                  <span className="text-muted">{t("dashboard.billedThisYear")}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(billed)}
                  </span>
                </span>
              </div>
              <span className="text-muted">
                {t("dashboard.peakCollection", {
                  amount: formatCurrency(collectedPeak),
                })}
              </span>
            </div>
          }
        >
          {hasCollectionMovement ? (
            <TrendChart
              data={collections}
              formatValue={compactCurrency}
              height={288}
            />
          ) : (
            <ChartEmpty
              title={t("dashboard.noMovement")}
              hint={t("dashboard.noMovementHint")}
            />
          )}
        </ChartCard>

        <div className="flex flex-col gap-3 xl:col-span-4">
          <TelemetryTile
            className="flex-1"
            title={t("dashboard.admissionsPipeline")}
            value={formatNumber(admissionTotal)}
            caption={t("dashboard.totalAdmissions")}
            data={admissionFunnel}
            accent={colors["--mint"]}
            footer={
              <div className="relative flex items-center justify-between gap-2 pt-3 text-[11px] text-white/55">
                <span>
                  {formatNumber(dashboard.admissions_pending)}{" "}
                  {t("dashboard.admissionsPending")}
                </span>
                <Link
                  href="/dashboard/admissions"
                  className="font-semibold text-mint hover:underline"
                >
                  {t("common.manage")}
                </Link>
              </div>
            }
          />

          {/* Amber capsule: the one warm surface on the page. */}
          <div className="lw-amber relative overflow-hidden rounded-3xl p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-white/25 blur-2xl"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-foreground/70">
                  {t("dashboard.feeRecovery")}
                </p>
                <p className="lw-kpi-value mt-1 text-3xl text-amber-foreground">
                  {recoveryRate}%
                </p>
                <p className="mt-1 text-xs font-medium text-amber-foreground/70">
                  {t("dashboard.feeRecoveryHint")}
                </p>
              </div>
              <RadialGauge
                value={recoveryRate}
                max={100}
                label={`${recoveryRate}%`}
                color="#11141f"
                size={64}
              />
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <AmberMetric
                label={t("dashboard.collected")}
                value={formatCurrency(dashboard.fees_collected_this_month)}
              />
              <AmberMetric
                label={t("dashboard.outstandingFees")}
                value={formatCurrency(dashboard.outstanding_fees)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Second analytics band: distribution charts share one row. */}
      <section className="grid gap-3 lg:grid-cols-3">
        <ChartCard title="dashboard.vouchersByStatus">
          <VoucherStatusDonut dashboard={dashboard} />
        </ChartCard>

        <ChartCard title="dashboard.studentsByGender">
          <div className="flex flex-1 flex-col justify-between gap-5">
            <ProportionBar
              data={[
                { label: t("gender.male"), value: boys, color: colors["--accent"] },
                { label: t("gender.female"), value: girls, color: colors["--coral"] },
              ]}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <MiniMetric
                label={t("dashboard.admissionsPending")}
                value={formatNumber(dashboard.admissions_pending)}
                tone="warning"
              />
              <MiniMetric
                label={t("dashboard.leavePending")}
                value={formatNumber(dashboard.leave_pending)}
                tone="warning"
              />
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="dashboard.operations"
          description="dashboard.operationsHint"
        >
          <ul className="divide-y divide-border-secondary">
            <OperationRow label="dashboard.activeEnrollments" value={dashboard.enrollments_active} />
            <OperationRow label="dashboard.scholarshipsActive" value={dashboard.scholarships_active} />
            <OperationRow label="dashboard.examsScheduled" value={dashboard.exams_scheduled} />
            <OperationRow label="dashboard.openConductCases" value={dashboard.conduct_open} />
            <OperationRow label="dashboard.payrollDraftRuns" value={dashboard.payroll_draft_runs} />
            <OperationRow label="dashboard.upcomingEvents" value={dashboard.upcoming_events} />
          </ul>
        </ChartCard>
      </section>

      <ShortcutStrip
        items={[
          { href: "/dashboard/students", label: "dashboard.students" },
          { href: "/dashboard/admissions", label: "dashboard.admissions" },
          { href: "/dashboard/fees", label: "dashboard.feeVouchers" },
          { href: "/dashboard/reports", label: "dashboard.reports" },
          { href: "/dashboard/exams", label: "navigation.exams" },
          { href: "/dashboard/timetable", label: "navigation.timetable" },
        ]}
      />
    </div>
  );
}

/** Slim metric row inside the amber capsule. */
function AmberMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-amber-foreground/10 px-3 py-2">
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-amber-foreground/60">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-amber-foreground">
        {value}
      </p>
    </div>
  );
}

/** Compact label/value row used by the operations card. */
function OperationRow({ label, value }: { label: string; value: number }) {
  const tr = useTr();

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
      <span className="truncate text-muted">{tr(label)}</span>
      <span className="shrink-0 font-semibold tabular-nums text-foreground">
        {formatNumber(value)}
      </span>
    </li>
  );
}

/** Single-row scrolling link strip that replaces the old quick-link cards. */
function ShortcutStrip({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const tr = useTr();

  return (
    <Card className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
          {tr("dashboard.shortcuts")}
        </span>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent-soft hover:text-accent-soft-foreground"
          >
            {tr(item.label)}
            <Icon name="arrowUp" className="h-3 w-3 rotate-90" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** Dark obsidian telemetry tile with a glowing equalizer ladder. */
function TelemetryTile({
  title,
  value,
  caption,
  data,
  accent,
  footer,
  className = "",
}: {
  title: string;
  value: string;
  caption?: string;
  data: { label: string; value: number }[];
  accent: string;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`lw-obsidian relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: "rgb(66 253 213 / 0.14)" }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-white/75">{title}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
            Live
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="lw-kpi-value text-4xl text-white">{value}</span>
          {caption ? (
            <span className="text-xs text-white/55">{caption}</span>
          ) : null}
        </div>
      </div>

      <div className="relative my-6">
        <EqualizerChart data={data} accent={accent} height={150} />
      </div>

      {footer}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "positive";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    positive: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className="rounded-2xl bg-surface-secondary px-3 py-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}

function VoucherStatusDonut({
  dashboard,
}: {
  dashboard: CampusDashboard;
}) {
  const { t } = useTranslation();
  const colors = useChartColors();

  const sliceColors: Record<string, string> = {
    unpaid: colors["--danger"],
    partial: colors["--warning"],
    paid: colors["--success"],
    void: colors["--muted"],
  };

  const slices = Object.entries(dashboard.vouchers_by_status ?? {})
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      label: STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status,
      value: count,
      color: sliceColors[status] ?? colors["--muted"],
    }))
    .sort((a, b) => b.value - a.value);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <DonutChart
      data={slices}
      centerValue={formatNumber(total)}
      centerLabel={t("dashboard.totalVouchers")}
    />
  );
}

function GeneralView({ user }: { user: AuthUser }) {
  const sections = visibleSections(user.permissions).filter(
    (section) => section.label !== "navigation.section.overview"
  );

  if (sections.length === 0) {
    return <EmptyState message="dashboard.noModulesAssigned" />;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <QuickLinks
          key={section.label}
          title={section.label}
          links={section.items.map((item) => ({
            href: item.href,
            label: item.label,
          }))}
        />
      ))}
    </section>
  );
}

function TeacherView({
  slots,
  twoFactorEnabled,
}: {
  slots: TimetableSlot[];
  twoFactorEnabled: boolean;
}) {
  const today = todayIsoWeekday();
  const { t } = useTranslation();
  const todaySlots = slots
    .filter((slot) => slot.day_of_week === today)
    .sort((a, b) => (a.period?.id ?? 0) - (b.period?.id ?? 0));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="dashboard.periodsThisWeek" value={formatNumber(slots.length)} />
        <StatCard label="dashboard.periodsToday" value={formatNumber(todaySlots.length)} />
        <StatCard
          label="dashboard.twoFactor"
          value={twoFactorEnabled ? t("dashboard.enabled") : t("dashboard.notEnabled")}
          tone={twoFactorEnabled ? "positive" : "warning"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border-secondary px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">{t("dashboard.todaysSchedule")}</h2>
          </div>
          {todaySlots.length === 0 ? (
            <EmptyState message="dashboard.noPeriodsToday" />
          ) : (
            <ul className="divide-y divide-border-secondary">
              {todaySlots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-24 text-xs font-medium text-muted">
                    {slot.period?.starts_at ?? t("dashboard.period", { id: slot.period?.id ?? "" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {slot.subject?.name ?? t("dashboard.subject")}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {slot.class_room?.name ?? t("dashboard.class")}
                      {slot.section?.name ? ` - ${slot.section.name}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-muted">
                    {slot.room?.name ?? "-"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <QuickLinks
          title="dashboard.myWorkspace"
          links={[
            { href: "/dashboard/students", label: "navigation.students" },
            { href: "/dashboard/exams", label: "navigation.exams" },
            { href: "/dashboard/timetable", label: "navigation.timetable" },
          ]}
        />
      </div>
    </div>
  );
}

function QuickLinks({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  const tr = useTr();

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground">{tr(title)}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between rounded-full px-3 py-2 text-sm text-muted transition hover:bg-surface-secondary hover:text-foreground"
            >
              {tr(link.label)}
              <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-90" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const tr = useTr();

  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{tr(label)}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
