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
    <div className="space-y-6">
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
        <div className="space-y-4">
          {days.map((day) => (
            <Card key={day} className="overflow-hidden">
              <div className="border-b border-border bg-surface-tertiary px-6 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {DAY_KEYS[day - 1] ? tr(DAY_KEYS[day - 1]) : day}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {(grouped.get(day) ?? []).map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-wrap items-center gap-3 px-6 py-3 text-sm"
                  >
                    <span className="w-32 shrink-0 text-xs font-medium text-muted">
                      {slot.period?.starts_at && slot.period?.ends_at
                        ? `${slot.period.starts_at} - ${slot.period.ends_at}`
                        : (slot.period?.name ?? "-")}
                    </span>
                    <span className="flex-1 font-medium text-foreground">
                      {slot.subject?.name ?? "-"}
                    </span>
                    <span className="text-xs text-muted">
                      {slot.teacher?.name ?? ""}
                      {slot.room?.name ? ` · ${slot.room.name}` : ""}
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
