"use client";

import Link from "next/link";
import { useTranslation } from "@eis/i18n";
import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import {
  fetchAttendanceYear,
  fetchFees,
  fetchResults,
  formatMoney,
  studentName,
} from "@/lib/portal";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import {
  ChartCard,
  ChartEmpty,
  DonutChart,
  ProportionBar,
  RadialGauge,
  useChartColors,
} from "@/components/Charts";
import { Icon } from "@/components/Icons";
import type { NavIcon } from "@/lib/nav";

export default function PortalDashboardPage() {
  const { t } = useTranslation();
  const { activeStudent, activeStudentId, loading } = usePortal();
  const colors = useChartColors();
  const ready = !loading;

  const attendance = usePortalQuery(activeStudentId, fetchAttendanceYear, ready);
  const results = usePortalQuery(activeStudentId, fetchResults, ready);
  const fees = usePortalQuery(activeStudentId, fetchFees, ready);

  const summary = attendance.data?.summary;
  const marked = summary?.marked ?? 0;
  const present = summary?.present ?? 0;
  const rate = marked > 0 ? Math.round((present / marked) * 100) : 0;

  const attendanceMix = [
    {
      label: t("portal.attendance.present"),
      value: summary?.present ?? 0,
      color: colors["--success"],
    },
    {
      label: t("portal.attendance.late"),
      value: summary?.late ?? 0,
      color: colors["--warning"],
    },
    {
      label: t("portal.attendance.absent"),
      value: summary?.absent ?? 0,
      color: colors["--danger"],
    },
    {
      label: t("portal.attendance.leave"),
      value: summary?.leave ?? 0,
      color: colors["--accent"],
    },
    {
      label: t("portal.attendance.excused"),
      value: summary?.excused ?? 0,
      color: colors["--muted"],
    },
  ].filter((slice) => slice.value > 0);

  const latest = results.data?.data?.[0] ?? null;
  const outstanding = Number(fees.data?.totals?.outstanding ?? 0);
  const billed = Number(fees.data?.totals?.billed ?? 0);
  const paid = Number(fees.data?.totals?.paid ?? 0);
  const recovery = billed > 0 ? Math.round((paid / billed) * 100) : 0;

  const feeMix = billed > 0
    ? [
        {
          label: t("portal.fees.paid"),
          value: paid,
          color: colors["--success"],
        },
        {
          label: t("portal.fees.outstanding"),
          value: Math.max(billed - paid, 0),
          color: colors["--danger"],
        },
      ]
    : [];

  const error = attendance.error ?? results.error ?? fees.error;
  const busy = !ready || attendance.loading || results.loading || fees.loading;

  const quickLinks: { href: string; label: string; icon: NavIcon }[] = [
    { href: "/portal/timetable", label: t("portal.nav.timetable"), icon: "calendar" },
    { href: "/portal/attendance", label: t("portal.nav.attendance"), icon: "check" },
    { href: "/portal/results", label: t("portal.nav.results"), icon: "award" },
    { href: "/portal/fees", label: t("portal.nav.fees"), icon: "wallet" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="portal.dashboard.title"
        description="portal.dashboard.subtitle"
      />

      {activeStudent ? (
        <p className="text-sm text-muted">
          {t("portal.child")}:{" "}
          <span className="font-medium text-foreground">
            {studentName(activeStudent)}
          </span>
          {activeStudent.admission_no ? ` (${activeStudent.admission_no})` : ""}
        </p>
      ) : null}

      {error ? <ErrorNotice message={error} /> : null}

      {busy ? (
        <Spinner />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="portal.dashboard.attendance"
              value={`${rate}%`}
              hint={`${present} / ${marked}`}
              tone={rate >= 75 ? "positive" : "warning"}
              visual={
                <RadialGauge
                  value={rate}
                  max={100}
                  label={`${rate}%`}
                  color={colors["--mint"]}
                />
              }
            />
            <StatCard
              label="portal.dashboard.latestResult"
              value={latest ? `${latest.percentage}%` : "-"}
              hint={latest?.grade ?? undefined}
              icon={<Icon name="award" />}
            />
            <StatCard
              label="portal.fees.paid"
              value={formatMoney(fees.data?.totals?.paid)}
              tone="positive"
              icon={<Icon name="wallet" />}
            />
            <StatCard
              label="portal.dashboard.outstanding"
              value={formatMoney(outstanding)}
              tone={outstanding > 0 ? "danger" : "positive"}
              hint={
                billed > 0
                  ? t("portal.fees.recovery", { percent: String(recovery) })
                  : undefined
              }
              icon={<Icon name="receipt" />}
            />
          </section>

          <section className="grid gap-3 xl:grid-cols-12">
            <ChartCard
              title="portal.attendance.mix"
              description="portal.attendance.subtitle"
              className="xl:col-span-5"
            >
              {attendanceMix.length > 0 ? (
                <DonutChart
                  data={attendanceMix}
                  centerValue={`${rate}%`}
                  centerLabel={t("portal.dashboard.attendance")}
                />
              ) : (
                <ChartEmpty
                  title={t("common.nothingHere")}
                  hint={t("portal.attendance.empty")}
                />
              )}
            </ChartCard>

            <ChartCard
              title="portal.fees.title"
              description="portal.fees.subtitle"
              className="xl:col-span-7"
              action={
                <Link
                  href="/portal/fees"
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:text-foreground"
                >
                  {t("portal.nav.fees")}
                  <Icon name="arrowUp" className="h-3 w-3 rotate-90" />
                </Link>
              }
            >
              {feeMix.length > 0 ? (
                <div className="space-y-6 pt-2">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniMetric
                      label={t("portal.fees.billed")}
                      value={formatMoney(fees.data?.totals?.billed)}
                    />
                    <MiniMetric
                      label={t("portal.fees.paid")}
                      value={formatMoney(fees.data?.totals?.paid)}
                      tone="positive"
                    />
                    <MiniMetric
                      label={t("portal.fees.outstanding")}
                      value={formatMoney(outstanding)}
                      tone={outstanding > 0 ? "danger" : "positive"}
                    />
                  </div>
                  <ProportionBar
                    data={feeMix}
                    formatValue={(value) => formatMoney(value)}
                  />
                </div>
              ) : (
                <ChartEmpty
                  title={t("common.nothingHere")}
                  hint={t("portal.fees.empty")}
                />
              )}
            </ChartCard>
          </section>

          <Card className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                {t("portal.dashboard.quickLinks")}
              </span>
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent-soft hover:text-accent-soft-foreground"
                >
                  <Icon name={link.icon} className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
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
  tone?: "default" | "positive" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    positive: "text-success",
    danger: "text-danger",
  };

  return (
    <div className="rounded-2xl bg-surface-secondary px-3 py-2.5">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={`mt-1 text-base font-bold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}
