"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useAcademicYears,
  useClassRooms,
  useSections,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { Paginated, Student } from "@/lib/types";

export default function PromotionsPage() {
  return (
    <PermissionGate permission="student.edit">
      <PromotionView />
    </PermissionGate>
  );
}

function PromotionView() {
  const { items: years, loading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();

  const [fromYear, setFromYear] = useState("");
  const [fromClass, setFromClass] = useState("");
  const [toYear, setToYear] = useState("");
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [repeat, setRepeat] = useState<Record<number, boolean>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const classSections = sections.filter(
    (section) => String(section.class_room_id) === toClass
  );

  const loadStudents = async () => {
    setLoadingStudents(true);
    setError(null);
    setDone(null);

    try {
      const response = await apiFetch<Paginated<Student>>(
        `/v1/students?academic_year_id=${fromYear}&class_room_id=${fromClass}&per_page=200`
      );
      setStudents(response.data);
      setRepeat(
        Object.fromEntries(response.data.map((student) => [student.id, false]))
      );
    } catch (err: unknown) {
      setStudents([]);
      setError(
        err instanceof ApiError ? err.message : "Unable to load students."
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  const promote = async () => {
    setBusy(true);
    setError(null);
    setDone(null);

    const repeatIds = students
      .filter((student) => repeat[student.id])
      .map((student) => student.id);

    try {
      const response = await apiFetch<{ message: string; promoted: number }>(
        "/v1/students/promote",
        {
          method: "POST",
          body: {
            from_academic_year_id: Number(fromYear),
            to_academic_year_id: Number(toYear),
            from_class_room_id: Number(fromClass),
            to_class_room_id: Number(toClass),
            ...(toSection ? { section_id: Number(toSection) } : {}),
            repeat_student_ids: repeatIds,
          },
        }
      );
      setDone(response.message);
      setStudents([]);
      setRepeat({});
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to promote.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const canLoad = fromYear && fromClass;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Move a class of students to the next academic year."
        actions={
          <Link
            href="/dashboard/students"
            className={buttonClasses("secondary")}
          >
            Students
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {done ? <SuccessNotice message={done} /> : null}

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground">From</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Academic year" htmlFor="prom_from_year" required>
            <Select
              id="prom_from_year"
              value={fromYear}
              onChange={(event) => {
                setFromYear(event.target.value);
                setStudents([]);
              }}
            >
              <option value="">Select academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="prom_from_class" required>
            <Select
              id="prom_from_class"
              value={fromClass}
              onChange={(event) => {
                setFromClass(event.target.value);
                setStudents([]);
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
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              loading={loadingStudents}
              disabled={!canLoad}
              onClick={() => void loadStudents()}
            >
              Load students
            </Button>
          </div>
        </div>

        <h2 className="mt-8 text-sm font-semibold text-foreground">To</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Academic year" htmlFor="prom_to_year" required>
            <Select
              id="prom_to_year"
              value={toYear}
              onChange={(event) => setToYear(event.target.value)}
            >
              <option value="">Select academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="prom_to_class" required>
            <Select
              id="prom_to_class"
              value={toClass}
              onChange={(event) => {
                setToClass(event.target.value);
                setToSection("");
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
          <Field label="Section" htmlFor="prom_to_section">
            <Select
              id="prom_to_section"
              value={toSection}
              disabled={!toClass}
              onChange={(event) => setToSection(event.target.value)}
            >
              <option value="">Optional</option>
              {classSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {loadingStudents ? (
        <Spinner />
      ) : students.length > 0 ? (
        <Card>
          <div className="border-b border-border-secondary px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Candidates ({students.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Tick repeat to hold a student back in the same year.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Candidates">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Admission no</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Repeat</Table.Column>
                </Table.Header>
                <Table.Body>
                {students.map((student) => (
                  <Table.Row key={student.id} className="hover:bg-surface-secondary" id={student.id}>
                    <Table.Cell className="text-foreground">{student.full_name}</Table.Cell>
                    <Table.Cell className="text-muted">{student.admission_no}</Table.Cell>
                    <Table.Cell className="text-muted">{student.status ?? "-"}</Table.Cell>
                    <Table.Cell><input
                        type="checkbox"
                        checked={Boolean(repeat[student.id])}
                        onChange={(event) =>
                          setRepeat((current) => ({
                            ...current,
                            [student.id]: event.target.checked,
                          }))
                        }
                      /></Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <div className="flex justify-end border-t border-border-secondary px-5 py-4">
            <Button
              type="button"
              loading={busy}
              disabled={!toYear || !toClass}
              onClick={promote}
            >
              Promote {students.length} student
              {students.length === 1 ? "" : "s"}
            </Button>
          </div>
        </Card>
      ) : fromYear && fromClass && !loadingStudents ? (
        <EmptyState message="No active students found in the selected class and year." />
      ) : null}
    </div>
  );
}
