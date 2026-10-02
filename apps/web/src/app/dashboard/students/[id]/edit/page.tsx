"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import {
  StudentProfileFields,
  type StudentProfile,
} from "@/components/StudentProfileFields";
import { StudentPhotoField } from "@/components/StudentPhotoField";
import {
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { StudentDetail } from "@/lib/types";

export default function EditStudentPage() {
  const { user, can } = useAuth();

  if (!user) {
    return null;
  }

  if (!can("student.edit") && !can("student.photo")) {
    return (
      <ErrorNotice message="You do not have permission to view this page." />
    );
  }

  return <EditStudentLoader />;
}

function EditStudentLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<StudentDetail>(
    id ? `/v1/students/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Student not found." />;
  }

  return <EditStudentForm student={data} />;
}

interface GuardianRow {
  key: number;
  guardian_id: number | null;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
}

function profileFromStudent(student: StudentDetail): StudentProfile {
  return {
    first_name: student.first_name ?? "",
    last_name: student.last_name ?? "",
    admission_no: student.admission_no ?? "",
    gender: student.gender ?? "",
    date_of_birth: student.date_of_birth ?? "",
    blood_group: student.blood_group ?? "",
    nationality: student.nationality ?? "",
    religion: student.religion ?? "",
    category: student.category ?? "",
    national_id: student.national_id ?? "",
    email: student.email ?? "",
    phone: student.phone ?? "",
    city: student.city ?? "",
    address: student.address ?? "",
    previous_school: student.previous_school ?? "",
    admission_date: student.admission_date ?? "",
    status: student.status ?? "active",
    notes: student.notes ?? "",
  };
}

function EditStudentForm({ student }: { student: StudentDetail }) {
  const router = useRouter();
  const { can } = useAuth();
  const canEdit = can("student.edit");

  const [photoUrl, setPhotoUrl] = useState<string | null>(
    student.photo_url ?? null
  );
  const [profile, setProfile] = useState<StudentProfile>(
    profileFromStudent(student)
  );
  const [guardians, setGuardians] = useState<GuardianRow[]>(
    student.guardians.map((guardian, index) => ({
      key: index,
      guardian_id: guardian.id,
      name: guardian.name,
      phone: guardian.phone ?? "",
      relationship: guardian.relationship ?? "guardian",
      is_primary: Boolean(guardian.is_primary),
      is_emergency_contact: Boolean(guardian.is_emergency_contact),
    }))
  );
  const [nextKey, setNextKey] = useState(student.guardians.length);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const set = (key: keyof StudentProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const updateGuardian = (key: number, patch: Partial<GuardianRow>) => {
    setGuardians((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const guardianPayload: {
        guardian_id: number;
        relationship: string;
        is_primary: boolean;
        is_emergency_contact: boolean;
      }[] = [];

      for (const row of guardians) {
        let guardianId = row.guardian_id;

        if (guardianId === null) {
          if (!row.name || !row.phone) {
            continue;
          }

          const created = await apiFetch<{ data: { id: number } }>(
            "/v1/guardians",
            {
              method: "POST",
              body: { name: row.name, phone: row.phone },
            }
          );
          guardianId = created.data.id;
        }

        guardianPayload.push({
          guardian_id: guardianId,
          relationship: row.relationship,
          is_primary: row.is_primary,
          is_emergency_contact: row.is_emergency_contact,
        });
      }

      await apiFetch(`/v1/students/${student.id}`, {
        method: "PUT",
        body: {
          ...profile,
          guardians: guardianPayload,
        },
      });

      router.push(`/dashboard/students/${student.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save student.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${student.full_name}`}
        description={`Admission no ${student.admission_no}`}
        actions={
          <Link
            href={`/dashboard/students/${student.id}`}
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {can("student.photo") ? (
        <div className="rounded-2xl border border-border bg-surface">
          <StudentPhotoField
            studentId={student.id}
            name={student.full_name}
            photoUrl={photoUrl}
            onChanged={setPhotoUrl}
          />
        </div>
      ) : null}

      {canEdit ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
        <div className="rounded-2xl border border-border bg-surface">
          <StudentProfileFields profile={profile} set={set} errors={errText} />

          <div className="border-b border-border px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Guardians
              </h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setGuardians((current) => [
                    ...current,
                    {
                      key: nextKey,
                      guardian_id: null,
                      name: "",
                      phone: "",
                      relationship: "guardian",
                      is_primary: false,
                      is_emergency_contact: false,
                    },
                  ]);
                  setNextKey((value) => value + 1);
                }}
              >
                Add guardian
              </Button>
            </div>

            {guardians.length === 0 ? (
              <p className="text-sm text-muted">
                No guardians linked. Use Add guardian to attach one.
              </p>
            ) : (
              <div className="space-y-4">
                {guardians.map((row) => (
                  <div
                    key={row.key}
                    className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <Field
                      label="Name"
                      htmlFor={`gname-${row.key}`}
                      required={row.guardian_id === null}
                    >
                      <TextInput
                        id={`gname-${row.key}`}
                        value={row.name}
                        disabled={row.guardian_id !== null}
                        onChange={(event) =>
                          updateGuardian(row.key, { name: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Phone" htmlFor={`gphone-${row.key}`}>
                      <TextInput
                        id={`gphone-${row.key}`}
                        value={row.phone}
                        disabled={row.guardian_id !== null}
                        onChange={(event) =>
                          updateGuardian(row.key, {
                            phone: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Relationship" htmlFor={`grel-${row.key}`}>
                      <Select
                        id={`grel-${row.key}`}
                        value={row.relationship}
                        onChange={(event) =>
                          updateGuardian(row.key, {
                            relationship: event.target.value,
                          })
                        }
                      >
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="guardian">Guardian</option>
                        <option value="other">Other</option>
                      </Select>
                    </Field>
                    <div className="flex items-end gap-4">
                      <Checkbox
                        label="Primary"
                        checked={row.is_primary}
                        onChange={(event) =>
                          updateGuardian(row.key, {
                            is_primary: event.target.checked,
                          })
                        }
                      />
                      <Checkbox
                        label="Emergency"
                        checked={row.is_emergency_contact}
                        onChange={(event) =>
                          updateGuardian(row.key, {
                            is_emergency_contact: event.target.checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setGuardians((current) =>
                            current.filter((item) => item.key !== row.key)
                          )
                        }
                      >
                        Remove guardian
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="text-xs text-muted">
              Enrollments are managed from the student record:{" "}
              {student.enrollments.length === 0
                ? "none recorded"
                : student.enrollments
                    .map(
                      (enrollment) =>
                        `${enrollment.academic_year?.name ?? "Year"} · ${
                          enrollment.class_room?.name ?? "Class"
                        } (${enrollment.status ?? "-"})`
                    )
                    .join(", ")}
              {student.enrollments.length > 0
                ? ` · since ${formatDate(student.enrollments[0].starts_on)}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/students/${student.id}`}
                className={buttonClasses("secondary")}
              >
                Cancel
              </Link>
              <Button type="submit" loading={busy}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </form>
      ) : null}
    </div>
  );
}
