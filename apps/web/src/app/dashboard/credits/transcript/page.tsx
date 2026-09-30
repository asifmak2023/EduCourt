"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useStudents } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Transcript } from "@/lib/types";

export default function TranscriptPage() {
  return (
    <PermissionGate permission="credit.view">
      <TranscriptView />
    </PermissionGate>
  );
}

function TranscriptView() {
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");
  const [result, setResult] = useState<Transcript | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: Transcript }>(
        `/v1/students/${studentId}/transcript`
      );
      setResult(response.data);
    } catch (err: unknown) {
      setResult(null);
      setError(
        err instanceof ApiError ? err.message : "Unable to load transcript."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transcript"
        description="Cumulative GPA with a per-term breakdown."
        actions={
          <Link href="/dashboard/credits" className={buttonClasses("secondary")}>
            Back
          </Link>
        }
      />

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Student" htmlFor="tr_student" required>
            <Select
              id="tr_student"
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
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!studentId}
              onClick={run}
            >
              Load transcript
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Student" value={result.student} />
            <StatCard
              label="Cumulative GPA"
              value={result.gpa === null ? "-" : formatNumber(result.gpa)}
            />
            <StatCard
              label="Credits earned"
              value={formatNumber(result.credits_earned)}
            />
          </div>

          {result.terms.length === 0 ? (
            <EmptyState message="No course registrations on record." />
          ) : (
            result.terms.map((term) => (
              <Card key={term.term.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {term.term.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {term.credits_earned} of {term.credits_graded} credits
                      earned
                    </p>
                  </div>
                  <span className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                    GPA {term.gpa === null ? "-" : formatNumber(term.gpa)}
                  </span>
                </div>

                {term.subjects.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    No graded subjects this term.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <Table variant="secondary">
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Term subjects">
                        <Table.Header>
                          <Table.Column isRowHeader>Subject</Table.Column>
                          <Table.Column className="text-right">Credits</Table.Column>
                          <Table.Column className="text-right">Percentage</Table.Column>
                          <Table.Column>Grade</Table.Column>
                          <Table.Column className="text-right">Points</Table.Column>
                        </Table.Header>
                        <Table.Body>
                        {term.subjects.map((row) => (
                          <Table.Row key={row.course_registration_id} id={row.course_registration_id}>
                            <Table.Cell className="text-foreground">{row.subject ?? `#${row.subject_id}`}</Table.Cell>
                            <Table.Cell className="text-right text-muted">{formatNumber(row.credit_hours)}</Table.Cell>
                            <Table.Cell className="text-right text-muted">{row.percentage === null
                                ? "-"
                                : `${formatNumber(row.percentage)}%`}</Table.Cell>
                            <Table.Cell className="text-muted">{row.grade ?? "-"}</Table.Cell>
                            <Table.Cell className="text-right text-muted">{row.grade_points === null
                                ? "-"
                                : formatNumber(row.grade_points)}</Table.Cell>
                          </Table.Row>
                        ))}
                        </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </div>
                )}
              </Card>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
