"use client";

import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import {
  attendanceCode,
  classLabel,
  fetchAttendanceYear,
  formatDateLong,
} from "@/lib/portal";
import { Card, EmptyState, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { IconClipboard } from "@/components/Icons";
import type { AttendanceRecord } from "@/lib/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function markClass(status: string): string {
  switch (status) {
    case "present":
      return "text-[var(--success)]";
    case "late":
      return "rounded bg-[color-mix(in_srgb,var(--marigold)_30%,transparent)] text-[var(--marigold-ink)]";
    case "absent":
      return "text-[var(--redpen)]";
    default:
      return "text-muted";
  }
}

function LegendChip({
  code,
  label,
  count,
  tone,
}: {
  code: string;
  label: string;
  count: number;
  tone: "present" | "late" | "absent" | "leave";
}) {
  const toneCls =
    tone === "present"
      ? "text-[var(--success)]"
      : tone === "late"
        ? "bg-[color-mix(in_srgb,var(--marigold)_30%,transparent)] text-[var(--marigold-ink)]"
        : tone === "absent"
          ? "text-[var(--redpen)]"
          : "text-muted";
  return (
    <div className="flex items-center gap-2 border-l border-hairline pl-3 first:border-0 first:pl-0">
      <span className={`grid h-7 min-w-7 place-items-center rounded px-1 font-[family-name:var(--font-display)] text-sm font-bold ${toneCls}`}>
        {code}
      </span>
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-none text-foreground">
          {count}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(
    activeChildId,
    fetchAttendanceYear,
    ready
  );

  const summary = data?.summary;
  const records = data?.data ?? [];
  const marked = summary?.marked ?? 0;
  const rate = marked > 0 ? Math.round(((summary?.present ?? 0) / marked) * 100) : 0;

  // Group records by year-month, and index by date for the heatmap.
  const byDate = new Map<string, AttendanceRecord>();
  records.forEach((record) => byDate.set(record.attendance_date, record));

  const monthKeys: Array<{ key: string; year: number; month: number }> = [];
  const seen = new Set<string>();
  records.forEach((record) => {
    const d = new Date(record.attendance_date);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      monthKeys.push({ key, year: d.getFullYear(), month: d.getMonth() });
    }
  });
  monthKeys.sort((a, b) =>
    a.year === b.year ? b.month - a.month : b.year - a.year
  );

  const absences = records
    .filter((r) => r.status === "absent")
    .sort((a, b) => (a.attendance_date < b.attendance_date ? 1 : -1))
    .slice(0, 6);

  function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  return (
    <div>
      <PageTitle
        eyebrow={
          classLabel(activeChild)
            ? `Last 12 months · ${classLabel(activeChild)}`
            : "Last 12 months"
        }
        title="Attendance"
      />

      {busy ? (
        <Card>
          <Skeleton className="h-96" />
        </Card>
      ) : error ? (
        <ErrorNotice message={error} />
      ) : (
        <div className="space-y-5">
          {/* headline + legend */}
          <Card>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="font-[family-name:var(--font-display)] text-5xl font-bold leading-none text-[var(--success)]">
                  {rate}%
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                  in school · {marked} days marked
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <LegendChip code="P" label="Present" count={summary?.present ?? 0} tone="present" />
                <LegendChip code="L" label="Late" count={summary?.late ?? 0} tone="late" />
                <LegendChip code="A" label="Absent" count={summary?.absent ?? 0} tone="absent" />
                <LegendChip
                  code="LV"
                  label="On leave"
                  count={(summary?.leave ?? 0) + (summary?.excused ?? 0)}
                  tone="leave"
                />
              </div>
            </div>
          </Card>

          {/* register heatmap */}
          <Card padded={false} className="overflow-hidden">
            <div className="border-b border-hairline px-4 py-3 sm:px-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                Register
              </h2>
              <p className="text-xs text-muted">Every marked day, newest month first</p>
            </div>
            {monthKeys.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No attendance records"
                  message="Attendance appears here once the school starts marking it."
                  icon={<IconClipboard width={22} height={22} />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[720px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-rule">
                      <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-semibold text-muted">
                        Month
                      </th>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <th key={day} className="numeric px-1 py-2 text-center font-medium text-muted/70">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthKeys.map(({ key, year, month }) => {
                      const total = daysInMonth(year, month);
                      return (
                        <tr key={key} className="border-b border-hairline last:border-0">
                          <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2 font-[family-name:var(--font-display)] text-sm font-semibold text-foreground">
                            {MONTHS[month]} {String(year).slice(2)}
                          </td>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                            if (day > total) {
                              return <td key={day} className="px-1 py-2 text-center" />;
                            }
                            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const record = byDate.get(iso);
                            if (!record) {
                              return (
                                <td key={day} className="px-1 py-2 text-center text-muted/25">
                                  ·
                                </td>
                              );
                            }
                            return (
                              <td key={day} className="px-1 py-2 text-center">
                                <span
                                  title={`${formatDateLong(record.attendance_date)} · ${record.status}`}
                                  className={`numeric inline-grid min-w-[1.3rem] place-items-center px-0.5 py-0.5 font-bold ${markClass(
                                    record.status
                                  )}`}
                                >
                                  {attendanceCode(record.status)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* recent absences */}
          {absences.length > 0 ? (
            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-hairline px-4 py-3 sm:px-5">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                  Recent absences
                </h2>
              </div>
              <ul className="divide-y divide-hairline">
                {absences.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <span className="flex items-center gap-3">
                      <span className="grid h-7 min-w-7 place-items-center rounded font-[family-name:var(--font-display)] text-sm font-bold text-[var(--redpen)]">
                        A
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatDateLong(record.attendance_date)}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {record.remarks || "No note sent"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
