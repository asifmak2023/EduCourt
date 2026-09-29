"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, buttonClasses, Field, Select, TextArea, TextInput } from "@/components/Form";
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
import type { FeeVoucherDetail } from "@/lib/types";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function FeeVoucherDetailPage() {
  return (
    <PermissionGate permission="fee.view">
      <VoucherDetailView />
    </PermissionGate>
  );
}

function VoucherDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<FeeVoucherDetail>(
    id ? `/v1/fee-vouchers/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Voucher not found." />;
  }

  const isVoid = data.status === "void";
  const hasBalance = Number(data.balance) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Voucher ${data.voucher_no}`}
        description={
          data.student
            ? `${data.student.full_name} (${data.student.admission_no})`
            : `Student #${data.student_id}`
        }
        actions={
          <>
            <Link href="/dashboard/fees" className={buttonClasses("secondary")}>
              Back
            </Link>
            {data.student ? (
              <Link
                href={`/dashboard/students/${data.student.id}`}
                className={buttonClasses("secondary")}
              >
                Student
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        {data.late_fee_applied_at ? <Badge value="late fee" /> : null}
        <span className="text-xs text-muted">
          Due {formatDate(data.due_date)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Payable" value={formatCurrency(data.amount)} />
        <SummaryTile
          label="Paid"
          value={formatCurrency(data.paid_amount)}
          tone="positive"
        />
        <SummaryTile
          label="Balance"
          value={formatCurrency(data.balance)}
          tone={hasBalance ? "danger" : "default"}
        />
        <SummaryTile
          label="Discount"
          value={formatCurrency(data.discount_amount)}
        />
      </div>

      <SectionCard title="Breakdown">
        <DataList>
          <DataItem label="Gross amount" value={formatCurrency(data.gross_amount)} />
          <DataItem
            label="Late fee"
            value={formatCurrency(data.late_fee_amount)}
          />
          <DataItem label="Sequence" value={data.sequence ?? "-"} />
          <DataItem label="Issued at" value={formatDate(data.issued_at)} />
        </DataList>

        {data.lines.length > 0 ? (
          <div className="mt-5">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Voucher breakdown"
                  className="min-w-[560px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Fee head</Table.Column>
                    <Table.Column className="text-right">Amount</Table.Column>
                    <Table.Column className="text-right">Discount</Table.Column>
                    <Table.Column className="text-right">Net</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.lines.map((line) => (
                      <Table.Row key={line.id} id={line.id}>
                        <Table.Cell className="text-foreground">
                          {line.fee_head?.name ?? `Head #${line.fee_head_id}`}
                        </Table.Cell>
                        <Table.Cell className="text-right text-foreground">
                          {formatCurrency(line.amount)}
                        </Table.Cell>
                        <Table.Cell className="text-right text-foreground">
                          {formatCurrency(line.discount_amount)}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatCurrency(line.net_amount)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Payments"
        description="Receipts recorded against this voucher."
      >
        {data.payments.length === 0 ? (
          <EmptyState message="No payments recorded." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Voucher payments"
                className="min-w-[820px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Receipt no</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column>Method</Table.Column>
                  <Table.Column>Reference</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {data.payments.map((payment) => (
                    <Table.Row key={payment.id} id={payment.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/fees/payments/${payment.id}`}
                          className="hover:underline"
                        >
                          {payment.receipt_no}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(payment.payment_date)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(payment.amount)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {humanize(payment.method)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {payment.reference ?? "-"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={payment.status} />
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
        <VoucherActions
          voucher={data}
          canCreate={can("fee.create")}
          canApprove={can("fee.approve")}
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

function VoucherActions({
  voucher,
  canCreate,
  canApprove,
  onChanged,
}: {
  voucher: FeeVoucherDetail;
  canCreate: boolean;
  canApprove: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mode, setMode] = useState<"payment" | "void" | null>(null);

  const run = async (
    path: string,
    body: Record<string, unknown> | undefined,
    message: string,
    andThen?: () => void
  ) => {
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      await apiFetch(path, { method: "POST", body });
      setMode(null);
      setDone(message);
      onChanged();
      andThen?.();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const hasBalance = Number(voucher.balance) > 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Actions</h2>
          <p className="mt-0.5 text-xs text-muted">
            Record receipts, apply a late fee or void the voucher.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && hasBalance ? (
            <Button type="button" onClick={() => setMode("payment")}>
              Record payment
            </Button>
          ) : null}
          {canApprove && !voucher.late_fee_applied_at ? (
            <Button
              variant="secondary"
              type="button"
              loading={busy}
              onClick={() =>
                void run(
                  `/v1/fee-vouchers/${voucher.id}/late-fee`,
                  undefined,
                  "Late fee applied."
                )
              }
            >
              Apply late fee
            </Button>
          ) : null}
          {canApprove ? (
            <Button
              variant="danger"
              type="button"
              onClick={() => setMode("void")}
            >
              Void voucher
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
          voucher={voucher}
          busy={busy}
          onCancel={() => setMode(null)}
          onSubmit={(payload) =>
            run(
              "/v1/fee-payments",
              payload,
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
            run(
              `/v1/fee-vouchers/${voucher.id}/void`,
              { memo: memo || undefined },
              "Voucher voided."
            )
          }
        />
      ) : null}
    </Card>
  );
}

function PaymentForm({
  voucher,
  busy,
  onCancel,
  onSubmit,
}: {
  voucher: FeeVoucherDetail;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [amount, setAmount] = useState(voucher.balance);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="mt-5 grid gap-4 border-t border-border-secondary pt-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Amount"
        htmlFor="payment_amount"
        required
        hint={`Balance ${formatCurrency(voucher.balance)}`}
      >
        <TextInput
          id="payment_amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field label="Payment date" htmlFor="payment_date" required>
        <TextInput
          id="payment_date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>
      <Field label="Method" htmlFor="payment_method" required>
        <Select
          id="payment_method"
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
      <Field label="Reference" htmlFor="payment_reference">
        <TextInput
          id="payment_reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
      </Field>
      <Field
        label="Notes"
        htmlFor="payment_notes"
        className="sm:col-span-2"
      >
        <TextArea
          id="payment_notes"
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
              student_id: voucher.student_id,
              fee_voucher_id: voucher.id,
              payment_date: date,
              amount: Number(amount),
              method,
              ...(reference ? { reference } : {}),
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
      <Field label="Reason (optional)" htmlFor="void_memo">
        <TextArea
          id="void_memo"
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
