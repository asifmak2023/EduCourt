"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useStudents, useTerms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { TermGpa } from "@/lib/types";

export default function TermGpaPage() {
  return (
    <PermissionGate permission="credit.view">
      <TermGpaView />
    </PermissionGate>
  );
}

function TermGpaView() {
  const { items: students } = useStudents();
  const { items: terms } = useTerms();
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [result, setResult] = useState<TermGpa | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: TermGpa }>(
        `/v1/students/${studentId}/term-gpa?term_id=${termId}`
      );
      setResult(response.data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Unable to load GPA.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Term GPA"
        description="Credit-weighted grade point average for one term."
        actions={
          <Link href="/dashboard/credits" className={buttonClasses("secondary")}>
            Back
          </Link>
        }
      />

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Student" htmlFor="gpa_student" required>
            <Select
              id="gpa_student"
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
          <Field label="Term" htmlFor="gpa_term" required>
            <Select
              id="gpa_term"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
            >
              <option value="">Select term</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!studentId || !termId}
              onClick={run}
            >
              Calculate
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard
              label="GPA"
              value={result.gpa === null ? "-" : formatNumber(result.gpa)}
            />
            <StatCard
              label="Credits registered"
              value={formatNumber(result.credits_registered)}
            />
            <StatCard
              label="Credits graded"
              value={formatNumber(result.credits_graded)}
            />
            <StatCard
              label="Credits earned"
              value={formatNumber(result.credits_earned)}
            />
          </div>

          <Card>
            {result.subjects.length === 0 ? (
              <EmptyState message="No courses registered for this term." />
            ) : (
              <div className="overflow-x-auto">
                <Table variant="secondary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Subject grades">
                    <Table.Header>
                      <Table.Column isRowHeader>Subject</Table.Column>
                      <Table.Column className="text-right">Credits</Table.Column>
                      <Table.Column className="text-right">Percentage</Table.Column>
                      <Table.Column>Grade</Table.Column>
                      <Table.Column className="text-right">Points</Table.Column>
                      <Table.Column>Status</Table.Column>
                    </Table.Header>
                    <Table.Body>
                    {result.subjects.map((row) => (
                      <Table.Row
                        key={row.course_registration_id}
                        className="hover:bg-surface-secondary"
                       id={row.course_registration_id}>
                        <Table.Cell className="text-foreground">{row.subject ?? `#${row.subject_id}`}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.credit_hours)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{row.percentage === null
                            ? "-"
                            : `${formatNumber(row.percentage)}%`}</Table.Cell>
                        <Table.Cell className="text-muted">{row.grade ?? "-"}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{row.grade_points === null
                            ? "-"
                            : formatNumber(row.grade_points)}</Table.Cell>
                        <Table.Cell><Badge value={row.status} /></Table.Cell>
                      </Table.Row>
                    ))}
                    </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
