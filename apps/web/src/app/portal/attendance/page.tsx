"use client";

import { useTranslation } from "@eis/i18n";
import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import { fetchAttendanceYear, formatDate } from "@/lib/portal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { ChartCard, DonutChart, useChartColors } from "@/components/Charts";

export default function PortalAttendancePage() {
  const { t } = useTranslation();
  const colors = useChartColors();
  const { activeStudentId, loading } = usePortal();
  const { data, loading: queryLoading, error } = usePortalQuery(
    activeStudentId,
    fetchAttendanceYear,
    !loading
  );

  const summary = data?.summary;
  const marked = summary?.marked ?? 0;
  const present = summary?.present ?? 0;
  const rate = marked > 0 ? Math.round((present / marked) * 100) : 0;

  const mix = [
    {
      label: t("portal.attendance.present"),
      value: summary?.present ?? 0,
      color: colors["--success"],
    },
    {
      label: t("portal.attendance.late"),
      value: summary?.late ?? 0,
      color: colors["--warning"],
    },
    {
      label: t("portal.attendance.absent"),
      value: summary?.absent ?? 0,
      color: colors["--danger"],
    },
    {
      label: t("portal.attendance.leave"),
      value: summary?.leave ?? 0,
      color: colors["--accent"],
    },
    {
      label: t("portal.attendance.excused"),
      value: summary?.excused ?? 0,
      color: colors["--muted"],
    },
  ].filter((slice) => slice.value > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="portal.attendance.title"
        description="portal.attendance.subtitle"
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading || queryLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard label="portal.attendance.present" value={summary?.present ?? 0} tone="positive" />
            <StatCard label="portal.attendance.late" value={summary?.late ?? 0} tone="warning" />
            <StatCard label="portal.attendance.absent" value={summary?.absent ?? 0} tone="danger" />
            <StatCard label="portal.attendance.leave" value={summary?.leave ?? 0} />
            <StatCard label="portal.attendance.excused" value={summary?.excused ?? 0} />
          </div>

          <div className="grid gap-3 xl:grid-cols-12">
            <ChartCard
              title="portal.attendance.mix"
              description="portal.attendance.subtitle"
              className="xl:col-span-4"
            >
              {mix.length > 0 ? (
                <DonutChart
                  data={mix}
                  centerValue={`${rate}%`}
                  centerLabel={t("portal.attendance.present")}
                />
              ) : (
                <EmptyState message="portal.attendance.empty" />
              )}
            </ChartCard>

            <div className="xl:col-span-8">
              {data && data.data.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="border-b border-border-secondary px-6 py-4">
                    <h2 className="text-sm font-semibold text-foreground">
                      {t("portal.attendance.records")}
                    </h2>
                  </div>
                  <div className="divide-y divide-border">
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
                  </div>
                </Card>
              ) : (
                <EmptyState message="portal.attendance.empty" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
