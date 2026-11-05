"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import {
  GroupedBarsChart,
  useChartColors,
} from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { Field, TextInput } from "@/components/Form";
import { formatDate, formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useReport } from "@/lib/useReport";
import type { ReportFilterState } from "@/lib/reportPeriod";
import type { ReportStaff } from "@/lib/types";

export default function StaffReportPage() {
  return (
    <PermissionGate permission="report.staff">
      <StaffReport />
    </PermissionGate>
  );
}

function StaffReport() {
  const colors = useChartColors();
  const [asOn, setAsOn] = useState("");
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const params = new URLSearchParams();
  if (asOn) params.set("as_on", asOn);
  if (filters.granularity) params.set("granularity", filters.granularity);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();

  const { data, loading, error } = useReport<ReportStaff>(
    `/v1/reports/staff${query ? `?${query}` : ""}`
  );

  const series = data?.series ?? [];

  const exportRows = useMemo(
    () =>
      (data?.headcount.by_department ?? []).map((row) => [
        row.department ?? "Unassigned",
        row.total,
      ]),
    [data]
  );

  return (
    <ReportScaffold
      title="Staff report"
      description="Headcount, staff attendance and leave for a period."
      active="staff"
      filters={filters}
      onFiltersChange={setFilters}
      documentScope={
        data ? `Headcount as on ${formatDate(data.filters.as_on)}` : null
      }
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      onExport={() =>
        downloadCsv(
          `${reportSlug("staff")}-${filters.granularity}`,
          ["Department", "Headcount"],
          exportRows
        )
      }
      exportDisabled={exportRows.length === 0}
      rangeExtras={
        <div className="w-full sm:w-40">
          <Field label="As on" htmlFor="staff_as_on">
            <TextInput
              id="staff_as_on"
              type="date"
              value={asOn}
              onChange={(event) => setAsOn(event.target.value)}
            />
          </Field>
        </div>
      }
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              {
                label: "Headcount",
                value: formatNumber(data.headcount.total),
                hint: `As on ${formatDate(data.filters.as_on)}`,
              },
              {
                label: "Attendance records",
                value: formatNumber(data.attendance.total),
              },
              {
                label: "Leave requests",
                value: formatNumber(data.leave.total),
              },
              {
                label: "Approved leave days",
                value: formatNumber(data.leave.approved_days),
              },
            ]}
          />

          <ReportSection
            title="Staff attendance trend"
            description="Present, absent and leave counts per period."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <GroupedBarsChart
                data={series.map((point) => ({
                  label: point.label,
                  present: point.present,
                  absent: point.absent,
                  leave: point.leave,
                }))}
                series={[
                  {
                    key: "present",
                    label: "Present",
                    color: colors["--success"],
                  },
                  {
                    key: "absent",
                    label: "Absent",
                    color: colors["--danger"],
                  },
                  {
                    key: "leave",
                    label: "Leave",
                    color: colors["--warning"],
                  },
                ]}
                emptyAsGraph
              />
            </div>
          </ReportSection>

          <ReportSection title="Headcount by department">
            <ReportTable
              columns={["Department", "Staff"]}
              align={["left", "right"]}
              rows={(data.headcount.by_department ?? []).map((row) => [
                row.department ?? "Unassigned",
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Headcount by employment type">
            <ReportTable
              columns={["Employment type", "Staff"]}
              align={["left", "right"]}
              rows={(data.headcount.by_employment_type ?? []).map((row) => [
                row.employment_type ?? "Unspecified",
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Staff attendance by status">
            <ReportTable
              columns={["Status", "Records"]}
              align={["left", "right"]}
              rows={(data.attendance.by_status ?? []).map((row) => [
                row.status ?? "Unknown",
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Leave by status">
            <ReportTable
              columns={["Status", "Requests"]}
              align={["left", "right"]}
              rows={(data.leave.by_status ?? []).map((row) => [
                row.status ?? "Unknown",
                formatNumber(row.total),
              ])}
            />
          </ReportSection>


        </>
      ) : null}
    </ReportScaffold>
  );
}
