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
import { Field, Select } from "@/components/Form";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
import { formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useStudents } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportFilterState } from "@/lib/reportPeriod";
import type { ReportStudentYearly } from "@/lib/types";

export default function StudentYearlyReportPage() {
  return (
    <PermissionGate permission="report.students">
      <StudentYearlyReport />
    </PermissionGate>
  );
}

function StudentYearlyReport() {
  const colors = useChartColors();
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");
  const [filters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const { data, loading, error } = useReport<ReportStudentYearly>(
    studentId ? `/v1/reports/students/${studentId}/yearly` : null
  );

  const selectedStudent = students.find(
    (student) => String(student.id) === studentId
  );

  const yearRows = useMemo(
    () =>
      (data?.years ?? []).map((year) => [
        year.academic_year ?? `Year #${year.academic_year_id}`,
        `${year.class_room ?? "-"}${year.section ? ` / ${year.section}` : ""}`,
        `${year.attendance.attendance_percentage}%`,
        year.academics.percentage === null
          ? "-"
          : `${year.academics.percentage}%`,
        year.conduct_records,
      ]),
    [data]
  );

  const series = data?.series ?? [];

  return (
    <ReportScaffold
      title="Student yearly report"
      description="A student's attendance, academics and conduct by academic year."
      active="students"
      filters={filters}
      onFiltersChange={() => undefined}
      supported={["all"]}
      showDates={false}
      showPeriods={false}
      documentTitle="Student yearly report"
      documentScope={
        data ? `${data.student.name} (${data.student.admission_no})` : null
      }
      loading={loading}
      error={error}
      hasData={Boolean(data) && Boolean(studentId)}
      emptyMessage="Select a student to view their yearly analysis."
      onExport={() =>
        downloadCsv(
          `${reportSlug(`student-${data?.student.admission_no ?? studentId}`)}-yearly`,
          ["Year", "Class", "Attendance", "Academics", "Conduct"],
          yearRows
        )
      }
      exportDisabled={yearRows.length === 0}
      rangeExtras={
        <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
          <div className="w-full sm:w-64">
            <Field label="Student" htmlFor="yearly_student" required>
              <Select
                id="yearly_student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} ({student.admission_no})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {selectedStudent ? (
            <FeeVoucherAction
              student={{
                id: selectedStudent.id,
                full_name: selectedStudent.full_name,
                admission_no: selectedStudent.admission_no,
              }}
            />
          ) : null}
        </div>
      }
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              {
                label: "Academic years",
                value: formatNumber(data.summary.years),
              },
              {
                label: "Overall attendance",
                value: `${data.summary.attendance_percentage}%`,
              },
              {
                label: "Conduct records",
                value: formatNumber(data.summary.conduct_records),
              },
            ]}
          />

          <ReportSection
            title="Year on year"
            description="Attendance and academic percentage by academic year."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <GroupedBarsChart
                data={series.map((point) => ({
                  label: point.label,
                  attendance: point.attendance_percentage,
                  academics: point.academic_percentage,
                }))}
                series={[
                  {
                    key: "attendance",
                    label: "Attendance %",
                    color: colors["--success"],
                  },
                  {
                    key: "academics",
                    label: "Academics %",
                    color: colors["--accent"],
                  },
                ]}
                formatValue={(value) => `${value}%`}
                emptyAsGraph
              />
            </div>
          </ReportSection>

          <ReportSection
            title={`${data.student.name} (${data.student.admission_no})`}
          >
            <ReportTable
              columns={["Year", "Class", "Attendance", "Academics", "Conduct"]}
              align={["left", "left", "right", "right", "right"]}
              empty="No enrollment history for this student."
              rows={yearRows}
            />
          </ReportSection>

        </>
      ) : null}
    </ReportScaffold>
  );
}
