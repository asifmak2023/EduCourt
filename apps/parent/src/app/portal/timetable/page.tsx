"use client";

import { useMemo, useState } from "react";
import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import { classLabel, DAY_NAMES, fetchTimetable } from "@/lib/portal";
import type { TimetableSlot } from "@/lib/types";
import { Card, EmptyState, ErrorNotice, Skeleton } from "@/components/ui";
import { IconCalendar, IconClock } from "@/components/Icons";

const WEEK = [1, 2, 3, 4, 5, 6];

export default function TimetablePage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(activeChildId, fetchTimetable, ready);

  const today = new Date().getDay();
  const [activeDay, setActiveDay] = useState<number>(
    WEEK.includes(today) ? today : 1
  );

  const byDay = useMemo(() => {
    const map = new Map<number, TimetableSlot[]>();
    for (const day of WEEK) {
      map.set(day, []);
    }
    for (const slot of data ?? []) {
      const list = map.get(slot.day_of_week);
      if (list) {
        list.push(slot);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.period?.id ?? 0) - (b.period?.id ?? 0));
    }
    return map;
  }, [data]);

  const daySlots = byDay.get(activeDay) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Timetable
        </h1>
        <p className="text-sm text-muted">
          Weekly schedule{classLabel(activeChild) ? ` - ${classLabel(activeChild)}` : ""}
        </p>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {WEEK.map((day) => {
          const active = day === activeDay;
          const isToday = day === today;
          const count = byDay.get(day)?.length ?? 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={`relative flex min-w-[4.5rem] flex-col items-center rounded-2xl border px-4 py-2.5 transition ${
                active
                  ? "border-transparent bg-brand text-brand-foreground shadow-[var(--shadow-soft)]"
                  : "bg-panel text-muted hover:border-brand/40"
              }`}
            >
              <span className="text-xs font-semibold">{DAY_NAMES[day].slice(0, 3)}</span>
              <span className="numeric mt-0.5 text-sm font-bold">{count}</span>
              {isToday && !active ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
              ) : null}
            </button>
          );
        })}
      </div>

      {busy ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorNotice message={error} />
      ) : daySlots.length === 0 ? (
        <EmptyState
          title={`No classes on ${DAY_NAMES[activeDay]}`}
          message="There is nothing scheduled for this day."
          icon={<IconCalendar width={22} height={22} />}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-[var(--hairline)]">
            {daySlots.map((slot) => (
              <li key={slot.id} className="flex items-stretch gap-4 px-4 py-3.5 sm:px-5">
                <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-soft py-2 text-brand">
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {slot.period?.name?.split(" ")[0] ?? "Period"}
                  </span>
                  <span className="numeric text-sm font-bold">
                    {slot.period?.starts_at?.slice(0, 5) ?? "--"}
                  </span>
                  <span className="numeric text-[10px] text-brand/60">
                    {slot.period?.ends_at?.slice(0, 5) ?? ""}
                  </span>
                </div>
                <div className="min-w-0 flex-1 self-center">
                  <p className="truncate text-sm font-bold text-foreground">
                    {slot.subject?.name ?? "Free period"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    {slot.teacher?.name ? (
                      <span className="inline-flex items-center gap-1">
                        <IconClock width={12} height={12} />
                        {slot.teacher.name}
                      </span>
                    ) : null}
                    {slot.room?.name ? <span>Room {slot.room.name}</span> : null}
                    {slot.subject?.code ? <span>{slot.subject.code}</span> : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
