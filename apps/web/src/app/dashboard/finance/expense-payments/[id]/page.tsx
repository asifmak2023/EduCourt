"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, buttonClasses, Field, TextArea } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { ExpensePayment } from "@/lib/types";

export default function ExpensePaymentDetailPage() {
  return (
    <PermissionGate permission="finance.view">
      <ExpensePaymentView />
    </PermissionGate>
  );
}

function ExpensePaymentView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<ExpensePayment>(
    id ? `/v1/expense-payments/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Payment not found." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payment ${data.reference}`}
        description={
          data.expense ? `Against expense ${data.expense.reference}` : undefined
        }
        actions={
          <Link
            href={
              data.expense
                ? `/dashboard/finance/expenses/${data.expense.id}`
                : "/dashboard/finance/expenses"
            }
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_voided ? "void" : "posted"} />
        <span className="text-sm text-slate-500">
          {formatCurrency(data.amount)} paid
        </span>
      </div>

      <SectionCard title="Payment details">
        <DataList>
          <DataItem label="Reference" value={data.reference} />
          <DataItem label="Payment date" value={formatDate(data.payment_date)} />
          <DataItem label="Amount" value={formatCurrency(data.amount)} />
          <DataItem
            label="Method"
            value={data.method_label ?? humanize(data.method)}
          />
          <DataItem
            label="Expense"
            value={
              data.expense ? (
                <Link
                  href={`/dashboard/finance/expenses/${data.expense.id}`}
                  className="underline"
                >
                  {data.expense.reference}
                </Link>
              ) : (
                "-"
              )
            }
          />
          <DataItem
            label="Voided"
            value={data.is_voided ? formatDate(data.voided_at) : "No"}
          />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.notes}
          </p>
        ) : null}
      </SectionCard>

      {!data.is_voided && can("finance.approve") ? (
        <VoidPayment paymentId={data.id} onChanged={reload} />
      ) : null}
    </div>
  );
}

function VoidPayment({
  paymentId,
  onChanged,
}: {
  paymentId: number;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/expense-payments/${paymentId}/void`, {
        method: "POST",
        body: { ...(memo ? { memo } : {}) },
      });
      setOpen(false);
      setDone("Payment voided. The expense balance has been restored.");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Void payment</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Reverses the ledger entry and reopens the expense balance.
          </p>
        </div>
        <Button
          variant="danger"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          Void payment
        </Button>
      </div>

      {done ? (
        <div className="mt-4">
          <SuccessNotice message={done} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <Field label="Reason (optional)" htmlFor="void_expense_payment_memo">
            <TextArea
              id="void_expense_payment_memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button variant="danger" type="button" loading={busy} onClick={submit}>
              Confirm void
            </Button>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
