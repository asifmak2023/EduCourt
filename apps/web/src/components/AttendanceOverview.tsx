"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import {
  ChartCard,
  DonutChart,
  GroupedBarsChart,
  useChartColors,
} from "@/components/Charts";
import {
  Card,
  ErrorNotice,
  Spinner,
  StatCard,
} from "@/components/ui";
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

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Attendance this month
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Monthly attendance summary by class.
          </p>
        </div>
        <Link
          href="/dashboard/attendance/report"
          className="text-xs font-medium text-muted hover:text-foreground"
        >
          View full report
        </Link>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Students marked"
              value={formatNumber(totals?.total ?? 0)}
            />
            <StatCard
              label="Present"
              value={formatNumber(totals?.present ?? 0)}
              tone="positive"
            />
            <StatCard
              label="Leave"
              value={formatNumber(totals?.leave ?? 0)}
              tone="warning"
            />
            <StatCard
              label="Absent"
              value={formatNumber(totals?.absent ?? 0)}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Attendance split">
              <DonutChart
                emptyAsGraph
                data={[
                  {
                    label: "Present",
                    value: totals?.present ?? 0,
                    color: colors["--success"],
                  },
                  {
                    label: "Leave",
                    value: totals?.leave ?? 0,
                    color: colors["--warning"],
                  },
                  {
                    label: "Absent",
                    value: totals?.absent ?? 0,
                    color: colors["--danger"],
                  },
                ]}
                centerValue={formatNumber(totals?.total ?? 0)}
                centerLabel="Marked"
              />
            </ChartCard>

            <ChartCard title="Attendance by class" className="lg:col-span-2">
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
                    label: "Present",
                    color: colors["--success"],
                  },
                  {
                    key: "leave",
                    label: "Leave",
                    color: colors["--warning"],
                  },
                  {
                    key: "absent",
                    label: "Absent",
                    color: colors["--danger"],
                  },
                ]}
              />
            </ChartCard>
          </div>
        </>
      ) : null}
    </section>
  );
}
