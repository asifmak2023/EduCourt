"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useExams, useStudents } from "@/lib/useLookups";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { ExamSupplementary } from "@/lib/types";

const STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

export default function SupplementariesPage() {
  return (
    <PermissionGate permission="exam.view">
      <SupplementariesTable />
    </PermissionGate>
  );
}

function SupplementariesTable() {
  const { can } = useAuth();
  const { items: exams } = useExams();
  const { items: students } = useStudents();

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (examId) params.original_exam_id = Number(examId);
  if (studentId) params.student_id = Number(studentId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<ExamSupplementary>("/v1/exam-supplementaries", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplementary exams"
        description="Re-sit registrations for students who failed a paper."
        actions={
          <>
            <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
              Back
            </Link>
            {can("exam.edit") ? (
              <Link
                href="/dashboard/exams/supplementaries/new"
                className={buttonClasses()}
              >
                New registration
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Select
            value={examId}
            onChange={(event) => {
              setPage(1);
              setExamId(event.target.value);
            }}
          >
            <option value="">All exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            value={studentId}
            onChange={(event) => {
              setPage(1);
              setStudentId(event.target.value);
            }}
          >
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No supplementary registrations match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Supplementary registrations"
                className="min-w-[820px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Original exam</Table.Column>
                  <Table.Column>Subject</Table.Column>
                  <Table.Column className="text-right">Fee</Table.Column>
                  <Table.Column>Paid</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((row) => (
                    <Table.Row key={row.id} id={row.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/exams/supplementaries/${row.id}`}
                          className="hover:underline"
                        >
                          {row.student?.full_name ?? `#${row.student_id}`}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {row.original_exam?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {row.subject?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatCurrency(row.fee_amount)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={row.is_paid ? "paid" : "unpaid"} />
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={row.status} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
