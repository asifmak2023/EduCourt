"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  Checkbox,
  Field,
  Select,
  TextInput,
  buttonClasses,
} from "@/components/Form";
import { ErrorNotice, SuccessNotice } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useAcademicYears, useClassRooms, useFeePlans, useStudents } from "@/lib/useLookups";

type GenerateResult = {
  message?: string;
  created?: number;
  skipped?: number;
};

export function GenerateVoucherDialog({ onDone }: { onDone?: () => void }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);

  const [mode, setMode] = useState<"class" | "student">("class");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [feePlanId, setFeePlanId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [applyScholarships, setApplyScholarships] = useState(true);
  const [applyConcessions, setApplyConcessions] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<GenerateResult | null>(null);

  const { items: years, loading: yearsLoading } = useAcademicYears(open);
  const { items: classes, loading: classesLoading } = useClassRooms(open);
  const { items: plans, loading: plansLoading } = useFeePlans(open);
  const { items: students, loading: studentsLoading } = useStudents(
    open && mode === "student"
  );

  const loading = yearsLoading || classesLoading || plansLoading || studentsLoading;

  const matchingPlans = plans.filter(
    (plan) =>
      (!academicYearId || plan.academic_year_id === Number(academicYearId)) &&
      (!classRoomId || plan.class_room_id === Number(classRoomId))
  );

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const close = () => {
    setOpen(false);
    setError(null);
    setFieldErrors({});
    setResult(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", onKey);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        academic_year_id: Number(academicYearId),
        class_room_id: Number(classRoomId),
        fee_plan_id: Number(feePlanId),
        apply_scholarships: applyScholarships,
        apply_concessions: applyConcessions,
      };

      let path = "/v1/fee-vouchers/generate";

      if (mode === "student") {
        path = "/v1/fee-vouchers/generate-prorated";
        body.join_date = joinDate;
        if (studentId) {
          body.student_id = Number(studentId);
        }
      }

      const response = await apiFetch<GenerateResult>(path, { method: "POST", body });
      setResult(response);
      onDone?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to generate vouchers.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!can("fee.create")) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        Generate vouchers
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Generate fee vouchers"
            className="w-full max-w-lg rounded-2xl border border-border-secondary bg-content1 p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-foreground">Generate fee vouchers</h2>
            <p className="mt-1 text-sm text-muted">
              Issue vouchers for a whole class, or a single student with prorated dues.
            </p>

            <div className="mt-4 space-y-4">
              {error ? <ErrorNotice message={error} /> : null}
              {result ? (
                <SuccessNotice
                  message={result.message ?? "Vouchers generated successfully."}
                />
              ) : null}

              {loading ? (
                <p className="text-sm text-muted">Loading options...</p>
              ) : (
                <>
                  <Field label="Mode" htmlFor="gen_mode">
                    <Select
                      id="gen_mode"
                      value={mode}
                      onChange={(event) => {
                        setMode(event.target.value as "class" | "student");
                        setResult(null);
                      }}
                    >
                      <option value="class">Whole class</option>
                      <option value="student">Single student (prorated)</option>
                    </Select>
                  </Field>

                  <Field label="Academic year" htmlFor="gen_year" required error={errText("academic_year_id")}>
                    <Select
                      id="gen_year"
                      value={academicYearId}
                      onChange={(event) => {
                        setAcademicYearId(event.target.value);
                        setFeePlanId("");
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

                  <Field label="Class" htmlFor="gen_class" required error={errText("class_room_id")}>
                    <Select
                      id="gen_class"
                      value={classRoomId}
                      onChange={(event) => {
                        setClassRoomId(event.target.value);
                        setFeePlanId("");
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

                  <Field
                    label="Fee plan"
                    htmlFor="gen_plan"
                    required
                    error={errText("fee_plan_id")}
                    hint={
                      academicYearId && classRoomId
                        ? `${matchingPlans.length} plan(s) available`
                        : "Select an academic year and class first."
                    }
                  >
                    <Select
                      id="gen_plan"
                      value={feePlanId}
                      onChange={(event) => setFeePlanId(event.target.value)}
                    >
                      <option value="">Select fee plan</option>
                      {matchingPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {mode === "student" ? (
                    <>
                      <Field label="Student" htmlFor="gen_student" hint="Leave blank to generate prorated vouchers for all students in the class." error={errText("student_id")}>
                        <Select
                          id="gen_student"
                          value={studentId}
                          onChange={(event) => setStudentId(event.target.value)}
                        >
                          <option value="">All students in class</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.full_name} ({student.admission_no})
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="Join date" htmlFor="gen_join" required error={errText("join_date")}>
                        <TextInput
                          id="gen_join"
                          type="date"
                          value={joinDate}
                          onChange={(event) => setJoinDate(event.target.value)}
                        />
                      </Field>
                    </>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    <Checkbox
                      label="Apply scholarships automatically"
                      checked={applyScholarships}
                      onChange={(event) => setApplyScholarships(event.target.checked)}
                    />
                    <Checkbox
                      label="Apply concessions automatically"
                      checked={applyConcessions}
                      onChange={(event) => setApplyConcessions(event.target.checked)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" className={buttonClasses("secondary")} onClick={close}>
                Close
              </button>
              <Button
                type="button"
                loading={busy}
                disabled={loading || !academicYearId || !classRoomId || !feePlanId}
                onClick={() => void submit()}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
