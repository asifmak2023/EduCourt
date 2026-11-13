"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useIncomeSources } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export function OtherIncomeForm() {
  const router = useRouter();
  const { items: sources, loading } = useIncomeSources();

  const [sourceId, setSourceId] = useState("");
  const [receivedOn, setReceivedOn] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [payerName, setPayerName] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        income_source_id: Number(sourceId),
        received_on: receivedOn,
        amount: Number(amount),
        method,
      };

      if (payerName) body.payer_name = payerName;
      if (reference) body.reference = reference;
      if (remarks) body.remarks = remarks;

      await apiFetch("/v1/other-incomes", { method: "POST", body });
      router.push("/dashboard/finance/other-income");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to record the income.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record other income"
        description="Post non-fee income such as donations, rent or grants."
        actions={
          <Link
            href="/dashboard/finance/other-income"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {sources.length === 0 ? (
        <div className="rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">No active income sources</p>
          <p className="mt-0.5 text-muted">
            Add at least one active income source before recording other income.
          </p>
        </div>
      ) : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 border-b border-border-secondary px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Income source"
              htmlFor="other_income_source"
              required
              error={errText("income_source_id")}
            >
              <Select
                id="other_income_source"
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
              >
                <option value="">Select source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                    {source.code ? ` (${source.code})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Received on"
              htmlFor="other_income_date"
              required
              error={errText("received_on")}
            >
              <TextInput
                id="other_income_date"
                type="date"
                value={receivedOn}
                onChange={(event) => setReceivedOn(event.target.value)}
              />
            </Field>
            <Field
              label="Amount"
              htmlFor="other_income_amount"
              required
              error={errText("amount")}
            >
              <TextInput
                id="other_income_amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label="Method" htmlFor="other_income_method" required>
              <Select
                id="other_income_method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                {PAYMENT_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payer name" htmlFor="other_income_payer">
              <TextInput
                id="other_income_payer"
                value={payerName}
                onChange={(event) => setPayerName(event.target.value)}
              />
            </Field>
            <Field label="Reference" htmlFor="other_income_reference">
              <TextInput
                id="other_income_reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
            <Field
              label="Remarks"
              htmlFor="other_income_remarks"
              className="sm:col-span-2 lg:col-span-3"
            >
              <TextArea
                id="other_income_remarks"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4">
            <Link
              href="/dashboard/finance/other-income"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={!sourceId || Number(amount) <= 0}>
              Record income
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
