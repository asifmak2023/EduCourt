"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  useAcademicYears,
  useClassRooms,
  useFeePlans,
  useStudents,
} from "@/lib/useLookups";

type GenerateResult = {
  message?: string;
  created?: number;
  skipped?: number;
};

export function GenerateVoucherDialog({ onDone }: { onDone?: () => void }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);

  const [classFilter, setClassFilter] = useState("");
  const [feePlanId, setFeePlanId] = useState("");
  const [mode, setMode] = useState<"class" | "student">("class");
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

  const classById = new Map(classes.map((room) => [room.id, room]));
  const yearById = new Map(years.map((year) => [year.id, year]));

  const visiblePlans = plans.filter(
    (plan) => !classFilter || plan.class_room_id === Number(classFilter)
  );

  const currentYearId =
    years.find((year) => year.is_current)?.id ?? null;

  const plansByYear = Array.from(
    visiblePlans.reduce((map, plan) => {
      const list = map.get(plan.academic_year_id) ?? [];
      list.push(plan);
      map.set(plan.academic_year_id, list);
      return map;
    }, new Map<number, typeof plans>())
  ).sort((a, b) => b[0] - a[0]);

  const selectedPlan = plans.find((plan) => plan.id === Number(feePlanId)) ?? null;

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const close = () => {
    setOpen(false);
    setError(null);
    setFieldErrors({});
    setResult(null);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const submit = async () => {
    if (!selectedPlan) {
      setError("Select a fee plan to continue.");
      return;
    }

    setBusy(true);
    setError(null);
    setFieldErrors({});
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        academic_year_id: selectedPlan.academic_year_id,
        class_room_id: selectedPlan.class_room_id,
        fee_plan_id: selectedPlan.id,
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

  const planLabel = (plan: (typeof plans)[number]) => {
    const room = plan.class_room ?? classById.get(plan.class_room_id);
    const year = plan.academic_year ?? yearById.get(plan.academic_year_id);
    const parts = [plan.name];
    if (room) parts.push(room.name);
    if (year) parts.push(year.name);
    return parts.join(" - ");
  };

  const generateDisabled =
    loading || !selectedPlan || (mode === "student" && !joinDate);

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

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="dialog-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Generate fee vouchers"
            className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Generate fee vouchers
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  Pick a fee plan and generate vouchers for the whole class.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--surface-secondary)] hover:text-foreground"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {error ? <ErrorNotice message={error} /> : null}
              {result ? (
                <div className="mb-4">
                  <SuccessNotice
                    message={result.message ?? "Vouchers generated successfully."}
                  />
                </div>
              ) : null}

              {loading ? (
                <p className="py-8 text-center text-sm text-muted">
                  Loading options...
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Class"
                      htmlFor="gen_class"
                      hint="Optional. Narrows the fee plan list."
                    >
                      <Select
                        id="gen_class"
                        value={classFilter}
                        onChange={(event) => setClassFilter(event.target.value)}
                      >
                        <option value="">All classes</option>
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
                        currentYearId
                          ? "Academic year and class are taken from the plan."
                          : undefined
                      }
                    >
                      <Select
                        id="gen_plan"
                        value={feePlanId}
                        onChange={(event) => {
                          setFeePlanId(event.target.value);
                          setResult(null);
                        }}
                      >
                        <option value="">Select fee plan</option>
                        {plansByYear.map(([yearId, list]) => (
                          <optgroup
                            key={yearId}
                            label={yearById.get(yearId)?.name ?? `Year #${yearId}`}
                          >
                            {list.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {planLabel(plan)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div>
                    <span className="mb-1 block text-sm font-medium text-foreground">
                      Generate for
                    </span>
                    <div className="inline-flex rounded-xl border border-border-secondary p-1">
                      <button
                        type="button"
                        onClick={() => setMode("class")}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                          mode === "class"
                            ? "bg-accent text-accent-foreground"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        Whole class
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("student")}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                          mode === "student"
                            ? "bg-accent text-accent-foreground"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        Single student (prorated)
                      </button>
                    </div>
                  </div>

                  {mode === "student" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Student"
                        htmlFor="gen_student"
                        hint="Leave blank to cover every student in the class."
                        error={errText("student_id")}
                      >
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

                      <Field
                        label="Join date"
                        htmlFor="gen_join"
                        required
                        error={errText("join_date")}
                      >
                        <TextInput
                          id="gen_join"
                          type="date"
                          value={joinDate}
                          onChange={(event) => setJoinDate(event.target.value)}
                        />
                      </Field>
                    </div>
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

                  {selectedPlan ? (
                    <div className="rounded-xl border border-border-secondary bg-[var(--surface-secondary)] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Summary
                      </p>
                      <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <SummaryRow
                          label="Fee plan"
                          value={selectedPlan.name}
                        />
                        <SummaryRow
                          label="Class"
                          value={
                            selectedPlan.class_room?.name ??
                            classById.get(selectedPlan.class_room_id)?.name ??
                            "-"
                          }
                        />
                        <SummaryRow
                          label="Academic year"
                          value={
                            selectedPlan.academic_year?.name ??
                            yearById.get(selectedPlan.academic_year_id)?.name ??
                            "-"
                          }
                        />
                        <SummaryRow
                          label="Installments"
                          value={String(selectedPlan.installments?.length ?? 0)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
              <button type="button" className={buttonClasses("secondary")} onClick={close}>
                Close
              </button>
              <Button
                type="button"
                loading={busy}
                disabled={generateDisabled}
                onClick={() => void submit()}
              >
                {mode === "student" ? "Generate prorated" : "Generate vouchers"}
              </Button>
            </div>
          </div>
        </div>,
            document.body
          )
        : null}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
