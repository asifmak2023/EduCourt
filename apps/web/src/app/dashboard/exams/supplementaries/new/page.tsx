"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useExams } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  Checkbox,
  Field,
  Select,
  TextArea,
  TextInput,
  buttonClasses,
} from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import type { ClassRoom, SupplementaryEligibleRow } from "@/lib/types";

export default function NewSupplementaryPage() {
  return (
    <PermissionGate permission="exam.edit">
      <SupplementaryRegistration />
    </PermissionGate>
  );
}

function SupplementaryRegistration() {
  const router = useRouter();
  const { items: exams } = useExams();
  const { data: classRooms } = useResource<{ data: ClassRoom[] }>(
    "/v1/class-rooms?per_page=200"
  );

  const [examId, setExamId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [rows, setRows] = useState<SupplementaryEligibleRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [feeAmount, setFeeAmount] = useState("0");
  const [isPaid, setIsPaid] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEligible = async () => {
    if (!examId || !classRoomId) {
      setRows([]);
      setSelected({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: SupplementaryEligibleRow[] }>(
        `/v1/exams/${examId}/supplementary-eligible?class_room_id=${classRoomId}`
      );
      setRows(response.data);
      setSelected(
        Object.fromEntries(response.data.map((row) => [row.exam_paper_id, true]))
      );
      setIsPaid(false);
    } catch (err: unknown) {
      setRows([]);
      setError(
        err instanceof ApiError ? err.message : "Unable to load eligibility."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedRows = rows.filter((row) => selected[row.exam_paper_id]);
  const toggleAll = (checked: boolean) => {
    setSelected(
      Object.fromEntries(rows.map((row) => [row.exam_paper_id, checked]))
    );
  };

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      for (const row of selectedRows) {
        await apiFetch("/v1/exam-supplementaries", {
          method: "POST",
          body: {
            original_exam_id: Number(examId),
            exam_paper_id: row.exam_paper_id,
            student_id: row.student_id,
            subject_id: row.subject_id,
            fee_amount: Number(feeAmount) || 0,
            is_paid: isPaid,
            ...(remarks ? { remarks } : {}),
          },
        });
      }
      router.push("/dashboard/exams/supplementaries");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to register.");
      setBusy(false);
    }
  };

  const classRoomList = classRooms?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="New supplementary registration"
        description="Pick an exam and class to find students eligible to re-sit."
        actions={
          <Link
            href="/dashboard/exams/supplementaries"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Original exam" htmlFor="sup_exam" required>
            <Select
              id="sup_exam"
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
          <Field label="Class" htmlFor="sup_class" required>
            <Select
              id="sup_class"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
            >
              <option value="">Select class</option>
              {classRoomList.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              loading={loading}
              disabled={!examId || !classRoomId}
              onClick={() => void loadEligible()}
            >
              Refresh eligibility
            </Button>
          </div>
        </div>
      </Card>

      {rows.length > 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Eligible students ({rows.length})
            </h2>
            <Checkbox
              label="Select all"
              checked={selectedRows.length === rows.length && rows.length > 0}
              onChange={(event) => toggleAll(event.target.checked)}
            />
          </div>

          <div className="mt-4">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Eligible students"
                  className="min-w-[720px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Select</Table.Column>
                    <Table.Column>Student</Table.Column>
                    <Table.Column>Paper</Table.Column>
                    <Table.Column className="text-right">Obtained</Table.Column>
                    <Table.Column className="text-right">Pass mark</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((row) => (
                      <Table.Row key={row.exam_paper_id} id={row.exam_paper_id}>
                        <Table.Cell>
                          <Checkbox
                            label=""
                            checked={Boolean(selected[row.exam_paper_id])}
                            onChange={(event) =>
                              setSelected((current) => ({
                                ...current,
                                [row.exam_paper_id]: event.target.checked,
                              }))
                            }
                          />
                        </Table.Cell>
                        <Table.Cell className="text-foreground">
                          {row.student ?? `#${row.student_id}`}
                        </Table.Cell>
                        <Table.Cell className="text-muted">
                          Paper #{row.exam_paper_id}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.marks_obtained}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.pass_marks}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Field label="Fee amount" htmlFor="sup_fee">
              <TextInput
                id="sup_fee"
                type="number"
                min="0"
                step="0.01"
                value={feeAmount}
                onChange={(event) => setFeeAmount(event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Checkbox
                label="Fee already paid"
                checked={isPaid}
                onChange={(event) => setIsPaid(event.target.checked)}
              />
            </div>
            <Field label="Remarks" htmlFor="sup_remarks">
              <TextArea
                id="sup_remarks"
                rows={2}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Link
              href="/dashboard/exams/supplementaries"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button
              type="button"
              loading={busy}
              disabled={selectedRows.length === 0}
              onClick={submit}
            >
              Register {selectedRows.length || ""} student
              {selectedRows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </Card>
      ) : loading ? (
        <Spinner />
      ) : examId && classRoomId ? (
        <EmptyState message="No students in this class are eligible for a supplementary exam." />
      ) : null}
    </div>
  );
}
