"use client";

import { useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Field, Select } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { useExams } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportResults } from "@/lib/types";

export default function ResultsReportPage() {
  return (
    <PermissionGate permission="report.view">
      <ResultsReport />
    </PermissionGate>
  );
}

function ResultsReport() {
  const { items: exams } = useExams();
  const [examId, setExamId] = useState("");

  const { data, loading, error } = useReport<ReportResults>(
    examId ? `/v1/reports/results/${examId}` : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results report"
        description="Pass rate, grade spread and subject averages for an exam."
      />
      <ReportsTabs active="results" />

      <Card className="p-4">
        <div className="max-w-sm">
          <Field label="Exam" htmlFor="results_exam" required>
            <Select
              id="results_exam"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {!examId ? (
        <EmptyState message="Select an exam to view its result summary." />
      ) : loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Pass rate"
              value={`${data.totals.pass_percentage}%`}
              tone="positive"
            />
            <StatCard
              label="Average"
              value={`${data.totals.average_percentage}%`}
            />
            <StatCard label="Graded" value={formatNumber(data.totals.graded)} />
            <StatCard
              label="Failed"
              value={formatNumber(data.totals.failed)}
              tone={data.totals.failed > 0 ? "danger" : "default"}
            />
            <StatCard label="Absent" value={formatNumber(data.totals.absent)} />
          </div>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {data.exam.name} by subject
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Class</th>
                    <th className="px-5 py-3 text-right font-medium">Entered</th>
                    <th className="px-5 py-3 text-right font-medium">Average</th>
                    <th className="px-5 py-3 text-right font-medium">Avg %</th>
                    <th className="px-5 py-3 text-right font-medium">Passed</th>
                    <th className="px-5 py-3 text-right font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.by_paper.length === 0 ? (
                    <tr>
                      <td className="px-5 py-3 text-slate-500" colSpan={7}>
                        No marks entered for this exam.
                      </td>
                    </tr>
                  ) : (
                    data.by_paper.map((row) => (
                      <tr key={row.exam_paper_id}>
                        <td className="px-5 py-3 text-slate-900">
                          {row.subject ?? `Paper #${row.exam_paper_id}`}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {row.class_room ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.entered)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {row.average}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {row.average_percentage}%
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.passed)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.failed)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
