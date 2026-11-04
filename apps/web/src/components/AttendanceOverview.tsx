"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import {
  ChartCard,
  ChartEmpty,
  DonutChart,
  GroupedBarsChart,
  useChartColors,
} from "@/components/Charts";
import { Card, ErrorNotice, Spinner } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import type { AttendanceReport } from "@/lib/types";

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceOverview({ campusId }: { campusId?: number | null }) {
  const colors = useChartColors();
  const tr = useTr();
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams({ from: monthStart(), to: today() });

      try {
        const response = await apiFetch<{ data: AttendanceReport }>(
          `/v1/attendance/students/report?${query.toString()}`,
          { signal: controller.signal, campusId }
        );

        if (active) {
          setReport(response.data);
        }
      } catch (err: unknown) {
        if (
          active &&
          !(err instanceof DOMException && err.name === "AbortError")
        ) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load attendance."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [campusId]);

  const totals = report?.totals;
  const classes = report?.classes ?? [];
  const marked = totals?.total ?? 0;
  const present = totals?.present ?? 0;
  const leave = totals?.leave ?? 0;
  const absent = totals?.absent ?? 0;
  const presentRate = marked > 0 ? Math.round((present / marked) * 100) : 0;

  const split = [
    { label: tr("dashboard.present"), value: present, color: colors["--success"] },
    { label: tr("dashboard.leave"), value: leave, color: colors["--warning"] },
    { label: tr("dashboard.absent"), value: absent, color: colors["--danger"] },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {tr("dashboard.attendanceThisMonth")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {tr("dashboard.attendanceHint")}
          </p>
        </div>
        <Link
          href="/dashboard/attendance/report"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:text-foreground"
        >
          {tr("dashboard.viewFullReport")}
        </Link>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : report ? (
        <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
          <Card className="p-6 lg:col-span-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {tr("dashboard.attendanceSplit")}
              </h3>
              <span className="lw-pill bg-surface-secondary text-muted">
                {presentRate}%
              </span>
            </div>
            <DonutChart
              emptyAsGraph
              data={split}
              centerValue={formatNumber(marked)}
              centerLabel={tr("dashboard.studentsMarked")}
            />
          </Card>

          <ChartCard
            title="dashboard.attendanceByClass"
            description="dashboard.attendanceHint"
            className="lg:col-span-8"
          >
            {classes.length === 0 ? (
              <ChartEmpty
                title={tr("dashboard.noMovement")}
                hint={tr("dashboard.attendanceHint")}
              />
            ) : (
            <GroupedBarsChart
              emptyAsGraph
              data={classes.map((row) => ({
                label: row.class_room ?? "Unassigned",
                present: row.present,
                leave: row.leave,
                absent: row.absent,
              }))}
              series={[
                {
                  key: "present",
                  label: tr("dashboard.present"),
                  color: colors["--success"],
                },
                {
                  key: "leave",
                  label: tr("dashboard.leave"),
                  color: colors["--warning"],
                },
                {
                  key: "absent",
                  label: tr("dashboard.absent"),
                  color: colors["--danger"],
                },
              ]}
            />
            )}
          </ChartCard>
        </div>
      ) : null}
    </section>
  );
}
