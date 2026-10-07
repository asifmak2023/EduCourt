"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { useAcademicYears, useClassRooms, useSections } from "@/lib/useLookups";
import { Button, Field, Select, TextInput } from "@/components/Form";
import { ErrorNotice, SuccessNotice } from "@/components/ui";

interface BulkResultRow {
  student_id: number;
  student_name: string | null;
  admission_no: string | null;
  status: "created" | "skipped" | "error";
  voucher_no?: string;
  charge_id?: number | null;
  message?: string;
}

interface BulkResult {
  message: string;
  created: number;
  skipped: number;
  errors: number;
  results: BulkResultRow[];
}

export interface BulkFeeVoucherDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerated?: (result: BulkResult) => void;
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function BulkFeeVoucherDialog({
  open,
  onClose,
  onGenerated,
}: BulkFeeVoucherDialogProps) {
  const { canAny } = useAuth();

  if (!open || !canAny(AR_VIEW) || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <BulkDialogFrame onClose={onClose} onGenerated={onGenerated} />,
    document.body
  );
}

function BulkDialogFrame({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated?: (result: BulkResult) => void;
}) {
  const { items: years } = useAcademicYears();
  const { items: classes, loading: classesLoading } = useClassRooms();
  const { items: sections, loading: sectionsLoading } = useSections();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [month, setMonth] = useState(currentMonthValue());
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const filteredSections = useMemo(
    () =>
      sections.filter(
        (section) => !classId || String(section.class_room_id) === classId
      ),
    [sections, classId]
  );

  const submit = async () => {
    if (!academicYearId || !classId || !month) {
      setError("Select an academic year, class and month.");
      return;
    }

    const [yearPart, monthPart] = month.split("-");

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiFetch<BulkResult>("/v1/fee-counter/generate-bulk", {
        method: "POST",
        body: {
          academic_year_id: Number(academicYearId),
          class_room_id: Number(classId),
          section_id: sectionId ? Number(sectionId) : null,
          period_year: Number(yearPart),
          period_month: Number(monthPart),
          due_date: dueDate || null,
        },
      });

      setResult(response);
      onGenerated?.(response);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to generate vouchers."
      );
    } finally {
      setBusy(false);
    }
  };

  const printAll = () => {
    if (!result) return;
    const ids = result.results
      .filter((row) => row.charge_id != null)
      .map((row) => row.charge_id as number);
    if (ids.length === 0) return;
    // Open each voucher print page in a new tab
    for (const id of ids) {
      window.open(
        `/dashboard/finance/accounts-receivable/vouchers/${id}?print=1`,
        "_blank"
      );
    }
  };

  // Detect empty class / section state after loading is complete
  const noClasses = !classesLoading && classes.length === 0;
  const noSections =
    !sectionsLoading && classId !== "" && filteredSections.length === 0;

  return (
    <div
      className="dialog-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate class vouchers"
        className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Generate class vouchers
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Create this month&apos;s fee voucher for every active student in a class.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? <ErrorNotice message={error} /> : null}
          {result ? (
            <div className="mb-4">
              <SuccessNotice message={result.message} />
            </div>
          ) : null}

          {/* Empty-class prompt */}
          {noClasses ? (
            <div className="mb-4 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-foreground">
              <p className="font-medium">No classes found</p>
              <p className="mt-0.5 text-muted">
                You need to create at least one class before generating vouchers.{" "}
                <Link
                  href="/dashboard/academics/classes/new"
                  className="font-medium text-primary underline underline-offset-2"
                  onClick={onClose}
                >
                  Create a class →
                </Link>
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Academic year" htmlFor="bulk_year" required>
              <Select
                id="bulk_year"
                value={academicYearId}
                onChange={(event) => setAcademicYearId(event.target.value)}
              >
                <option value="">Select year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Class" htmlFor="bulk_class" required>
              <Select
                id="bulk_class"
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
            <Field label="Section" htmlFor="bulk_section" hint="Optional.">
              <Select
                id="bulk_section"
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                disabled={!classId}
              >
                <option value="">All sections</option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </Select>
              {/* Empty-section inline prompt */}
              {noSections ? (
                <p className="mt-1 text-xs text-warning">
                  This class has no sections.{" "}
                  <Link
                    href="/dashboard/academics/sections/new"
                    className="font-medium underline underline-offset-2"
                    onClick={onClose}
                  >
                    Add a section →
                  </Link>
                </p>
              ) : null}
            </Field>
            <Field label="Month" htmlFor="bulk_month" required>
              <TextInput
                id="bulk_month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </Field>
            <Field label="Due date" htmlFor="bulk_due" hint="Optional.">
              <TextInput
                id="bulk_due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
          </div>

          {/* Results table */}
          {result ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-border-secondary">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Admission</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Voucher</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row) => (
                    <tr key={row.student_id} className="border-t border-border-secondary">
                      <td className="px-3 py-2 text-foreground">
                        {row.student_name ?? `#${row.student_id}`}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">
                        {row.admission_no ?? "-"}
                      </td>
                      <td className="px-3 py-2 capitalize text-muted">
                        {row.status}
                        {row.message ? ` — ${row.message}` : ""}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">
                        {row.voucher_no ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.charge_id ? (
                          <Link
                            href={`/dashboard/finance/accounts-receivable/vouchers/${row.charge_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Print
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border-secondary px-6 py-4">
          <span className="text-xs text-muted">
            {result
              ? `${result.created} created, ${result.skipped} skipped, ${result.errors} errors`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            {result && result.created > 0 ? (
              <Button type="button" variant="secondary" onClick={printAll}>
                Print all ({result.created})
              </Button>
            ) : null}
            <Button type="button" loading={busy} onClick={() => void submit()}>
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
