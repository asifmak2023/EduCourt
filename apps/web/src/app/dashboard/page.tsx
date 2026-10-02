"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  humanize,
} from "@/lib/format";
import { visibleSections } from "@/lib/nav";
import type { CampusDashboard, PlatformOverview, TimetableSlot } from "@/lib/types";

type Mode = "platform" | "campus" | "teacher" | "general";

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

function greeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
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
              : "Unable to load your dashboard right now."
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
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={`${user.campus?.name ?? "All campuses"} - ${roleSummary(user)}`}
        actions={
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted ring-1 ring-border-secondary">
            {formatDate(new Date().toISOString())}
          </span>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? <Spinner label="Loading dashboard..." /> : null}

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

function roleSummary(user: AuthUser): string {
  return user.roles
    .slice(0, 2)
    .map((role) => humanize(role))
    .join(" / ");
}

function PlatformView({ overview }: { overview: PlatformOverview }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Institutions" value={formatNumber(overview.totals.institutions)} />
        <StatCard label="Campuses" value={formatNumber(overview.totals.campuses)} />
        <StatCard label="Students" value={formatNumber(overview.totals.students)} />
        <StatCard label="Staff" value={formatNumber(overview.totals.staff)} />
        <StatCard
          label="Active enrollments"
          value={formatNumber(overview.totals.active_enrollments)}
        />
      </section>

      <Card>
        <div className="flex items-center justify-between border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Institutions</h2>
          <Link
            href="/dashboard/institutions"
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            Manage
          </Link>
        </div>
        {overview.institutions.length === 0 ? (
          <EmptyState message="No institutions have been created yet." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Institutions">
                <Table.Header>
                  <Table.Column isRowHeader>Institution</Table.Column>
                  <Table.Column>Code</Table.Column>
                  <Table.Column className="text-right">Campuses</Table.Column>
                  <Table.Column className="text-right">Students</Table.Column>
                  <Table.Column className="text-right">Staff</Table.Column>
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
  const girls = dashboard.students_by_gender.find((item) => item.gender === "female")?.total ?? 0;
  const boys = dashboard.students_by_gender.find((item) => item.gender === "male")?.total ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active students"
          value={formatNumber(dashboard.students_active)}
          hint={`${boys} boys / ${girls} girls`}
        />
        <StatCard label="Staff employed" value={formatNumber(dashboard.staff_employed)} />
        <StatCard
          label="Outstanding fees"
          value={formatCurrency(dashboard.outstanding_fees)}
          tone="danger"
          hint={`${dashboard.unpaid_vouchers} unpaid vouchers`}
        />
        <StatCard
          label="Collected this month"
          value={formatCurrency(dashboard.fees_collected_this_month)}
          tone="positive"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Admissions pending" value={formatNumber(dashboard.admissions_pending)} tone="warning" />
        <StatCard label="Scholarships active" value={formatNumber(dashboard.scholarships_active)} />
        <StatCard label="Exams scheduled" value={formatNumber(dashboard.exams_scheduled)} />
        <StatCard label="Leave pending" value={formatNumber(dashboard.leave_pending)} tone="warning" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <QuickLinks
          title="Students & admissions"
          links={[
            { href: "/dashboard/students", label: "Students" },
            { href: "/dashboard/admissions", label: "Admissions" },
          ]}
        />
        <QuickLinks
          title="Finance"
          links={[
            { href: "/dashboard/fees", label: "Fee vouchers" },
            { href: "/dashboard/reports", label: "Reports" },
          ]}
        />
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Today at a glance</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Active enrollments" value={formatNumber(dashboard.enrollments_active)} />
            <Row label="Open conduct cases" value={formatNumber(dashboard.conduct_open)} />
            <Row label="Payroll draft runs" value={formatNumber(dashboard.payroll_draft_runs)} />
            <Row label="Upcoming events" value={formatNumber(dashboard.upcoming_events)} />
          </dl>
        </Card>
      </section>
    </div>
  );
}

function GeneralView({ user }: { user: AuthUser }) {
  const sections = visibleSections(user.permissions).filter(
    (section) => section.label !== "Overview"
  );

  if (sections.length === 0) {
    return <EmptyState message="There is nothing assigned to your account yet." />;
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
  const todaySlots = slots
    .filter((slot) => slot.day_of_week === today)
    .sort((a, b) => (a.period?.id ?? 0) - (b.period?.id ?? 0));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Periods this week" value={formatNumber(slots.length)} />
        <StatCard label="Periods today" value={formatNumber(todaySlots.length)} />
        <StatCard
          label="Two-factor"
          value={twoFactorEnabled ? "Enabled" : "Not enabled"}
          tone={twoFactorEnabled ? "positive" : "warning"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border-secondary px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Today&apos;s schedule</h2>
          </div>
          {todaySlots.length === 0 ? (
            <EmptyState message="You have no periods scheduled for today." />
          ) : (
            <ul className="divide-y divide-border-secondary">
              {todaySlots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-24 text-xs font-medium text-muted">
                    {slot.period?.starts_at ?? `Period ${slot.period?.id ?? ""}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {slot.subject?.name ?? "Subject"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {slot.class_room?.name ?? "Class"}
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
          title="My workspace"
          links={[
            { href: "/dashboard/students", label: "Students" },
            { href: "/dashboard/exams", label: "Exams & results" },
            { href: "/dashboard/timetable", label: "Timetable" },
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
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-muted transition hover:bg-surface-secondary hover:text-foreground"
            >
              {link.label}
              <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-90" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
