"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation, type MessageKey } from "@eis/i18n";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import { Icon } from "@/components/Icons";
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
  BarStatChart,
  ChartCard,
  DonutChart,
  GroupedBarsChart,
  TrendChart,
  useChartColors,
} from "@/components/Charts";
import type {
  CampusDashboard,
  PlatformOverview,
  TimetableSlot,
} from "@/lib/types";

type Mode = "platform" | "campus" | "teacher" | "general";

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
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mode = user ? modeFor(user) : null;

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
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t(greetingKey())}، \u2068${user.name.split(" ")[0]}\u2069`}
        description={`${user.campus?.name ?? t("dashboard.allCampuses")} - ${roleSummary(user.roles, t)}`}
        actions={
          <span dir="ltr" className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted ring-1 ring-border-secondary">
            {formatDate(new Date().toISOString())}
          </span>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? <Spinner label="dashboard.loading" /> : null}

      {!loading && mode === "platform" && platform ? (
        <PlatformView overview={platform} />
      ) : null}

      {!loading && mode === "campus" && campus ? (
        <CampusView dashboard={campus} />
      ) : null}

      {!loading && mode === "teacher" ? (
        <TeacherView slots={slots} twoFactorEnabled={user.two_factor_enabled} />
      ) : null}

      {!loading && mode === "general" ? <GeneralView user={user} /> : null}
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="dashboard.institutions" value={formatNumber(overview.totals.institutions)} />
        <StatCard label="dashboard.campuses" value={formatNumber(overview.totals.campuses)} />
        <StatCard label="dashboard.students" value={formatNumber(overview.totals.students)} />
        <StatCard label="dashboard.staff" value={formatNumber(overview.totals.staff)} />
        <StatCard
          label="dashboard.activeEnrollments"
          value={formatNumber(overview.totals.active_enrollments)}
        />
      </section>

      <ChartCard
        title="dashboard.institutionsCompare"
        description="dashboard.institutionsCompareHint"
      >
        <GroupedBarsChart
          data={compared}
          series={[
            { key: "students", label: t("dashboard.students"), color: colors["--accent"] },
            { key: "staff", label: t("dashboard.staff"), color: colors["--success"] },
          ]}
        />
      </ChartCard>

      <Card>
        <div className="flex items-center justify-between border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.institutions")}</h2>
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

function CampusView({ dashboard }: { dashboard: CampusDashboard }) {
  const { t } = useTranslation();
  const colors = useChartColors();
  const girls = dashboard.students_by_gender.find((item) => item.gender === "female")?.total ?? 0;
  const boys = dashboard.students_by_gender.find((item) => item.gender === "male")?.total ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="dashboard.activeStudents"
          value={formatNumber(dashboard.students_active)}
          hint={t("dashboard.boysGirls", { boys, girls })}
        />
        <StatCard label="dashboard.staffEmployed" value={formatNumber(dashboard.staff_employed)} />
        <StatCard
          label="dashboard.outstandingFees"
          value={formatCurrency(dashboard.outstanding_fees)}
          tone="danger"
          hint={t("dashboard.unpaidVouchers", { count: dashboard.unpaid_vouchers })}
        />
        <StatCard
          label="dashboard.collectedThisMonth"
          value={formatCurrency(dashboard.fees_collected_this_month)}
          tone="positive"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="dashboard.admissionsPending" value={formatNumber(dashboard.admissions_pending)} tone="warning" />
        <StatCard label="dashboard.scholarshipsActive" value={formatNumber(dashboard.scholarships_active)} />
        <StatCard label="dashboard.examsScheduled" value={formatNumber(dashboard.exams_scheduled)} />
        <StatCard label="dashboard.leavePending" value={formatNumber(dashboard.leave_pending)} tone="warning" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="dashboard.feeCollectionTrend"
          description="dashboard.collectionTrendHint"
          className="lg:col-span-2"
        >
          <TrendChart
            data={(dashboard.collections_by_month ?? []).map((month) => ({
              label: month.label,
              value: month.total,
            }))}
            formatValue={compactCurrency}
          />
        </ChartCard>

        <ChartCard title="dashboard.studentsByGender">
          <DonutChart
            data={[
              { label: t("gender.male"), value: boys, color: colors["--accent"] },
              { label: t("gender.female"), value: girls, color: colors["--danger"] },
            ]}
          />
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="dashboard.vouchersByStatus">
          <VoucherStatusDonut dashboard={dashboard} />
        </ChartCard>

        <ChartCard title="dashboard.admissionsPipeline" className="lg:col-span-2">
          <BarStatChart
            data={ADMISSION_FUNNEL.map((status) => ({
              label: t(STATUS_KEYS[status]),
              value: dashboard.admissions_by_status?.[status] ?? 0,
            }))}
          />
        </ChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <QuickLinks
          title="dashboard.studentsAdmissions"
          links={[
            { href: "/dashboard/students", label: "dashboard.students" },
            { href: "/dashboard/admissions", label: "dashboard.admissions" },
          ]}
        />
        <QuickLinks
          title="dashboard.finance"
          links={[
            { href: "/dashboard/fees", label: "dashboard.feeVouchers" },
            { href: "/dashboard/reports", label: "dashboard.reports" },
          ]}
        />
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.todayAtGlance")}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="dashboard.activeEnrollments" value={formatNumber(dashboard.enrollments_active)} />
            <Row label="dashboard.openConductCases" value={formatNumber(dashboard.conduct_open)} />
            <Row label="dashboard.payrollDraftRuns" value={formatNumber(dashboard.payroll_draft_runs)} />
            <Row label="dashboard.upcomingEvents" value={formatNumber(dashboard.upcoming_events)} />
          </dl>
        </Card>
      </section>
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
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-muted transition hover:bg-surface-secondary hover:text-foreground"
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
