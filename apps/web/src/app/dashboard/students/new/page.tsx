"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicOptions } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import {
  emptyStudentProfile,
  StudentProfileFields,
  type StudentProfile,
} from "@/components/StudentProfileFields";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";

interface GuardianRow {
  key: number;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
}

function emptyGuardian(key: number): GuardianRow {
  return {
    key,
    name: "",
    phone: "",
    relationship: "father",
    is_primary: false,
    is_emergency_contact: false,
  };
}

function prune(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === "" || value === undefined || value === null) {
      continue;
    }

    output[key] = value;
  }

  return output;
}

export default function NewStudentPage() {
  return (
    <PermissionGate permission="student.create">
      <NewStudentForm />
    </PermissionGate>
  );
}

function NewStudentForm() {
  const router = useRouter();
  const { options, loading: optionsLoading } = useAcademicOptions();

  const [profile, setProfile] = useState<StudentProfile>(emptyStudentProfile());
  const [guardians, setGuardians] = useState<GuardianRow[]>([emptyGuardian(0)]);
  const [nextKey, setNextKey] = useState(1);

  const [enroll, setEnroll] = useState(false);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");

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
        is_primary?: boolean;
        is_emergency_contact?: boolean;
      }[] = [];

      for (const row of guardians) {
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

        guardianPayload.push({
          guardian_id: created.data.id,
          relationship: row.relationship,
          is_primary: row.is_primary,
          is_emergency_contact: row.is_emergency_contact,
        });
      }

      const enrollment =
        enroll && academicYearId && classRoomId
          ? prune({
              academic_year_id: Number(academicYearId),
              class_room_id: Number(classRoomId),
              section_id: sectionId ? Number(sectionId) : "",
              roll_number: rollNumber,
            })
          : undefined;

      const payload = {
        ...prune({ ...profile }),
        ...(guardianPayload.length > 0 ? { guardians: guardianPayload } : {}),
        ...(enrollment ? { enrollment } : {}),
      };

      const created = await apiFetch<{ data: { id: number } }>("/v1/students", {
        method: "POST",
        body: payload,
      });

      router.push(`/dashboard/students/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create student.");
      }
    } finally {
      setBusy(false);
    }
  };

  const sections = options.sections.filter(
    (section) => String(section.class_room_id) === classRoomId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="New student"
        description="Register a student, guardians and an optional first enrollment."
        actions={
          <Link
            href="/dashboard/students"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <StudentProfileFields
            profile={profile}
            set={set}
            errors={errText}
            admissionHint
          />

          <div className="border-b border-slate-100 px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Guardians
              </h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setGuardians((current) => [
                    ...current,
                    emptyGuardian(nextKey),
                  ]);
                  setNextKey((value) => value + 1);
                }}
              >
                Add guardian
              </Button>
            </div>

            <div className="space-y-4">
              {guardians.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <Field label="Name" htmlFor={`gname-${row.key}`} required>
                    <TextInput
                      id={`gname-${row.key}`}
                      value={row.name}
                      onChange={(event) =>
                        updateGuardian(row.key, { name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Phone" htmlFor={`gphone-${row.key}`} required>
                    <TextInput
                      id={`gphone-${row.key}`}
                      value={row.phone}
                      onChange={(event) =>
                        updateGuardian(row.key, { phone: event.target.value })
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
                  <div className="flex items-end gap-4 lg:col-span-1">
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
                  {guardians.length > 1 ? (
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
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-100 px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Enrollment
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Optional first class placement.
                </p>
              </div>
              <Checkbox
                label="Enroll now"
                checked={enroll}
                onChange={(event) => setEnroll(event.target.checked)}
              />
            </div>

            {enroll ? (
              optionsLoading ? (
                <Spinner />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field
                    label="Academic year"
                    htmlFor="academic_year_id"
                    required
                    error={errText("enrollment.academic_year_id")}
                  >
                    <Select
                      id="academic_year_id"
                      value={academicYearId}
                      onChange={(event) =>
                        setAcademicYearId(event.target.value)
                      }
                    >
                      <option value="">Select year</option>
                      {options.academic_years.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Class"
                    htmlFor="class_room_id"
                    required
                    error={errText("enrollment.class_room_id")}
                  >
                    <Select
                      id="class_room_id"
                      value={classRoomId}
                      onChange={(event) => {
                        setClassRoomId(event.target.value);
                        setSectionId("");
                      }}
                    >
                      <option value="">Select class</option>
                      {options.class_rooms.map((classRoom) => (
                        <option key={classRoom.id} value={classRoom.id}>
                          {classRoom.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Section" htmlFor="section_id">
                    <Select
                      id="section_id"
                      value={sectionId}
                      disabled={classRoomId === ""}
                      onChange={(event) => setSectionId(event.target.value)}
                    >
                      <option value="">No section</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Roll number" htmlFor="roll_number">
                    <TextInput
                      id="roll_number"
                      value={rollNumber}
                      onChange={(event) => setRollNumber(event.target.value)}
                    />
                  </Field>
                </div>
              )
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Link
              href="/dashboard/students"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              Create student
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
