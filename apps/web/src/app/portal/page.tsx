"use client";

import Link from "next/link";
import { useTranslation } from "@eis/i18n";
import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import {
  fetchAttendance,
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

export default function PortalDashboardPage() {
  const { t } = useTranslation();
  const { activeStudent, activeStudentId, loading } = usePortal();
  const ready = !loading;

  const attendance = usePortalQuery(activeStudentId, fetchAttendance, ready);
  const results = usePortalQuery(activeStudentId, fetchResults, ready);
  const fees = usePortalQuery(activeStudentId, fetchFees, ready);

  const marked = attendance.data?.summary.marked ?? 0;
  const present = attendance.data?.summary.present ?? 0;
  const rate = marked > 0 ? Math.round((present / marked) * 100) : 0;

  const latest = results.data?.data?.[0] ?? null;
  const outstanding = fees.data?.totals?.outstanding ?? "0";

  const error = attendance.error ?? results.error ?? fees.error;

  return (
    <div className="space-y-6">
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

      {!ready || attendance.loading || results.loading || fees.loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="portal.dashboard.attendance"
              value={`${rate}%`}
              hint={`${present} / ${marked}`}
              tone={rate >= 75 ? "positive" : "warning"}
            />
            <StatCard
              label="portal.dashboard.latestResult"
              value={latest ? `${latest.percentage}%` : "-"}
              hint={latest?.grade ?? undefined}
              tone="default"
            />
            <StatCard
              label="portal.dashboard.outstanding"
              value={formatMoney(outstanding)}
              tone={Number(outstanding) > 0 ? "danger" : "positive"}
            />
          </div>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-foreground">
              {t("portal.dashboard.quickLinks")}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/portal/timetable", label: t("portal.nav.timetable") },
                { href: "/portal/attendance", label: t("portal.nav.attendance") },
                { href: "/portal/results", label: t("portal.nav.results") },
                { href: "/portal/fees", label: t("portal.nav.fees") },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-border-secondary px-4 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent-soft hover:text-accent-soft-foreground"
                >
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
