"use client";

import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import {
  classLabel,
  fetchTimetable,
  periodShort,
} from "@/lib/portal";
import { Card, EmptyState, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { IconCalendar } from "@/components/Icons";
import type { Period, TimetableSlot } from "@/lib/types";

const WEEK = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

export default function TimetablePage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(activeChildId, fetchTimetable, ready);

  const slots = data ?? [];
  const today = new Date().getDay();

  // Collect periods in start-time order.
  const periodMap = new Map<number, Period>();
  slots.forEach((slot) => {
    if (slot.period) {
      periodMap.set(slot.period.id, slot.period);
    }
  });
  const periods = [...periodMap.values()].sort((a, b) =>
    (a.starts_at ?? "").localeCompare(b.starts_at ?? "")
  );

  const cell = (day: number, periodId: number): TimetableSlot | undefined =>
    slots.find((slot) => slot.day_of_week === day && slot.period?.id === periodId);

  const weekLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <PageTitle
        eyebrow={classLabel(activeChild) ? `${classLabel(activeChild)} · Week of ${weekLabel}` : `Week of ${weekLabel}`}
        title="Timetable"
      />

      {busy ? (
        <Card>
          <Skeleton className="h-96" />
        </Card>
      ) : error ? (
        <ErrorNotice message={error} />
      ) : periods.length === 0 ? (
        <EmptyState
          title="No timetable yet"
          message="Your timetable will appear here once the school publishes it."
          icon={<IconCalendar width={22} height={22} />}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="sticky left-0 z-10 w-16 bg-card px-3 py-3 text-left font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wide text-muted">
                    Day
                  </th>
                  {periods.map((period) => (
                    <th key={period.id} className="px-2 py-3 text-center">
                      <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground">
                        {periodShort(period.name)}
                      </p>
                      <p className="numeric text-[10px] text-muted">
                        {period.starts_at?.slice(0, 5)}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEK.map((row) => {
                  const isToday = row.day === today;
                  return (
                    <tr
                      key={row.day}
                      className={`border-b border-hairline last:border-0 ${
                        isToday ? "bg-[color-mix(in_srgb,var(--marigold)_8%,transparent)]" : ""
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-3">
                        <span
                          className={`font-[family-name:var(--font-display)] text-sm font-bold uppercase ${
                            isToday ? "text-[var(--marigold-ink)]" : "text-foreground"
                          }`}
                        >
                          {row.label}
                        </span>
                      </td>
                      {periods.map((period) => {
                        const slot = cell(row.day, period.id);
                        if (!slot) {
                          return (
                            <td key={period.id} className="px-2 py-3 text-center text-muted/40">
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={period.id} className="px-2 py-2 align-top">
                            <div
                              className={`rounded-md px-2 py-1.5 ${
                                isToday
                                  ? "bg-[color-mix(in_srgb,var(--marigold)_16%,transparent)]"
                                  : ""
                              }`}
                            >
                              <p className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase leading-tight text-foreground">
                                {slot.subject?.name ?? "Free"}
                              </p>
                              {slot.teacher?.name ? (
                                <p className="mt-0.5 truncate text-[11px] text-muted">
                                  {slot.teacher.name}
                                </p>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
