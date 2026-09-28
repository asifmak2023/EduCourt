"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useChartOfAccounts, useFiscalYears } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

interface LineDraft {
  key: number;
  chart_of_account_id: string;
  description: string;
  debit: string;
  credit: string;
}

function emptyLine(key: number): LineDraft {
  return {
    key,
    chart_of_account_id: "",
    description: "",
    debit: "",
    credit: "",
  };
}

export default function NewJournalEntryPage() {
  return (
    <PermissionGate permission="finance.create">
      <NewJournalEntryForm />
    </PermissionGate>
  );
}

function NewJournalEntryForm() {
  const router = useRouter();
  const { items: accounts, loading: accountsLoading } = useChartOfAccounts();
  const { items: fiscalYears, loading: fiscalLoading } = useFiscalYears();

  const currentYear = fiscalYears.find((year) => year.is_current) ?? fiscalYears[0];

  const [fiscalYearId, setFiscalYearId] = useState("");
  const [reference, setReference] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(0), emptyLine(1)]);
  const [nextKey, setNextKey] = useState(2);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const resolvedFiscalYear = fiscalYearId || (currentYear ? String(currentYear.id) : "");

  const leafAccounts = accounts.filter((account) => !account.is_group && account.is_active);

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  const validLines = lines.filter(
    (line) =>
      line.chart_of_account_id &&
      (Number(line.debit) > 0 || Number(line.credit) > 0)
  );

  const canSubmit =
    balanced && validLines.length >= 2 && resolvedFiscalYear !== "";

  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body = {
        fiscal_year_id: Number(resolvedFiscalYear),
        ...(reference ? { reference } : {}),
        entry_date: entryDate,
        ...(memo ? { memo } : {}),
        lines: validLines.map((line) => ({
          chart_of_account_id: Number(line.chart_of_account_id),
          ...(line.description ? { description: line.description } : {}),
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
        })),
      };

      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/journal-entries",
        { method: "POST", body }
      );

      router.push(`/dashboard/finance/journal/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create journal entry.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (accountsLoading || fiscalLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New journal entry"
        description="Create a balanced draft entry; post it from the entry page."
        actions={
          <Link
            href="/dashboard/finance/journal"
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
          <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Fiscal year"
              htmlFor="fiscal_year_id"
              required
              error={errText("fiscal_year_id")}
            >
              <Select
                id="fiscal_year_id"
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
              label="Entry date"
              htmlFor="entry_date"
              required
              error={errText("entry_date")}
            >
              <TextInput
                id="entry_date"
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
              />
            </Field>
            <Field
              label="Reference"
              htmlFor="reference"
              hint="Auto-generated when left blank."
              error={errText("reference")}
            >
              <TextInput
                id="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
            <Field label="Memo" htmlFor="memo" error={errText("memo")}>
              <TextInput
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
                      value={line.chart_of_account_id}
                      onChange={(event) =>
                        updateLine(line.key, {
                          chart_of_account_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select account</option>
                      {leafAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
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
                      value={line.debit}
                      placeholder="Debit"
                      onChange={(event) =>
                        updateLine(line.key, {
                          debit: event.target.value,
                          credit: event.target.value ? "" : line.credit,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      placeholder="Credit"
                      onChange={(event) =>
                        updateLine(line.key, {
                          credit: event.target.value,
                          debit: event.target.value ? "" : line.debit,
                        })
                      }
                    />
                  </div>
                  {lines.length > 2 ? (
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

            <div className="mt-5 flex flex-wrap items-center justify-end gap-6 border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-600">
                Debit{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totalDebit)}
                </span>
              </span>
              <span className="text-slate-600">
                Credit{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totalCredit)}
                </span>
              </span>
              <span
                className={`font-medium ${
                  balanced ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {balanced ? "Balanced" : "Out of balance"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/finance/journal"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={!canSubmit}>
              Save draft
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
