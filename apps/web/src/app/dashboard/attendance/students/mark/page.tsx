"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicYears, useClassRooms, useSections } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { Paginated, Student } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

interface Mark {
  status: string;
  remarks: string;
}

export default function MarkAttendancePage() {
  return (
    <PermissionGate permission="attendance.create">
      <MarkSheet />
    </PermissionGate>
  );
}

function MarkSheet() {
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();

  const currentYearId = years.find((year) => year.is_current)?.id;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [yearId, setYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const effectiveYear = yearId || (currentYearId ? String(currentYearId) : "");

  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (classId === "") {
        setStudents([]);
        return;
      }

      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.set("class_room_id", classId);
      if (sectionId) query.set("section_id", sectionId);
      if (effectiveYear) query.set("academic_year_id", effectiveYear);
      query.set("per_page", "200");

      try {
        const response = await apiFetch<Paginated<Student>>(
          `/v1/students?${query.toString()}`,
          { signal: controller.signal }
        );
        setStudents(response.data);
        setMarks(
          Object.fromEntries(
            response.data.map((student) => [
              student.id,
              { status: "present", remarks: "" },
            ])
          )
        );
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load students."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [classId, sectionId, effectiveYear]);

  useEffect(() => load(), [load]);

  const setAll = (status: string) => {
    setMarks((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, mark]) => [
          id,
          { ...mark, status },
        ])
      )
    );
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    const records = students.map((student) => ({
      student_id: student.id,
      status: marks[student.id]?.status ?? "present",
      ...(marks[student.id]?.remarks
        ? { remarks: marks[student.id].remarks }
        : {}),
    }));

    try {
      await apiFetch("/v1/attendance/students/bulk", {
        method: "POST",
        body: {
          attendance_date: date,
          ...(effectiveYear ? { academic_year_id: Number(effectiveYear) } : {}),
          class_room_id: Number(classId),
          ...(sectionId ? { section_id: Number(sectionId) } : {}),
          records,
        },
      });
      setNotice(`Marked ${records.length} student(s) for ${date}.`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };

  const filteredSections = sections.filter(
    (section) => !classId || String(section.class_room_id) === classId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark attendance"
        description="Take the register for a class and section."
        actions={
          <Link
            href="/dashboard/attendance/students"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Date" htmlFor="att_date" required>
            <TextInput
              id="att_date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Academic year" htmlFor="att_year">
            <Select
              id="att_year"
              value={effectiveYear}
              onChange={(event) => setYearId(event.target.value)}
            >
              <option value="">Not specified</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="att_class" required>
            <Select
              id="att_class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSectionId("");
              }}
            >
              <option value="">Select class</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" htmlFor="att_section">
            <Select
              id="att_section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
            >
              <option value="">All sections</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {notice ? <SuccessNotice message={notice} /> : null}
      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-secondary px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Students {students.length > 0 ? `(${students.length})` : ""}
          </h2>
          {students.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAll("present")}
              >
                All present
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAll("absent")}
              >
                All absent
              </Button>
            </div>
          ) : null}
        </div>

        {classId === "" ? (
          <EmptyState message="Choose a class to load the register." />
        ) : loading ? (
          <Spinner />
        ) : students.length === 0 ? (
          <EmptyState message="No students are enrolled in this class and section." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Mark student attendance"
                className="min-w-[720px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Remarks</Table.Column>
                </Table.Header>
                <Table.Body>
                  {students.map((student) => (
                    <Table.Row key={student.id} id={student.id}>
                      <Table.Cell>
                        <div className="font-medium text-foreground">
                          {student.full_name}
                        </div>
                        <div className="font-mono text-xs text-muted">
                          {student.admission_no}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Select
                          value={marks[student.id]?.status ?? "present"}
                          onChange={(event) =>
                            setMarks((current) => ({
                              ...current,
                              [student.id]: {
                                status: event.target.value,
                                remarks: current[student.id]?.remarks ?? "",
                              },
                            }))
                          }
                          className="w-36"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Table.Cell>
                      <Table.Cell>
                        <TextInput
                          value={marks[student.id]?.remarks ?? ""}
                          placeholder="Optional"
                          onChange={(event) =>
                            setMarks((current) => ({
                              ...current,
                              [student.id]: {
                                status: current[student.id]?.status ?? "present",
                                remarks: event.target.value,
                              },
                            }))
                          }
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {students.length > 0 ? (
          <div className="flex items-center justify-end border-t border-border-secondary px-6 py-4">
            <Button type="button" loading={busy} onClick={submit}>
              Save attendance
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
