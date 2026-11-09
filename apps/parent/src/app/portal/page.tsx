"use client";

import Link from "next/link";
import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import {
  attendanceRate,
  childName,
  classLabel,
  fetchAttendanceYear,
  fetchFees,
  fetchResults,
  fetchTimetable,
  formatDate,
  formatMoney,
  voucherTone,
  DAY_NAMES,
} from "@/lib/portal";
import {
  Bar,
  Card,
  EmptyState,
  ErrorNotice,
  Pill,
  ProgressRing,
  SectionHeading,
  Skeleton,
  StatTile,
} from "@/components/ui";
import {
  IconArrowRight,
  IconAward,
  IconCalendar,
  IconCheck,
  IconClock,
  IconWallet,
} from "@/components/Icons";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function PortalDashboardPage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;

  const attendance = usePortalQuery(activeChildId, fetchAttendanceYear, ready);
  const results = usePortalQuery(activeChildId, fetchResults, ready);
  const fees = usePortalQuery(activeChildId, fetchFees, ready);
  const timetable = usePortalQuery(activeChildId, fetchTimetable, ready);

  const summary = attendance.data?.summary;
  const rate = attendanceRate(summary);

  const outstanding = Number(fees.data?.totals.outstanding ?? 0);
  const billed = Number(fees.data?.totals.billed ?? 0);
  const paid = Number(fees.data?.totals.paid ?? 0);

  const latestResult = results.data?.data?.[0] ?? null;
  const paidRatio = billed > 0 ? Math.round((paid / billed) * 100) : 100;

  const today = new Date();
  const todaySlots = (timetable.data ?? [])
    .filter((slot) => slot.day_of_week === today.getDay())
    .sort(
      (a, b) =>
        (a.period?.id ?? 0) - (b.period?.id ?? 0)
    );

  const name = childName(activeChild);

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-xl2)] border bg-[#12142a] p-5 text-white shadow-[var(--shadow-lift)] sm:p-7">
        <div
          className="rounded-[inherit]"
          style={{
            background:
              "radial-gradient(30rem 18rem at 95% -20%, rgba(124,116,255,0.5), transparent 60%)",
          }}
        >
          <p className="text-sm text-white/60">
            {greeting()}, {name.split(" ")[0] || "there"}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
            Here is {classLabel(activeChild) ? `${name.split(" ")[0]}'s day` : "your child's day"} at a glance
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {today.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {classLabel(activeChild) ? ` - ${classLabel(activeChild)}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Attendance"
          value={attendance.loading ? "-" : `${rate}%`}
          hint={
            summary && summary.marked > 0
              ? `${summary.present} of ${summary.marked} days present`
              : "No records yet"
          }
          tone={rate >= 85 ? "success" : rate >= 70 ? "warning" : "danger"}
          icon={<IconCheck width={16} height={16} />}
        />
        <StatTile
          label="Outstanding"
          value={fees.loading ? "-" : formatMoney(outstanding)}
          hint={outstanding > 0 ? "Fees due" : "All settled"}
          tone={outstanding > 0 ? "warning" : "success"}
          icon={<IconWallet width={16} height={16} />}
        />
        <StatTile
          label="Latest result"
          value={
            results.loading
              ? "-"
              : latestResult
                ? `${Math.round(latestResult.percentage)}%`
                : "-"
          }
          hint={
            latestResult?.exam?.name
              ? latestResult.exam.name
              : "No results posted"
          }
          tone="brand"
          icon={<IconAward width={16} height={16} />}
        />
        <StatTile
          label="Today's classes"
          value={timetable.loading ? "-" : String(todaySlots.length)}
          hint={DAY_NAMES[today.getDay()]}
          tone="brand"
          icon={<IconClock width={16} height={16} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionHeading title="Attendance" subtitle="Last 12 months" />
          {attendance.loading ? (
            <Skeleton className="h-52" />
          ) : attendance.error ? (
            <ErrorNotice message={attendance.error} />
          ) : (
            <div className="flex items-center gap-5">
              <ProgressRing value={rate} size={116} stroke={11} />
              <div className="flex-1 space-y-2.5 text-sm">
                <Row label="Present" value={summary?.present ?? 0} tone="success" />
                <Row label="Late" value={summary?.late ?? 0} tone="warning" />
                <Row label="Absent" value={summary?.absent ?? 0} tone="danger" />
                <Row label="Leave" value={(summary?.leave ?? 0) + (summary?.excused ?? 0)} tone="muted" />
              </div>
            </div>
          )}
          <Link
            href="/portal/attendance"
            className="mt-5 flex items-center justify-between rounded-2xl bg-panel-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-brand-soft"
          >
            View attendance history
            <IconArrowRight width={16} height={16} />
          </Link>
        </Card>

        <Card className="lg:col-span-3">
          <SectionHeading
            title={`Today's timetable`}
            subtitle={DAY_NAMES[today.getDay()]}
            action={
              <Link
                href="/portal/timetable"
                className="text-sm font-semibold text-brand hover:underline"
              >
                Full week
              </Link>
            }
          />
          {timetable.loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
          ) : todaySlots.length === 0 ? (
            <EmptyState
              title="No classes today"
              message="Enjoy the break. Your full timetable is one tap away."
              icon={<IconCalendar width={22} height={22} />}
            />
          ) : (
            <ul className="space-y-2">
              {todaySlots.slice(0, 5).map((slot) => (
                <li
                  key={slot.id}
                  className="flex items-center gap-3 rounded-2xl border bg-panel px-3.5 py-2.5"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-soft py-1 text-brand">
                    <span className="text-[10px] font-semibold uppercase">
                      {slot.period?.name?.split(" ")[0] ?? "Period"}
                    </span>
                    <span className="numeric text-xs font-bold">
                      {slot.period?.starts_at?.slice(0, 5) ?? ""}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {slot.subject?.name ?? "Free"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {[slot.teacher?.name, slot.room?.name]
                        .filter(Boolean)
                        .join(" - ") || "No teacher assigned"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeading
            title="Fees"
            subtitle={outstanding > 0 ? "Amount still due" : "All settled"}
            action={
              <Link href="/portal/fees" className="text-sm font-semibold text-brand hover:underline">
                Details
              </Link>
            }
          />
          {fees.loading ? (
            <Skeleton className="h-28" />
          ) : fees.error ? (
            <ErrorNotice message={fees.error} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Outstanding
                  </p>
                  <p className="numeric font-[family-name:var(--font-display)] text-2xl font-bold">
                    {formatMoney(outstanding)}
                  </p>
                </div>
                <Pill tone={outstanding > 0 ? "warning" : "success"}>
                  {outstanding > 0 ? "Payment due" : "Paid up"}
                </Pill>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Paid {formatMoney(paid)}</span>
                  <span>Billed {formatMoney(billed)}</span>
                </div>
                <Bar value={paidRatio} tone={paidRatio >= 100 ? "success" : "warning"} />
              </div>
              {fees.data?.data?.length ? (
                <ul className="divide-y divide-[var(--hairline)] rounded-2xl border">
                  {fees.data.data.slice(0, 3).map((voucher) => (
                    <li
                      key={voucher.id}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {voucher.voucher_no}
                        </span>
                        <span className="block text-xs text-muted">
                          Due {formatDate(voucher.due_date)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="numeric block font-semibold">
                          {formatMoney(voucher.balance)}
                        </span>
                        <Pill tone={voucherTone(voucher.status)}>{voucher.status}</Pill>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeading
            title="Latest result"
            subtitle={latestResult?.exam?.name ?? "No exams yet"}
            action={
              <Link href="/portal/results" className="text-sm font-semibold text-brand hover:underline">
                All results
              </Link>
            }
          />
          {results.loading ? (
            <Skeleton className="h-28" />
          ) : results.error ? (
            <ErrorNotice message={results.error} />
          ) : !latestResult ? (
            <EmptyState
              title="No results yet"
              message="Results appear here as soon as your school publishes them."
              icon={<IconAward width={22} height={22} />}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={latestResult.percentage}
                  size={92}
                  stroke={9}
                  label={
                    <div>
                      <span className="numeric block font-[family-name:var(--font-display)] text-xl font-bold">
                        {Math.round(latestResult.percentage)}%
                      </span>
                      <span className="block text-[10px] text-muted">
                        {latestResult.grade ?? "-"}
                      </span>
                    </div>
                  }
                />
                <div className="flex-1 space-y-1 text-sm">
                  <p className="text-muted">
                    {latestResult.total_obtained} of {latestResult.total_max} marks
                  </p>
                  <Pill tone={latestResult.failed_subjects === 0 ? "success" : "danger"}>
                    {latestResult.failed_subjects === 0 ? "Passed" : `${latestResult.failed_subjects} failed`}
                  </Pill>
                  {latestResult.exam?.starts_on ? (
                    <p className="text-xs text-muted">
                      {formatDate(latestResult.exam.starts_on)}
                    </p>
                  ) : null}
                </div>
              </div>
              <ul className="divide-y divide-[var(--hairline)] rounded-2xl border">
                {latestResult.subjects.slice(0, 4).map((subject) => (
                  <li
                    key={subject.exam_paper_id}
                    className="flex items-center justify-between px-3.5 py-2 text-sm"
                  >
                    <span className="truncate">{subject.subject ?? "Subject"}</span>
                    <span className="numeric font-semibold">
                      {subject.marks_obtained ?? "-"}
                      <span className="text-muted">/{subject.max_marks}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  const dot: Record<string, string> = {
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
    muted: "bg-muted",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted">
        <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
        {label}
      </span>
      <span className="numeric font-semibold text-foreground">{value}</span>
    </div>
  );
}
