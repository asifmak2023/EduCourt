"use client";

import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import { fetchAttendance, formatDate } from "@/lib/portal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";

export default function PortalAttendancePage() {
  const { activeStudentId, loading } = usePortal();
  const { data, loading: queryLoading, error } = usePortalQuery(
    activeStudentId,
    fetchAttendance,
    !loading
  );

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="portal.attendance.title"
        description="portal.attendance.subtitle"
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading || queryLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="portal.attendance.present" value={summary?.present ?? 0} tone="positive" />
            <StatCard label="portal.attendance.late" value={summary?.late ?? 0} tone="warning" />
            <StatCard label="portal.attendance.absent" value={summary?.absent ?? 0} tone="danger" />
            <StatCard label="portal.attendance.leave" value={summary?.leave ?? 0} />
            <StatCard label="portal.attendance.excused" value={summary?.excused ?? 0} />
          </div>

          {data && data.data.length > 0 ? (
            <Card className="divide-y divide-border">
              {data.data.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(record.attendance_date)}
                    </p>
                    {record.remarks ? (
                      <p className="text-xs text-muted">{record.remarks}</p>
                    ) : null}
                  </div>
                  <Badge value={record.status_label ?? record.status} />
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState message="portal.attendance.empty" />
          )}
        </>
      )}
    </div>
  );
}
