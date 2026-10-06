"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicYears, useClassRooms, useFeeHeads } from "@/lib/useLookups";
import {
  Button,
  Checkbox,
  Field,
  Select,
  TextInput,
  buttonClasses,
} from "@/components/Form";
import { Repeater } from "@/components/Repeater";
import { FeeHeadQuickCreateDialog } from "@/components/FeeHeadQuickCreateDialog";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { BillingKind, FeeHead, FeeStructure } from "@/lib/types";

interface StructureRow {
  fee_head_id: string;
  name: string;
  billing_kind: BillingKind;
  exam_term: string;
  amount: string;
  is_optional: boolean;
}

const emptyRow = (): StructureRow => ({
  fee_head_id: "",
  name: "",
  billing_kind: "monthly",
  exam_term: "first",
  amount: "",
  is_optional: false,
});

const EXAM_TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
  { value: "final", label: "Final Term" },
  { value: "monthly_test", label: "Monthly Test" },
];

function formatMoney(value: number): string {
  return value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FeeStructureForm({ feeStructure }: { feeStructure?: FeeStructure }) {
  const router = useRouter();
  const isEdit = Boolean(feeStructure);

  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes, loading: classesLoading } = useClassRooms();
  const { items: feeHeads, loading: headsLoading } = useFeeHeads();

  const [academicYearId, setAcademicYearId] = useState(
    feeStructure?.academic_year_id ? String(feeStructure.academic_year_id) : ""
  );
  const [classRoomId, setClassRoomId] = useState(
    feeStructure?.class_room_id ? String(feeStructure.class_room_id) : ""
  );
  const [name, setName] = useState(feeStructure?.name ?? "");
  const [isActive, setIsActive] = useState(feeStructure?.is_active ?? true);
  const [createdHeads, setCreatedHeads] = useState<FeeHead[]>([]);
  const [headDialogOpen, setHeadDialogOpen] = useState(false);

  const [rows, setRows] = useState<StructureRow[]>(
    feeStructure?.items && feeStructure.items.length
      ? feeStructure.items.map((item) => ({
          fee_head_id: item.fee_head_id ? String(item.fee_head_id) : "",
          name: item.name ?? "",
          billing_kind: item.billing_kind,
          exam_term: item.exam_term ?? "first",
          amount: String(item.amount ?? ""),
          is_optional: Boolean(item.is_optional),
        }))
      : [emptyRow()]
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const headOptions = useMemo(() => {
    const known = new Set(feeHeads.map((head) => head.id));
    return [...feeHeads, ...createdHeads.filter((head) => !known.has(head.id))];
  }, [feeHeads, createdHeads]);

  const monthlyTotal = useMemo(
    () =>
      rows
        .filter((row) => row.billing_kind === "monthly")
        .reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [rows]
  );

  const examTotal = useMemo(
    () =>
      rows
        .filter((row) => row.billing_kind === "exam")
        .reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [rows]
  );

  const otherTotal = useMemo(
    () =>
      rows
        .filter(
          (row) => row.billing_kind === "one_time" || row.billing_kind === "other"
        )
        .reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [rows]
  );

  const updateRow = (index: number, patch: Partial<StructureRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const errText = (field: string) => fieldErrors[field]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        academic_year_id: Number(academicYearId),
        class_room_id: Number(classRoomId),
        name,
        is_active: isActive,
        items: rows
          .filter((row) => row.name.trim() !== "")
          .map((row, index) => ({
            fee_head_id: row.fee_head_id ? Number(row.fee_head_id) : null,
            name: row.name.trim(),
            billing_kind: row.billing_kind,
            exam_term: row.billing_kind === "exam" ? row.exam_term : null,
            amount: Number(row.amount) || 0,
            is_optional: Boolean(row.is_optional),
            sort_order: index,
          })),
      };

      if (isEdit && feeStructure) {
        await apiFetch(`/v1/fee-structures/${feeStructure.id}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch("/v1/fee-structures", { method: "POST", body });
      }

      router.push("/dashboard/finance/accounts-receivable/fee-structure");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save fee structure.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (yearsLoading || classesLoading || headsLoading) {
    return <Spinner />;
  }

  const invalid =
    !academicYearId ||
    !classRoomId ||
    !name.trim() ||
    rows.every((row) => row.name.trim() === "");

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${feeStructure?.name}` : "New fee structure"}
        description="Monthly, exam and one-time charges for one academic year and class."
        actions={
          <Link
            href="/dashboard/finance/accounts-receivable/fee-structure"
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
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Academic year"
              htmlFor="fs_year"
              required
              error={errText("academic_year_id")}
            >
              <Select
                id="fs_year"
                value={academicYearId}
                onChange={(event) => setAcademicYearId(event.target.value)}
              >
                <option value="">Select academic year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Class"
              htmlFor="fs_class"
              required
              error={errText("class_room_id")}
            >
              <Select
                id="fs_class"
                value={classRoomId}
                onChange={(event) => setClassRoomId(event.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" htmlFor="fs_name" required error={errText("name")}>
              <TextInput
                id="fs_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Class 2 (2026-27)"
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
            </div>
          </div>

          <div className="border-t border-border-secondary px-6 py-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Fee items</h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted">
                  Monthly {formatMoney(monthlyTotal)} - Exam {formatMoney(examTotal)} -
                  Other {formatMoney(otherTotal)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setHeadDialogOpen(true)}
                >
                  New fee head
                </Button>
              </div>
            </div>

            <Repeater<StructureRow>
              rows={rows}
              onChange={setRows}
              addLabel="Add fee item"
              emptyRow={emptyRow}
              renderRow={(row, index) => (
                <>
                  <Field label="Name" htmlFor={`fs_item_name_${index}`}>
                    <TextInput
                      id={`fs_item_name_${index}`}
                      value={row.name}
                      onChange={(event) =>
                        updateRow(index, { name: event.target.value })
                      }
                      placeholder="e.g. Monthly Tuition"
                    />
                  </Field>
                  <Field label="Type" htmlFor={`fs_item_kind_${index}`}>
                    <Select
                      id={`fs_item_kind_${index}`}
                      value={row.billing_kind}
                      onChange={(event) =>
                        updateRow(index, {
                          billing_kind: event.target.value as BillingKind,
                        })
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="exam">Exam</option>
                      <option value="one_time">One-time</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  {row.billing_kind === "exam" ? (
                    <Field label="Exam term" htmlFor={`fs_item_term_${index}`}>
                      <Select
                        id={`fs_item_term_${index}`}
                        value={row.exam_term}
                        onChange={(event) =>
                          updateRow(index, { exam_term: event.target.value })
                        }
                      >
                        {EXAM_TERMS.map((term) => (
                          <option key={term.value} value={term.value}>
                            {term.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}
                  <Field label="Fee head" htmlFor={`fs_item_head_${index}`}>
                    <Select
                      id={`fs_item_head_${index}`}
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
                  <Field label="Amount" htmlFor={`fs_item_amount_${index}`}>
                    <TextInput
                      id={`fs_item_amount_${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.amount}
                      onChange={(event) =>
                        updateRow(index, { amount: event.target.value })
                      }
                    />
                  </Field>
                  <div className="flex items-end pb-2">
                    <Checkbox
                      label="Optional"
                      checked={row.is_optional}
                      onChange={(event) =>
                        updateRow(index, { is_optional: event.target.checked })
                      }
                    />
                  </div>
                </>
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
            <Link
              href="/dashboard/finance/accounts-receivable/fee-structure"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={invalid}>
              {isEdit ? "Save changes" : "Create fee structure"}
            </Button>
          </div>
        </form>
      </Card>

      <FeeHeadQuickCreateDialog
        open={headDialogOpen}
        onClose={() => setHeadDialogOpen(false)}
        onCreated={(head) => setCreatedHeads((current) => [...current, head])}
      />
    </div>
  );
}
