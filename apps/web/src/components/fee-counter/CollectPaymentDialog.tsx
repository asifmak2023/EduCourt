"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useJson } from "@/lib/useJson";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { Button, Field, Select, TextArea, TextInput } from "@/components/Form";
import { ErrorNotice, Spinner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { CounterDues, FeeCharge } from "@/lib/types";

export interface CollectPaymentStudent {
  id: number;
  full_name?: string | null;
  admission_no?: string | null;
}

export interface CollectPaymentDialogProps {
  open: boolean;
  student: CollectPaymentStudent;
  chargeId?: number | null;
  onClose: () => void;
}

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

interface OpenChargeRow {
  id: number;
  voucher_no: string;
  title: string | null;
  balance: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CollectPaymentDialog({
  open,
  student,
  chargeId = null,
  onClose,
}: CollectPaymentDialogProps) {
  const { canAny } = useAuth();

  if (!open || !canAny(AR_VIEW) || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <CollectFrame student={student} chargeId={chargeId} onClose={onClose} />,
    document.body
  );
}

function CollectFrame({
  student,
  chargeId,
  onClose,
}: {
  student: CollectPaymentStudent;
  chargeId: number | null;
  onClose: () => void;
}) {
  const router = useRouter();

  const duesState = useJson<{ data: CounterDues }>(
    chargeId === null ? `/v1/fee-counter/students/${student.id}/dues` : null
  );
  const chargeState = useResource<FeeCharge>(
    chargeId !== null ? `/v1/fee-charges/${chargeId}` : null
  );

  const [amount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const dues = duesState.data?.data ?? null;
  const charge = chargeState.data;

  const loading = duesState.loading || chargeState.loading;
  const error = duesState.error || chargeState.error;
  const ready = chargeId !== null ? charge !== null : dues !== null;

  const outstanding = charge
    ? Number(charge.balance)
    : dues
      ? Number(dues.totals.outstanding)
      : 0;

  const academicYearId = charge
    ? charge.academic_year_id
    : dues?.student.academic_year_id;

  const rows: OpenChargeRow[] = charge
    ? [
        {
          id: charge.id,
          voucher_no: charge.voucher_no,
          title: charge.title ?? charge.billing_kind_label ?? null,
          balance: charge.balance,
        },
      ]
    : (dues?.open_charges ?? []).map((open) => ({
        id: open.id,
        voucher_no: open.voucher_no,
        title: open.title,
        balance: open.balance,
      }));

  const studentName =
    charge?.student?.full_name ?? student.full_name ?? "Student";
  const admissionNo = charge?.student?.admission_no ?? student.admission_no;
  const effectiveAmount = amount ?? (outstanding > 0 ? String(outstanding) : "");

  const submit = async () => {
    if (!ready) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await apiFetch<{ data: { id: number } }>(
        "/v1/fee-receipts",
        {
          method: "POST",
          body: {
            student_id: student.id,
            fee_charge_id: chargeId ?? undefined,
            academic_year_id: academicYearId,
            payment_date: date,
            amount: Number(effectiveAmount),
            method,
            reference: reference || undefined,
            notes: notes || undefined,
          },
        }
      );

      onClose();
      router.push(
        `/dashboard/finance/accounts-receivable/receipts/${response.data.id}?print=1`
      );
    } catch (err: unknown) {
      setFormError(
        err instanceof ApiError ? err.message : "Unable to record the payment."
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        aria-label="Collect fee payment"
        className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Collect payment
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {studentName}
              {admissionNo ? ` - ${admissionNo}` : ""}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorNotice message={error} />
          ) : !ready ? (
            <ErrorNotice message="Unable to load the outstanding balance." />
          ) : (
            <>
              <div className="rounded-xl border border-border-secondary">
                <div className="flex items-center justify-between border-b border-border-secondary px-4 py-2 text-sm">
                  <span className="font-medium text-foreground">
                    Outstanding
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(outstanding)}
                  </span>
                </div>
                <ul className="divide-y divide-border-secondary text-sm">
                  {rows.length === 0 ? (
                    <li className="px-4 py-3 text-muted">
                      No outstanding balance.
                    </li>
                  ) : (
                    rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between px-4 py-2"
                      >
                        <span className="min-w-0 truncate text-muted">
                          {row.voucher_no}
                          {row.title ? ` - ${row.title}` : ""}
                        </span>
                        <span className="ms-3 shrink-0 text-foreground">
                          {formatCurrency(row.balance)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {formError ? <ErrorNotice message={formError} /> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Amount" htmlFor="collect_amount">
                  <TextInput
                    id="collect_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={effectiveAmount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </Field>
                <Field label="Date" htmlFor="collect_date">
                  <TextInput
                    id="collect_date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </Field>
                <Field label="Method" htmlFor="collect_method">
                  <Select
                    id="collect_method"
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    {METHODS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reference" htmlFor="collect_reference">
                  <TextInput
                    id="collect_reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Cheque / transaction no"
                  />
                </Field>
              </div>

              <Field label="Notes" htmlFor="collect_notes">
                <TextArea
                  id="collect_notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border-secondary px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={submit}
            disabled={submitting || !ready || outstanding <= 0}
          >
            {submitting ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
