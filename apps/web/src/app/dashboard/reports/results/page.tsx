"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
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
            <div className="border-b border-border-secondary px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                {data.exam.name} by subject
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Subject results">
                  <Table.Header>
                    <Table.Column isRowHeader>Subject</Table.Column>
                    <Table.Column>Class</Table.Column>
                    <Table.Column className="text-right">Entered</Table.Column>
                    <Table.Column className="text-right">Average</Table.Column>
                    <Table.Column className="text-right">Avg %</Table.Column>
                    <Table.Column className="text-right">Passed</Table.Column>
                    <Table.Column className="text-right">Failed</Table.Column>
                  </Table.Header>
                  <Table.Body>
                  {data.by_paper.length === 0 ? (
                    <Table.Row id="row-1">
                      <Table.Cell className="text-muted">No marks entered for this exam.</Table.Cell><Table.Cell /><Table.Cell /><Table.Cell /><Table.Cell /><Table.Cell /><Table.Cell />
                    </Table.Row>
                  ) : (
                    data.by_paper.map((row) => (
                      <Table.Row key={row.exam_paper_id} id={row.exam_paper_id}>
                        <Table.Cell className="text-foreground">{row.subject ?? `Paper #${row.exam_paper_id}`}</Table.Cell>
                        <Table.Cell className="text-muted">{row.class_room ?? "-"}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.entered)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{row.average}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{row.average_percentage}%</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.passed)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.failed)}</Table.Cell>
                      </Table.Row>
                    ))
                  )}
                  </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
