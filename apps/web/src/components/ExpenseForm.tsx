"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useExpenseCategories, useVendors } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Expense } from "@/lib/types";

interface LineDraft {
  key: number;
  expense_category_id: string;
  amount: string;
  description: string;
}

function emptyLine(key: number): LineDraft {
  return { key, expense_category_id: "", amount: "", description: "" };
}

export function ExpenseForm({ expense }: { expense?: Expense }) {
  const router = useRouter();
  const isEdit = Boolean(expense);
  const { items: categories, loading: categoriesLoading } =
    useExpenseCategories();
  const { items: vendors, loading: vendorsLoading } = useVendors();

  const [vendorId, setVendorId] = useState(
    expense?.vendor_id ? String(expense.vendor_id) : ""
  );
  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date ?? new Date().toISOString().slice(0, 10)
  );
  const [payeeName, setPayeeName] = useState(expense?.payee_name ?? "");
  const [billNo, setBillNo] = useState(expense?.bill_no ?? "");
  const [memo, setMemo] = useState(expense?.memo ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    expense?.lines && expense.lines.length > 0
      ? expense.lines.map((line, index) => ({
          key: index,
          expense_category_id: String(line.expense_category_id),
          amount: String(line.amount),
          description: line.description ?? "",
        }))
      : [emptyLine(0)]
  );
  const [nextKey, setNextKey] = useState(lines.length);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const validLines = lines.filter(
    (line) => line.expense_category_id && Number(line.amount) > 0
  );

  const total = validLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        expense_date: expenseDate,
        lines: validLines.map((line) => ({
          expense_category_id: Number(line.expense_category_id),
          amount: Number(line.amount),
          ...(line.description ? { description: line.description } : {}),
        })),
      };

      if (vendorId) body.vendor_id = Number(vendorId);
      if (payeeName) body.payee_name = payeeName;
      if (billNo) body.bill_no = billNo;
      if (memo) body.memo = memo;

      if (isEdit && expense) {
        await apiFetch(`/v1/expenses/${expense.id}`, { method: "PUT", body });
        router.push(`/dashboard/finance/expenses/${expense.id}`);
        return;
      }

      const created = await apiFetch<{ data: { id: number } }>("/v1/expenses", {
        method: "POST",
        body,
      });
      router.push(`/dashboard/finance/expenses/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save expense.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (categoriesLoading || vendorsLoading) {
    return <Spinner />;
  }

  const cancelHref = expense
    ? `/dashboard/finance/expenses/${expense.id}`
    : "/dashboard/finance/expenses";

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${expense?.reference}` : "New expense"}
        description={
          isEdit
            ? "Update this draft expense."
            : "Record a vendor bill or operating expense as a draft."
        }
        actions={
          <Link href={cancelHref} className={buttonClasses("secondary")}>
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
          <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Expense date"
              htmlFor="expense_date"
              required
              error={errText("expense_date")}
            >
              <TextInput
                id="expense_date"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
              />
            </Field>
            <Field label="Vendor" htmlFor="vendor_id" error={errText("vendor_id")}>
              <Select
                id="vendor_id"
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
              >
                <option value="">No vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payee name" htmlFor="payee_name" error={errText("payee_name")}>
              <TextInput
                id="payee_name"
                value={payeeName}
                onChange={(event) => setPayeeName(event.target.value)}
              />
            </Field>
            <Field label="Bill no" htmlFor="bill_no" error={errText("bill_no")}>
              <TextInput
                id="bill_no"
                value={billNo}
                onChange={(event) => setBillNo(event.target.value)}
              />
            </Field>
            <Field
              label="Memo"
              htmlFor="memo"
              className="sm:col-span-2 lg:col-span-4"
              error={errText("memo")}
            >
              <TextArea
                id="memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />
            </Field>
          </div>

          <div className="px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Lines</h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setLines((current) => [...current, emptyLine(nextKey)]);
                  setNextKey((value) => value + 1);
                }}
              >
                Add line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5">
                    <Select
                      value={line.expense_category_id}
                      onChange={(event) =>
                        updateLine(line.key, {
                          expense_category_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-5">
                    <TextInput
                      value={line.description}
                      placeholder="Description"
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.amount}
                      placeholder="Amount"
                      onChange={(event) =>
                        updateLine(line.key, { amount: event.target.value })
                      }
                    />
                  </div>
                  {lines.length > 1 ? (
                    <div className="sm:col-span-12">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key)
                          )
                        }
                      >
                        Remove line
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-600">
                Total{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(total)}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link href={cancelHref} className={buttonClasses("secondary")}>
              Cancel
            </Link>
            <Button
              type="submit"
              loading={busy}
              disabled={validLines.length === 0}
            >
              {isEdit ? "Save changes" : "Create expense"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
