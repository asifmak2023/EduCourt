"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useStudents, useSubjects, useTerms } from "@/lib/useLookups";
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
import { formatNumber } from "@/lib/format";
import type { CourseRegistration } from "@/lib/types";

const STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "dropped", label: "Dropped" },
];

export default function RegistrationsPage() {
  return (
    <PermissionGate permission="credit.view">
      <RegistrationsTable />
    </PermissionGate>
  );
}

function RegistrationsTable() {
  const { can } = useAuth();
  const { items: students } = useStudents();
  const { items: terms } = useTerms();
  const { items: subjects } = useSubjects();

  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (studentId) params.student_id = Number(studentId);
  if (termId) params.term_id = Number(termId);
  if (subjectId) params.subject_id = Number(subjectId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<CourseRegistration>("/v1/course-registrations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course registrations"
        description="Term course enrolment with credit hours."
        actions={
          <>
            <Link
              href="/dashboard/credits"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("credit.create") ? (
              <Link
                href="/dashboard/credits/registrations/new"
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
        <div className="w-48">
          <Select
            value={termId}
            onChange={(event) => {
              setPage(1);
              setTermId(event.target.value);
            }}
          >
            <option value="">All terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={subjectId}
            onChange={(event) => {
              setPage(1);
              setSubjectId(event.target.value);
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
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
          <EmptyState message="No course registrations match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Course registrations">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Term</Table.Column>
                  <Table.Column>Subject</Table.Column>
                  <Table.Column className="text-right">Credits</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((row) => (
                  <Table.Row key={row.id} className="hover:bg-surface-secondary" id={row.id}>
                    <Table.Cell className="text-foreground"><Link
                        href={`/dashboard/credits/registrations/${row.id}`}
                        className="hover:underline"
                      >
                        {row.student?.full_name ?? `#${row.student_id}`}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{row.term?.name ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{row.subject?.name ?? "-"}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatNumber(row.credit_hours)}</Table.Cell>
                    <Table.Cell><Badge value={row.status} /></Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
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
