"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useChartOfAccounts, useFiscalYears } from "@/lib/useLookups";
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
import type { Budget } from "@/lib/types";

interface LineDraft {
  key: number;
  chart_of_account_id: string;
  amount: string;
  notes: string;
}

function emptyLine(key: number): LineDraft {
  return { key, chart_of_account_id: "", amount: "", notes: "" };
}

const PERIOD_TYPES = [
  { value: "annual", label: "Annual" },
  { value: "semi_annual", label: "Semi-annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

export function BudgetForm({ budget }: { budget?: Budget }) {
  const router = useRouter();
  const isEdit = Boolean(budget);
  const { items: accounts, loading: accountsLoading } = useChartOfAccounts();
  const { items: fiscalYears, loading: fiscalLoading } = useFiscalYears();

  const currentYear = fiscalYears.find((year) => year.is_current) ?? fiscalYears[0];

  const [fiscalYearId, setFiscalYearId] = useState(
    budget?.fiscal_year_id ? String(budget.fiscal_year_id) : ""
  );
  const [name, setName] = useState(budget?.name ?? "");
  const [periodType, setPeriodType] = useState(budget?.period_type ?? "annual");
  const [startsOn, setStartsOn] = useState(budget?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(budget?.ends_on ?? "");
  const [notes, setNotes] = useState(budget?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    budget?.lines && budget.lines.length > 0
      ? budget.lines.map((line, index) => ({
          key: index,
          chart_of_account_id: String(line.chart_of_account_id),
          amount: String(line.amount),
          notes: line.notes ?? "",
        }))
      : [emptyLine(0)]
  );
  const [nextKey, setNextKey] = useState(lines.length);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const resolvedFiscalYear =
    fiscalYearId || (currentYear ? String(currentYear.id) : "");

  const postable = accounts.filter(
    (account) => !account.is_group && account.is_active
  );

  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const validLines = lines.filter(
    (line) => line.chart_of_account_id && line.amount !== ""
  );

  const total = validLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        fiscal_year_id: Number(resolvedFiscalYear),
        name,
        period_type: periodType,
        starts_on: startsOn,
        ends_on: endsOn,
        lines: validLines.map((line) => ({
          chart_of_account_id: Number(line.chart_of_account_id),
          amount: Number(line.amount) || 0,
          ...(line.notes ? { notes: line.notes } : {}),
        })),
      };

      if (notes) body.notes = notes;

      if (isEdit && budget) {
        await apiFetch(`/v1/budgets/${budget.id}`, { method: "PUT", body });
        router.push(`/dashboard/finance/budgets/${budget.id}`);
        return;
      }

      const created = await apiFetch<{ data: { id: number } }>("/v1/budgets", {
        method: "POST",
        body,
      });
      router.push(`/dashboard/finance/budgets/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save budget.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (accountsLoading || fiscalLoading) {
    return <Spinner />;
  }

  const cancelHref = budget
    ? `/dashboard/finance/budgets/${budget.id}`
    : "/dashboard/finance/budgets";

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${budget?.name}` : "New budget"}
        description="Plan spend per account for a fiscal year."
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
          <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Fiscal year"
              htmlFor="budget_fiscal_year"
              required
              error={errText("fiscal_year_id")}
            >
              <Select
                id="budget_fiscal_year"
                value={resolvedFiscalYear}
                onChange={(event) => setFiscalYearId(event.target.value)}
              >
                <option value="">Select fiscal year</option>
                {fiscalYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} ({year.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Name"
              htmlFor="budget_name"
              required
              className="sm:col-span-1 lg:col-span-2"
              error={errText("name")}
            >
              <TextInput
                id="budget_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Period type"
              htmlFor="budget_period"
              required
              error={errText("period_type")}
            >
              <Select
                id="budget_period"
                value={periodType}
                onChange={(event) => setPeriodType(event.target.value)}
              >
                {PERIOD_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Starts on"
              htmlFor="budget_starts"
              required
              error={errText("starts_on")}
            >
              <TextInput
                id="budget_starts"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Ends on"
              htmlFor="budget_ends"
              required
              error={errText("ends_on")}
            >
              <TextInput
                id="budget_ends"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Notes"
              htmlFor="budget_notes"
              className="sm:col-span-2 lg:col-span-3"
              error={errText("notes")}
            >
              <TextArea
                id="budget_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
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
                      value={line.chart_of_account_id}
                      onChange={(event) =>
                        updateLine(line.key, {
                          chart_of_account_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select account</option>
                      {postable.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-4">
                    <TextInput
                      value={line.notes}
                      placeholder="Notes"
                      onChange={(event) =>
                        updateLine(line.key, { notes: event.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-3">
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
            <Button type="submit" loading={busy} disabled={validLines.length === 0}>
              {isEdit ? "Save changes" : "Create budget"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
