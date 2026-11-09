"use client";

import Link from "next/link";
import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import {
  attendanceCode,
  childName,
  classLabel,
  fetchAttendanceYear,
  fetchFees,
  fetchResults,
  fetchTimetable,
  currentEnrollment,
  formatRupees,
  gradeLetter,
  todaySlots,
} from "@/lib/portal";
import { Card, ErrorNotice, Skeleton } from "@/components/ui";
import { DayDial } from "@/components/DayDial";
import {
  IconArrowRight,
  IconReceipt,
  IconTrend,
} from "@/components/Icons";
import type { AttendanceRecord } from "@/lib/types";

function greeting(): { en: string; ur: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { en: "Good morning", ur: "صبح بخیر" };
  if (hour < 17) return { en: "Good afternoon", ur: "السلام علیکم" };
  return { en: "Good evening", ur: "شب بخیر" };
}

function attendanceMarkTone(status: string): string {
  switch (status) {
    case "present":
      return "text-[var(--success)]";
    case "late":
      return "bg-[color-mix(in_srgb,var(--marigold)_28%,transparent)] text-[var(--marigold-ink)] rounded";
    case "absent":
      return "text-[var(--redpen)]";
    default:
      return "text-muted";
  }
}

export default function PortalDashboardPage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;

  const attendance = usePortalQuery(activeChildId, fetchAttendanceYear, ready);
  const results = usePortalQuery(activeChildId, fetchResults, ready);
  const fees = usePortalQuery(activeChildId, fetchFees, ready);
  const timetable = usePortalQuery(activeChildId, fetchTimetable, ready);

  const now = new Date();
  const summary = attendance.data?.summary;
  const marked = summary?.marked ?? 0;
  const overallRate = marked > 0 ? Math.round(((summary?.present ?? 0) / marked) * 100) : 0;

  const outstanding = Number(fees.data?.totals.outstanding ?? 0);
  const latestResult = results.data?.data?.[0] ?? null;

  const slots = timetable.data ?? [];
  const todays = todaySlots(slots, now);

  const name = childName(activeChild);
  const firstName = name.split(" ")[0] || "there";
  const school = activeChild ? classLabel(activeChild) : "";
  const enrollment = currentEnrollment(activeChild);
  const rollNo = enrollment?.roll_number;
  const admissionNo = activeChild?.admission_no ?? "";

  const greet = greeting();

  // Recent marks for the mini-register: newest 14 attendance records.
  const recent: AttendanceRecord[] = [...(attendance.data?.data ?? [])]
    .sort((a, b) => (a.attendance_date < b.attendance_date ? 1 : -1))
    .slice(0, 14);

  // "Still to come" — today's remaining periods.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = todays.filter((slot) => {
    const [h, m] = (slot.period?.starts_at ?? "00:00").split(":").map(Number);
    return h * 60 + m >= nowMinutes;
  });

  return (
    <div className="space-y-5">
      {/* ===== Chalkboard hero ===== */}
      <section className="chalk-board relative overflow-hidden rounded-lg p-5 text-board-ink sm:p-7">
        <div className="grid items-center gap-6 sm:grid-cols-[1.35fr_auto]">
          <div className="order-2 sm:order-1">
            <p className="font-urdu text-lg text-board-dim">{greet.ur}</p>
            <p className="mt-1 text-sm text-board-dim">
              {now.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {school ? ` · ${school}` : ""}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-5xl font-bold uppercase leading-[0.9] tracking-tight text-board-ink sm:text-6xl">
              {firstName}
            </h1>
            <p className="mt-3 max-w-md text-sm text-board-dim">
              {nowMinutes < 480
                ? `School hasn't started yet. First class ${
                    todays[0]?.period?.starts_at?.slice(0, 5) ?? "soon"
                  }.`
                : upcoming.length > 0
                  ? `Here is what's left of ${firstName}'s day at school.`
                  : `The school day is complete. Well done, ${firstName}.`}
            </p>

            {upcoming.length > 0 ? (
              <div className="mt-5 max-w-md">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-board-dim/80">
                  Still to come
                </p>
                <ul className="space-y-2">
                  {upcoming.slice(0, 3).map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2 last:border-0"
                    >
                      <span className="numeric text-xs text-board-dim">
                        {slot.period?.starts_at?.slice(0, 5)}
                      </span>
                      <span className="font-[family-name:var(--font-display)] flex-1 text-sm font-semibold uppercase tracking-wide text-board-ink">
                        {slot.subject?.name ?? "Free"}
                      </span>
                      <span className="text-right text-xs text-board-dim">
                        {slot.teacher?.name ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="order-1 flex justify-center sm:order-2">
            {timetable.loading ? (
              <div className="grid place-items-center" style={{ width: 260, height: 260 }}>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-marigold border-t-transparent" />
              </div>
            ) : (
              <DayDial slots={slots} now={now} />
            )}
          </div>
        </div>
      </section>

      {/* ===== Summary cards ===== */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Attendance */}
        <Card className="flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
              Attendance
            </h2>
            <Link
              href="/portal/attendance"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Register
            </Link>
          </div>
          {attendance.loading ? (
            <Skeleton className="h-20" />
          ) : attendance.error ? (
            <ErrorNotice message={attendance.error} />
          ) : (
            <>
              <p className="font-[family-name:var(--font-display)] text-4xl font-bold leading-none text-foreground">
                {overallRate}
                <span className="text-lg text-muted">%</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                this year · {summary?.absent ?? 0} absent, {summary?.late ?? 0} late
              </p>
              <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 border-t border-hairline pt-3">
                {recent.map((record) => (
                  <span
                    key={record.id}
                    title={`${record.attendance_date} · ${record.status}`}
                    className={`numeric grid min-w-[1.35rem] place-items-center px-1 py-0.5 text-xs font-bold ${attendanceMarkTone(
                      record.status
                    )}`}
                  >
                    {attendanceCode(record.status)}
                  </span>
                ))}
                {recent.length === 0 ? (
                  <span className="text-xs text-muted">No records yet.</span>
                ) : null}
              </div>
            </>
          )}
        </Card>

        {/* Fees */}
        <Card className="flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
              Fees
            </h2>
            {outstanding > 0 ? (
              <span className="rotate-[-4deg] rounded border-2 border-[var(--redpen)] px-1.5 py-0.5 font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-wider text-[var(--redpen)]">
                Due
              </span>
            ) : null}
          </div>
          {fees.loading ? (
            <Skeleton className="h-20" />
          ) : fees.error ? (
            <ErrorNotice message={fees.error} />
          ) : (
            <>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-foreground">
                Rs {formatRupees(outstanding)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {outstanding > 0 ? "outstanding balance" : "all fees settled"}
              </p>
              <div className="mt-auto border-t border-dashed border-rule pt-3">
                <Link
                  href="/portal/fees"
                  className="flex items-center justify-between text-sm font-semibold text-foreground"
                >
                  <span>
                    {fees.data?.data?.length ?? 0} challan
                    {(fees.data?.data?.length ?? 0) === 1 ? "" : "s"} this session
                  </span>
                  <IconArrowRight width={16} height={16} className="text-muted" />
                </Link>
              </div>
            </>
          )}
        </Card>

        {/* Latest result */}
        <Card className="flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
              {latestResult?.exam?.name
                ? latestResult.exam.name.replace(/\d{4}.*/, "").trim() || "Result"
                : "Results"}
            </h2>
            <Link
              href="/portal/results"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Full
            </Link>
          </div>
          {results.loading ? (
            <Skeleton className="h-20" />
          ) : results.error ? (
            <ErrorNotice message={results.error} />
          ) : !latestResult ? (
            <p className="py-4 text-sm text-muted">No results published yet.</p>
          ) : (
            <div className="flex items-start gap-3">
              <span className="grid h-14 w-14 shrink-0 -rotate-6 place-items-center rounded-full border-[2.5px] border-[var(--redpen)] font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--redpen)]">
                {latestResult.grade ?? gradeLetter(latestResult.percentage)}
              </span>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-foreground">
                  {Math.round(latestResult.percentage)}%
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--success)]">
                  <IconTrend width={13} height={13} />
                  {latestResult.failed_subjects === 0
                    ? "Passed every subject"
                    : `${latestResult.failed_subjects} subject(s) to improve`}
                </p>
              </div>
            </div>
          )}
          {latestResult ? (
            <div className="mt-auto border-t border-dashed border-rule pt-3">
              <Link
                href="/portal/results"
                className="flex items-center justify-between text-sm font-semibold text-foreground"
              >
                <span>Full report card</span>
                <IconArrowRight width={16} height={16} className="text-muted" />
              </Link>
            </div>
          ) : null}
        </Card>
      </div>

      {/* ===== Footer strip: identity ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-4 py-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <IconReceipt width={14} height={14} />
          {admissionNo || "—"}
          {rollNo ? ` · Roll no. ${rollNo}` : ""}
        </span>
        {school ? <span>{school}</span> : null}
      </div>
    </div>
  );
}
