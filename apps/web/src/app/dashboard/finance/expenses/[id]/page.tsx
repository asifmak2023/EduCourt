"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
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
import type { Expense } from "@/lib/types";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function ExpenseDetailPage() {
  return (
    <PermissionGate permission="finance.view">
      <ExpenseDetailView />
    </PermissionGate>
  );
}

function ExpenseDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<Expense>(
    id ? `/v1/expenses/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Expense not found." />;
  }

  const lines = data.lines ?? [];
  const payments = data.payments ?? [];
  const isDraft = data.status === "draft";
  const isVoid = data.status === "void";
  const canPay =
    (data.status === "approved" || data.status === "partial") &&
    Number(data.outstanding) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Expense ${data.reference}`}
        description={data.vendor?.name ?? data.payee_name ?? "Operating expense"}
        actions={
          <>
            <Link
              href="/dashboard/finance/expenses"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("finance.edit") && isDraft ? (
              <Link
                href={`/dashboard/finance/expenses/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <span className="text-xs text-muted">
          {formatDate(data.expense_date)}
          {data.fiscal_year ? ` · ${data.fiscal_year.name}` : ""}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Total" value={formatCurrency(data.total)} />
        <SummaryTile
          label="Paid"
          value={formatCurrency(data.paid_amount)}
          tone="positive"
        />
        <SummaryTile
          label="Outstanding"
          value={formatCurrency(data.outstanding)}
          tone={Number(data.outstanding) > 0 ? "danger" : "default"}
        />
      </div>

      <SectionCard title="Details">
        <DataList>
          <DataItem label="Reference" value={data.reference} />
          <DataItem label="Expense date" value={formatDate(data.expense_date)} />
          <DataItem
            label="Vendor"
            value={
              data.vendor ? (
                <Link
                  href={`/dashboard/finance/vendors/${data.vendor.id}/edit`}
                  className="underline"
                >
                  {data.vendor.name}
                </Link>
              ) : (
                "-"
              )
            }
          />
          <DataItem label="Payee" value={data.payee_name ?? "-"} />
          <DataItem label="Bill no" value={data.bill_no ?? "-"} />
          <DataItem label="Approved at" value={formatDate(data.approved_at)} />
        </DataList>
        {data.memo ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            {data.memo}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Lines">
        {lines.length === 0 ? (
          <EmptyState message="No lines recorded." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Expense lines">
                <Table.Header>
                  <Table.Column isRowHeader>Category</Table.Column>
                  <Table.Column>Description</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                </Table.Header>
                <Table.Body>
                  {lines.map((line) => (
                    <Table.Row key={line.id} id={line.id}>
                      <Table.Cell className="text-foreground">
                        {line.category?.name ?? `Category #${line.expense_category_id}`}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {line.description ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(line.amount)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
                <Table.Footer>
                  <Table.Row id="lines-total">
                    <Table.Cell className="font-semibold">Total</Table.Cell>
                    <Table.Cell />
                    <Table.Cell className="text-right font-semibold">
                      {formatCurrency(data.total)}
                    </Table.Cell>
                  </Table.Row>
                </Table.Footer>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </SectionCard>

      <SectionCard
        title="Payments"
        description="Settlements recorded against this expense."
      >
        {payments.length === 0 ? (
          <EmptyState message="No payments recorded." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Expense payments">
                <Table.Header>
                  <Table.Column isRowHeader>Reference</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column>Method</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {payments.map((payment) => (
                    <Table.Row key={payment.id} id={payment.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/finance/expense-payments/${payment.id}`}
                          className="hover:underline"
                        >
                          {payment.reference}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(payment.payment_date)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(payment.amount)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {payment.method_label ?? humanize(payment.method)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={payment.is_voided ? "void" : "posted"} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </SectionCard>

      {!isVoid ? (
        <ExpenseActions
          expense={data}
          canApprove={can("finance.approve")}
          canCreate={can("finance.create")}
          canDelete={can("finance.delete")}
          canPay={canPay}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    positive: "text-success",
    danger: "text-danger",
  };

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold ${tones[tone]}`}>{value}</p>
    </Card>
  );
}

function ExpenseActions({
  expense,
  canApprove,
  canCreate,
  canDelete,
  canPay,
  onChanged,
}: {
  expense: Expense;
  canApprove: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canPay: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mode, setMode] = useState<"payment" | "void" | null>(null);

  const isDraft = expense.status === "draft";

  const run = async (
    path: string,
    body: Record<string, unknown> | undefined,
    message: string
  ) => {
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      await apiFetch(path, { method: "POST", body });
      setMode(null);
      setDone(message);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/expenses/${expense.id}`, { method: "DELETE" });
      router.push("/dashboard/finance/expenses");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Actions</h2>
          <p className="mt-0.5 text-xs text-muted">
            Approve the draft to post it, then record settlements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && isDraft ? (
            <Button
              type="button"
              loading={busy}
              onClick={() =>
                void run(
                  `/v1/expenses/${expense.id}/approve`,
                  undefined,
                  "Expense approved and posted."
                )
              }
            >
              Approve expense
            </Button>
          ) : null}
          {canCreate && canPay ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMode("payment")}
            >
              Record payment
            </Button>
          ) : null}
          {canApprove && !isDraft ? (
            <Button
              variant="danger"
              type="button"
              onClick={() => setMode("void")}
            >
              Void expense
            </Button>
          ) : null}
          {canDelete && isDraft ? (
            <Button variant="danger" type="button" loading={busy} onClick={remove}>
              Delete draft
            </Button>
          ) : null}
        </div>
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

      {mode === "payment" ? (
        <PaymentForm
          outstanding={expense.outstanding}
          busy={busy}
          onCancel={() => setMode(null)}
          onSubmit={(payload) =>
            void run(
              "/v1/expense-payments",
              { ...payload, expense_id: expense.id },
              "Payment recorded."
            )
          }
        />
      ) : null}

      {mode === "void" ? (
        <VoidForm
          busy={busy}
          onCancel={() => setMode(null)}
          onConfirm={(memo) =>
            void run(
              `/v1/expenses/${expense.id}/void`,
              { ...(memo ? { memo } : {}) },
              "Expense voided."
            )
          }
        />
      ) : null}
    </Card>
  );
}

function PaymentForm({
  outstanding,
  busy,
  onCancel,
  onSubmit,
}: {
  outstanding: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [amount, setAmount] = useState(outstanding);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");

  return (
    <div className="mt-5 grid gap-4 border-t border-border-secondary pt-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Amount"
        htmlFor="expense_payment_amount"
        required
        hint={`Outstanding ${formatCurrency(outstanding)}`}
      >
        <TextInput
          id="expense_payment_amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field label="Payment date" htmlFor="expense_payment_date" required>
        <TextInput
          id="expense_payment_date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>
      <Field label="Method" htmlFor="expense_payment_method" required>
        <Select
          id="expense_payment_method"
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
      <Field
        label="Notes"
        htmlFor="expense_payment_notes"
        className="sm:col-span-2"
      >
        <TextArea
          id="expense_payment_notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
        <Button
          type="button"
          disabled={Number(amount) <= 0}
          loading={busy}
          onClick={() =>
            onSubmit({
              payment_date: date,
              amount: Number(amount),
              method,
              ...(notes ? { notes } : {}),
            })
          }
        >
          Save payment
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function VoidForm({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (memo: string) => void;
}) {
  const [memo, setMemo] = useState("");

  return (
    <div className="mt-5 space-y-4 border-t border-border-secondary pt-5">
      <Field label="Reason (optional)" htmlFor="void_expense_memo">
        <TextArea
          id="void_expense_memo"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          variant="danger"
          type="button"
          loading={busy}
          onClick={() => onConfirm(memo)}
        >
          Confirm void
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
