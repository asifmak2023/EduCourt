"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { BarStatChart, useChartColors } from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { ReportYearSelect } from "@/components/reports/ReportRangeBar";
import { Field, Select } from "@/components/Form";
import { formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useAcademicYearDefault } from "@/lib/academicYear";
import { useAcademicYears, useClassRooms } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportAttendance } from "@/lib/types";

export default function AttendanceReportPage() {
  return (
    <PermissionGate permission="report.view">
      <AttendanceReport />
    </PermissionGate>
  );
}

function AttendanceReport() {
  const colors = useChartColors();
  const { items: classRooms } = useClassRooms();
  const { items: academicYears } = useAcademicYears();
  const [classRoomId, setClassRoomId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  useAcademicYearDefault(academicYears, academicYearId, setAcademicYearId);
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const query = buildReportQuery({
    ...filters,
    class_room_id: classRoomId,
    academic_year_id: academicYearId,
  });

  const { data, loading, error } = useReport<ReportAttendance>(
    `/v1/reports/attendance${query}`
  );

  const selectedClass = classRooms.find(
    (classRoom) => String(classRoom.id) === classRoomId
  );
  const selectedYear = academicYears.find(
    (year) => String(year.id) === academicYearId
  );
  const scope = [selectedClass?.name, selectedYear?.name]
    .filter(Boolean)
    .join(" - ");

  const byClassRows = useMemo(
    () =>
      (data?.by_class ?? []).map((row) => [
        row.class_room ?? (row.class_room_id ? `Class #${row.class_room_id}` : "Unassigned"),
        row.total,
        row.attended,
        row.absent,
        `${row.attendance_percentage}%`,
      ]),
    [data]
  );

  const series = data?.series ?? [];

  return (
    <ReportScaffold
      title="Attendance report"
      description="Attendance rate by campus or class over a period."
      active="attendance"
      filters={filters}
      onFiltersChange={setFilters}
      documentScope={scope || null}
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      onExport={() =>
        downloadCsv(
          `${reportSlug("attendance")}-${filters.granularity}`,
          ["Class", "Records", "Attended", "Absent", "Rate"],
          byClassRows
        )
      }
      exportDisabled={byClassRows.length === 0}
      rangeExtras={
        <>
          <div className="w-full sm:w-44">
            <Field label="Class" htmlFor="att_class">
              <Select
                id="att_class"
                value={classRoomId}
                onChange={(event) => setClassRoomId(event.target.value)}
              >
                <option value="">All classes</option>
                {classRooms.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <ReportYearSelect
            id="att_year"
            label="Academic year"
            value={academicYearId}
            onChange={setAcademicYearId}
            items={academicYears.map((year) => ({ id: year.id, name: year.name }))}
            allLabel="All years"
          />
        </>
      }
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              {
                label: "Attendance rate",
                value: `${data.totals.attendance_percentage}%`,
              },
              { label: "Present", value: formatNumber(data.totals.present) },
              { label: "Late", value: formatNumber(data.totals.late) },
              { label: "Absent", value: formatNumber(data.totals.absent) },
              { label: "Leave", value: formatNumber(data.totals.leave) },
              { label: "Records", value: formatNumber(data.totals.total) },
            ]}
          />

          <ReportSection
            title="Attendance trend"
            description="Attendance rate and absence counts for each period."
          >
            <div className="report-chart grid gap-4 lg:grid-cols-2">
              <div className="rounded border border-black/20 p-3">
                <BarStatChart
                  data={series.map((point) => ({
                    label: point.label,
                    value: point.attendance_percentage ?? 0,
                  }))}
                  color={colors["--success"]}
                  formatValue={(value) => `${value}%`}
                />
              </div>
              <div className="rounded border border-black/20 p-3">
                <BarStatChart
                  data={series.map((point) => ({
                    label: point.label,
                    value: point.absent,
                  }))}
                  color={colors["--danger"]}
                />
              </div>
            </div>
          </ReportSection>

          <ReportSection title="Attendance by class">
            <ReportTable
              columns={["Class", "Records", "Attended", "Absent", "Rate"]}
              align={["left", "right", "right", "right", "right"]}
              empty="No attendance records for this selection."
              rows={byClassRows}
            />
          </ReportSection>


        </>
      ) : null}
    </ReportScaffold>
  );
}
