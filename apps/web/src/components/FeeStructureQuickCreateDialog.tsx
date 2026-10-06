"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, apiFetch } from "@/lib/api";
import { useFeeHeads } from "@/lib/useLookups";
import { Button, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import { Repeater } from "@/components/Repeater";
import { ErrorNotice } from "@/components/ui";
import { FeeHeadQuickCreateDialog } from "@/components/FeeHeadQuickCreateDialog";
import type { FeeHead, FeeStructure } from "@/lib/types";

interface MonthlyRow {
  fee_head_id: string;
  amount: string;
}

const emptyRow = (): MonthlyRow => ({ fee_head_id: "", amount: "" });

export function FeeStructureQuickCreateDialog({
  open,
  academicYearId,
  classRoomId,
  defaultName,
  onClose,
  onCreated,
}: {
  open: boolean;
  academicYearId: number | null;
  classRoomId: number | null;
  defaultName?: string;
  onClose: () => void;
  onCreated: (structure: FeeStructure) => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return (
    <StructureDialogBody
      academicYearId={academicYearId}
      classRoomId={classRoomId}
      defaultName={defaultName}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

function StructureDialogBody({
  academicYearId,
  classRoomId,
  defaultName,
  onClose,
  onCreated,
}: {
  academicYearId: number | null;
  classRoomId: number | null;
  defaultName?: string;
  onClose: () => void;
  onCreated: (structure: FeeStructure) => void;
}) {
  const { items: feeHeads, loading: headsLoading } = useFeeHeads(true);
  const [createdHeads, setCreatedHeads] = useState<FeeHead[]>([]);
  const [headDialogOpen, setHeadDialogOpen] = useState(false);

  const [name, setName] = useState(defaultName ?? "");
  const [rows, setRows] = useState<MonthlyRow[]>([emptyRow()]);
  const [examAmount, setExamAmount] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const headOptions = useMemo(() => {
    const known = new Set(feeHeads.map((head) => head.id));
    return [...feeHeads, ...createdHeads.filter((head) => !known.has(head.id))];
  }, [feeHeads, createdHeads]);

  const updateRow = (index: number, patch: Partial<MonthlyRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const errText = (field: string) => fieldErrors[field]?.[0] ?? null;

  const close = () => {
    setError(null);
    setFieldErrors({});
    onClose();
  };

  const submit = async () => {
    if (!academicYearId || !classRoomId) {
      setError("Student has no academic year or class. Cannot create a structure.");
      return;
    }

    const items: {
      fee_head_id: number | null;
      name: string;
      billing_kind: string;
      exam_term?: string | null;
      amount: number;
      sort_order: number;
    }[] = rows
      .filter((row) => Number(row.amount) > 0)
      .map((row, index) => {
        const found = headOptions.find((head) => head.id === Number(row.fee_head_id));
        return {
          fee_head_id: row.fee_head_id ? Number(row.fee_head_id) : null,
          name: found?.name ?? "Monthly Fee",
          billing_kind: "monthly",
          amount: Number(row.amount) || 0,
          sort_order: index,
        };
      });

    if (Number(examAmount) > 0) {
      items.push({
        fee_head_id: null,
        name: "First Term Exam",
        billing_kind: "exam",
        exam_term: "first",
        amount: Number(examAmount) || 0,
        sort_order: items.length,
      });
    }

    if (items.length === 0) {
      setError("Add at least one monthly amount.");
      return;
    }

    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await apiFetch<{ data: FeeStructure }>("/v1/fee-structures", {
        method: "POST",
        body: {
          academic_year_id: academicYearId,
          class_room_id: classRoomId,
          name: name.trim() || "Class fee structure",
          is_active: true,
          items,
        },
      });

      onCreated(response.data);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create fee structure.");
      }
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="dialog-overlay fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto p-4"
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
        aria-label="New fee structure"
        className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              New fee structure
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Create this class structure without leaving the counter.
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

          <div className="grid gap-4">
            <Field label="Name" htmlFor="qf_name" error={errText("name")}>
              <TextInput
                id="qf_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Class 2 (2026-27)"
              />
            </Field>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Monthly items
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setHeadDialogOpen(true)}
                >
                  New fee head
                </Button>
              </div>
              {headsLoading ? (
                <p className="text-sm text-muted">Loading fee heads...</p>
              ) : (
                <Repeater<MonthlyRow>
                  rows={rows}
                  onChange={setRows}
                  addLabel="Add monthly item"
                  emptyRow={emptyRow}
                  renderRow={(row, index) => (
                    <>
                      <Field label="Fee head" htmlFor={`qf_head_${index}`}>
                        <Select
                          id={`qf_head_${index}`}
                          value={row.fee_head_id}
                          onChange={(event) =>
                            updateRow(index, { fee_head_id: event.target.value })
                          }
                        >
                          <option value="">Select fee head</option>
                          {headOptions.map((head) => (
                            <option key={head.id} value={head.id}>
                              {head.code ? `${head.code} - ${head.name}` : head.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Amount" htmlFor={`qf_amount_${index}`}>
                        <TextInput
                          id={`qf_amount_${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.amount}
                          onChange={(event) =>
                            updateRow(index, { amount: event.target.value })
                          }
                        />
                      </Field>
                    </>
                  )}
                />
              )}
            </div>

            <Field label="First term exam (optional)" htmlFor="qf_exam">
              <TextInput
                id="qf_exam"
                type="number"
                min={0}
                step="0.01"
                value={examAmount}
                onChange={(event) => setExamAmount(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
          <button
            type="button"
            className={buttonClasses("secondary")}
            onClick={close}
          >
            Cancel
          </button>
          <Button type="button" loading={busy} onClick={() => void submit()}>
            Create structure
          </Button>
        </div>
      </div>

      <FeeHeadQuickCreateDialog
        open={headDialogOpen}
        onClose={() => setHeadDialogOpen(false)}
        onCreated={(head) => setCreatedHeads((current) => [...current, head])}
      />
    </div>,
    document.body
  );
}
