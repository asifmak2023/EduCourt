"use client";

import { useMemo } from "react";
import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import {
  attendanceRate,
  attendanceTone,
  classLabel,
  fetchAttendanceYear,
  formatDate,
} from "@/lib/portal";
import {
  Card,
  EmptyState,
  ErrorNotice,
  Pill,
  ProgressRing,
  SectionHeading,
  Skeleton,
} from "@/components/ui";
import { IconCheck } from "@/components/Icons";

export default function AttendancePage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(
    activeChildId,
    fetchAttendanceYear,
    ready
  );

  const summary = data?.summary;
  const rate = attendanceRate(summary);

  const months = useMemo(() => {
    const groups = new Map<string, { present: number; absent: number; late: number; total: number }>();
    for (const record of data?.data ?? []) {
      const key = record.attendance_date.slice(0, 7);
      const entry = groups.get(key) ?? { present: 0, absent: 0, late: 0, total: 0 };
      entry.total += 1;
      if (record.status === "present") entry.present += 1;
      else if (record.status === "absent") entry.absent += 1;
      else if (record.status === "late") entry.late += 1;
      groups.set(key, entry);
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, value]) => ({ key, ...value }));
  }, [data]);

  const records = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Attendance
        </h1>
        <p className="text-sm text-muted">
          Daily record{classLabel(activeChild) ? ` - ${classLabel(activeChild)}` : ""}
        </p>
      </div>

      {busy ? (
        <Skeleton className="h-44" />
      ) : error ? (
        <ErrorNotice message={error} />
      ) : (
        <Card>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ProgressRing value={rate} size={132} stroke={12} />
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Present" value={summary?.present ?? 0} tone="success" />
              <Metric label="Late" value={summary?.late ?? 0} tone="warning" />
              <Metric label="Absent" value={summary?.absent ?? 0} tone="danger" />
              <Metric
                label="On leave"
                value={(summary?.leave ?? 0) + (summary?.excused ?? 0)}
                tone="muted"
              />
            </div>
          </div>
        </Card>
      )}

      {months.length > 0 ? (
        <Card>
          <SectionHeading title="Monthly breakdown" subtitle="Attendance over the year" />
          <div className="space-y-3">
            {months.map((month) => {
              const presentPct = month.total > 0 ? (month.present / month.total) * 100 : 0;
              return (
                <div key={month.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      {new Date(`${month.key}-01`).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="numeric text-muted">
                      {month.present}/{month.total}
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-panel-muted">
                    <div
                      className="h-full bg-[var(--success)]"
                      style={{ width: `${presentPct}%` }}
                    />
                    <div
                      className="h-full bg-[var(--warning)]"
                      style={{ width: `${month.total > 0 ? (month.late / month.total) * 100 : 0}%` }}
                    />
                    <div
                      className="h-full bg-[var(--danger)]"
                      style={{ width: `${month.total > 0 ? (month.absent / month.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card>
        <SectionHeading title="Recent days" subtitle="Most recent first" />
        {busy ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No attendance recorded yet"
            message="Once your school marks attendance, it shows up here."
            icon={<IconCheck width={22} height={22} />}
          />
        ) : (
          <ul className="divide-y divide-[var(--hairline)]">
            {records.slice(0, 40).map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {formatDate(record.attendance_date)}
                  </p>
                  {record.remarks ? (
                    <p className="truncate text-xs text-muted">{record.remarks}</p>
                  ) : null}
                </div>
                <Pill tone={attendanceTone(record.status)}>
                  {record.status_label ?? record.status}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  const color: Record<string, string> = {
    success: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    danger: "text-[var(--danger)]",
    muted: "text-muted",
  };

  return (
    <div className="rounded-2xl bg-panel-muted px-3 py-2.5 text-center">
      <p className={`numeric font-[family-name:var(--font-display)] text-xl font-bold ${color[tone]}`}>
        {value}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  );
}
