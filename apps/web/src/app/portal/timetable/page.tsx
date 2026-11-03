"use client";

import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import { useTr } from "@/lib/i18n";
import { fetchTimetable, type TimetableSlot } from "@/lib/portal";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";

const DAY_KEYS = [
  "portal.day.monday",
  "portal.day.tuesday",
  "portal.day.wednesday",
  "portal.day.thursday",
  "portal.day.friday",
  "portal.day.saturday",
  "portal.day.sunday",
];

export default function PortalTimetablePage() {
  const tr = useTr();
  const { activeStudentId, loading } = usePortal();
  const { data, loading: queryLoading, error } = usePortalQuery(
    activeStudentId,
    fetchTimetable,
    !loading
  );

  const grouped = new Map<number, TimetableSlot[]>();
  for (const slot of data ?? []) {
    const day = slot.day_of_week ?? 0;
    const list = grouped.get(day) ?? [];
    list.push(slot);
    grouped.set(day, list);
  }

  const days = Array.from(grouped.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      <PageHeader
        title="portal.timetable.title"
        description="portal.timetable.subtitle"
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading || queryLoading ? (
        <Spinner />
      ) : days.length === 0 ? (
        <EmptyState message="portal.timetable.empty" />
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Card key={day} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border-secondary bg-surface-tertiary px-5 py-3">
                <span className="lw-pill bg-accent-soft text-accent-soft-foreground">
                  {DAY_KEYS[day - 1] ? tr(DAY_KEYS[day - 1]) : day}
                </span>
                <span className="text-xs text-muted">
                  {(grouped.get(day) ?? []).length}
                </span>
              </div>
              <div className="divide-y divide-border-secondary">
                {(grouped.get(day) ?? []).map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm"
                  >
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-muted">
                      {slot.period?.starts_at && slot.period?.ends_at
                        ? `${slot.period.starts_at} - ${slot.period.ends_at}`
                        : (slot.period?.name ?? "-")}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                      {slot.subject?.name ?? "-"}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {slot.teacher?.name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-secondary px-2.5 py-1">
                          {slot.teacher.name}
                        </span>
                      ) : null}
                      {slot.room?.name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-secondary px-2.5 py-1">
                          {slot.room.name}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
